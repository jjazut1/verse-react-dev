// sw-custom.js (Service Worker)
// Version: 2025-01-15-15:00 - Improves standalone device icon PWA close detection

let launcherSource = null;

self.addEventListener('message', async (event) => {
  console.log('[SW] Received message:', event.data);

  if (event.data?.type === 'NAVIGATE_TO_ASSIGNMENT_ACK') {
    if (launcherSource) {
      launcherSource.postMessage({
        type: 'NAVIGATE_TO_ASSIGNMENT_ACK',
        success: event.data.success,
        timestamp: event.data.timestamp,
        originalTimestamp: event.data.originalTimestamp,
      });
      launcherSource = null;
    }
    return;
  }

  if (event.data?.type === 'CLOSE_EXISTING_ASSIGNMENT_WINDOWS') {
    await handleCloseExistingAssignmentWindows(event.data, event.source);
    return;
  }

  // NEW: Handle PWA window checking for email links
  if (event.data?.type === 'CHECK_PWA_WINDOWS') {
    await handleCheckPWAWindows(event.data, event.source);
    return;
  }

  // NEW: Handle single PWA window enforcement (focus-first)
  if (event.data?.type === 'ENFORCE_SINGLE_PWA') {
    await handleEnforceSinglePWA(event.data, event.source);
    return;
  }

  if (!event.data || event.data.type !== 'FOCUS_EXISTING_PWA') {
    console.log('[SW] Ignoring message - not FOCUS_EXISTING_PWA type. Received:', event.data?.type || 'undefined');
    return;
  }

  launcherSource = event.source;
  const { url, token } = event.data;

  try {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of clientsList) {
      const clientUrl = new URL(client.url);
      const targetUrl = new URL(url);
      const pwaType = clientUrl.searchParams.get('pwa_type');
      const isStandalone = clientUrl.pathname.includes('/play') || clientUrl.pathname.includes('/student') || pwaType === 'game';

      if (clientUrl.origin === targetUrl.origin && isStandalone) {
        client.postMessage({
          type: 'NAVIGATE_TO_ASSIGNMENT',
          url,
          token,
          timestamp: Date.now(),
          from: 'service-worker',
        });
        try {
          await client.focus();
        } catch {}
        return;
      }
    }

    if (launcherSource) {
      launcherSource.postMessage({
        type: 'NAVIGATE_TO_ASSIGNMENT_ACK',
        success: false,
        timestamp: Date.now(),
      });
      launcherSource = null;
    }
  } catch (error) {
    if (launcherSource) {
      launcherSource.postMessage({
        type: 'NAVIGATE_TO_ASSIGNMENT_ACK',
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });
      launcherSource = null;
    }
  }
});

// NEW: Handle single PWA window enforcement (focus-first approach)
async function handleEnforceSinglePWA(data, requestingClient) {
  const { currentUrl, studentEmail, source = 'pwa_launch' } = data;
  
  try {
    console.log('[SW] 🎯 Enforcing single PWA window (focus-first)');
    console.log('[SW] 📍 Current window URL:', currentUrl);
    
    const allClients = await self.clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    });
    
    // Find existing PWA windows (excluding the requesting client)
    const existingPWAClients = allClients.filter(client => {
      try {
        if (client.id === requestingClient.id) return false; // Skip requesting client
        
        const clientUrl = new URL(client.url);
        const isStudentDashboard = clientUrl.pathname.includes('/student');
        const isGameWindow = clientUrl.pathname.includes('/play');
        const isTeacherDashboard = clientUrl.pathname.includes('/teacher');
        const isPWAContext = isStudentDashboard || isGameWindow || isTeacherDashboard;
        
        // Additional check: must be in PWA mode (standalone or with pwa=true)
        const isPWAMode = clientUrl.searchParams.has('pwa') || 
                         clientUrl.searchParams.has('emailAccess') ||
                         isStudentDashboard || isGameWindow || isTeacherDashboard;
        
        return isPWAContext && isPWAMode;
      } catch (error) {
        return false;
      }
    });
    
    console.log(`[SW] 🔍 Found ${existingPWAClients.length} existing PWA windows`);
    
    if (existingPWAClients.length > 0) {
      // FOCUS-FIRST: Focus the most relevant existing PWA window
      const studentDashboard = existingPWAClients.find(client => 
        new URL(client.url).pathname.includes('/student')
      );
      const targetClient = studentDashboard || existingPWAClients[0];
      
      console.log('[SW] ✅ FOCUS-FIRST: Focusing existing PWA window:', new URL(targetClient.url).pathname);
      
      try {
        await targetClient.focus();
        
        // Notify the existing PWA about new activity (if needed)
        targetClient.postMessage({
          type: 'PWA_ACTIVITY_NOTIFICATION',
          source: source,
          studentEmail: studentEmail,
          timestamp: Date.now()
        });
        
        // Tell the requesting window to close itself (since we focused existing)
        requestingClient.postMessage({
          type: 'CLOSE_DUPLICATE_PWA',
          success: true,
          focusedWindow: new URL(targetClient.url).pathname,
          reason: 'existing_pwa_focused',
          timestamp: Date.now()
        });
        
        console.log('[SW] 🎯 Single PWA enforcement complete - existing window focused');
        
      } catch (focusError) {
        console.error('[SW] ❌ Error focusing existing PWA window:', focusError);
        
        // Focus failed, close existing windows and keep new one
        console.log('[SW] 🔄 Focus failed, closing existing PWA windows instead');
        for (const client of existingPWAClients) {
          try {
            await client.postMessage({
              type: 'FORCE_CLOSE_LAUNCHER',
              reason: 'focus_failed_close_duplicate',
              timestamp: Date.now()
            });
          } catch (error) {
            console.error('[SW] ❌ Error closing PWA window:', error);
          }
        }
        
        // Tell requesting window it can stay
        requestingClient.postMessage({
          type: 'CLOSE_DUPLICATE_PWA',
          success: false,
          reason: 'focus_failed_keeping_new',
          timestamp: Date.now()
        });
      }
      
    } else {
      console.log('[SW] ✅ No existing PWA windows found - new window can proceed');
      
      // No existing PWA windows, new window can stay
      requestingClient.postMessage({
        type: 'CLOSE_DUPLICATE_PWA',
        success: false,
        reason: 'no_existing_pwa',
        timestamp: Date.now()
      });
    }
    
  } catch (error) {
    console.error('[SW] ❌ Error enforcing single PWA:', error);
    
    requestingClient.postMessage({
      type: 'CLOSE_DUPLICATE_PWA',
      success: false,
      reason: 'error',
      error: error.message,
      timestamp: Date.now()
    });
  }
}

// NEW: Handle PWA window checking for email links
async function handleCheckPWAWindows(data, requestingClient) {
  const { studentEmail, source = 'email' } = data;
  
  try {
    console.log('[SW] 🔍 Checking for existing PWA windows for student:', studentEmail);
    
    const allClients = await self.clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    });
    
    // Find PWA windows (student dashboard or game windows)
    const pwaClients = allClients.filter(client => {
      try {
        const clientUrl = new URL(client.url);
        const isStudentDashboard = clientUrl.pathname.includes('/student');
        const isGameWindow = clientUrl.pathname.includes('/play');
        const isPWAContext = isStudentDashboard || isGameWindow;
        const isNotRequestingClient = client.id !== requestingClient.id;
        
        return isPWAContext && isNotRequestingClient;
      } catch (error) {
        return false;
      }
    });
    
    console.log(`[SW] 📱 Found ${pwaClients.length} existing PWA windows`);
    
    if (pwaClients.length > 0) {
      // Focus the first PWA window (prefer student dashboard over game)
      const studentDashboard = pwaClients.find(client => 
        new URL(client.url).pathname.includes('/student')
      );
      const targetClient = studentDashboard || pwaClients[0];
      
      console.log('[SW] ✅ Focusing existing PWA window:', new URL(targetClient.url).pathname);
      
      try {
        await targetClient.focus();
        
        // Notify the PWA about new assignment availability
        targetClient.postMessage({
          type: 'ASSIGNMENT_NOTIFICATION',
          source: source,
          studentEmail: studentEmail,
          timestamp: Date.now()
        });
        
        // Tell the requesting window that PWA was focused
        requestingClient.postMessage({
          type: 'PWA_WINDOW_FOCUSED',
          success: true,
          focusedWindow: new URL(targetClient.url).pathname,
          timestamp: Date.now()
        });
        
      } catch (focusError) {
        console.error('[SW] ❌ Error focusing PWA window:', focusError);
        
        // Focus failed, treat as no PWA available
        requestingClient.postMessage({
          type: 'PWA_WINDOW_FOCUSED',
          success: false,
          reason: 'focus_failed',
          timestamp: Date.now()
        });
      }
      
    } else {
      console.log('[SW] ❌ No existing PWA windows found');
      
      // No PWA windows found
      requestingClient.postMessage({
        type: 'PWA_WINDOW_FOCUSED',
        success: false,
        reason: 'no_pwa_windows',
        timestamp: Date.now()
      });
    }
    
  } catch (error) {
    console.error('[SW] ❌ Error checking PWA windows:', error);
    
    requestingClient.postMessage({
      type: 'PWA_WINDOW_FOCUSED',
      success: false,
      reason: 'error',
      error: error.message,
      timestamp: Date.now()
    });
  }
}

async function handleCloseExistingAssignmentWindows(data, requestingClient) {
  const { token } = data;

  try {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    console.log(`[SW] 🔍 Checking ${allClients.length} windows for closure`);

    for (const client of allClients) {
      try {
        const clientUrl = new URL(client.url);
        const clientPwaType = clientUrl.searchParams.get('pwa_type');
        const isLauncherPath = clientUrl.pathname.includes('launch.html');
        const isGamePath = clientUrl.pathname.includes('/play');
        const isStudentPath = clientUrl.pathname.includes('/student');
        const isTeacherPath = clientUrl.pathname.includes('/teacher');
        const isRequester = requestingClient?.id === client.id;

        console.log(`[SW] 📋 Window: ${clientUrl.pathname}, pwa_type: ${clientPwaType}, isRequester: ${isRequester}`);

        // Close existing PWA windows (but not the requesting window)
        // This includes launcher windows, student dashboard, teacher dashboard, and existing game windows
        if (!isRequester && (
          clientPwaType === 'launcher' || 
          isLauncherPath ||
          isStudentPath ||
          isTeacherPath ||
          isGamePath
        )) {
          console.log(`[SW] 🚀 Closing PWA window: ${clientUrl.href}`);
          await client.postMessage({
            type: 'FORCE_CLOSE_LAUNCHER',
            reason: 'new_assignment_opened',
            windowType: isStudentPath ? 'student' : isTeacherPath ? 'teacher' : isGamePath ? 'game' : 'launcher'
          });
        } else {
          console.log(`[SW] ✅ Keeping window: ${clientUrl.href} (${isRequester ? 'requester' : 'non-PWA'})`);
        }
      } catch (error) {
        console.error('[SW] ❌ Error processing window:', error);
      }
    }
  } catch (error) {
    console.error('[SW] ❌ Error in PWA window management:', error);
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
}); 