// sw-custom.js (Service Worker)
// Version: 2025-01-15-15:00 - Improves standalone device icon PWA close detection

let launcherSource = null;

self.addEventListener('message', async (event) => {
  // Filter out common browser/Workbox internal messages to reduce noise
  const isInternalMessage = !event.data || 
                           !event.data.type || 
                           typeof event.data === 'string' ||
                           event.data.type === undefined;
                           
  if (!isInternalMessage) {
  console.log('[SW] Received message:', event.data);
  }

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

  // Handle assignment notifications
  if (event.data?.type === 'NEW_ASSIGNMENT_NOTIFICATION') {
    // Just acknowledge - this is used for notification purposes
    console.log('[SW] 📧 New assignment notification received:', event.data.studentEmail);
    return;
  }

  // Handle client alive responses (from PWA window management)
  if (event.data?.type === 'CLIENT_ALIVE_RESPONSE') {
    // These are handled by the testClientAlive promise resolution
    return;
  }

  if (!event.data || event.data.type !== 'FOCUS_EXISTING_PWA') {
    // Silently ignore messages without proper type or internal browser messages
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

// NEW: Test if a client window is actually alive and responsive
async function testClientAlive(client) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false); // Client didn't respond in time, consider it dead
    }, 1000); // 1 second timeout

    // Listen for response
    const handleMessage = (event) => {
      if (event.data?.type === 'CLIENT_ALIVE_RESPONSE' && event.data.clientId === client.id) {
        clearTimeout(timeout);
        self.removeEventListener('message', handleMessage);
        resolve(true); // Client responded, it's alive
      }
    };

    self.addEventListener('message', handleMessage);

    // Send ping to client
    try {
      client.postMessage({
        type: 'CLIENT_ALIVE_PING',
        clientId: client.id,
        timestamp: Date.now()
      });
    } catch (error) {
      clearTimeout(timeout);
      self.removeEventListener('message', handleMessage);
      resolve(false); // Failed to send message, client is dead
    }
  });
}

// ENHANCED: Handle single PWA window enforcement with robust fallback
async function handleEnforceSinglePWA(data, requestingClient) {
  const { currentUrl, studentEmail, source = 'pwa_launch' } = data;
  
  try {
    console.log('[SW] 🎯 Enforcing single PWA window (focus-first with fallback)');
    console.log('[SW] 📍 Current window URL:', currentUrl);
    
    const allClients = await self.clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    });
    
    // Find existing PWA windows (excluding the requesting client)
    const existingPWAClients = [];
    
    for (const client of allClients) {
      try {
        if (client.id === requestingClient.id) continue; // Skip requesting client
        
        const clientUrl = new URL(client.url);
        const isStudentDashboard = clientUrl.pathname.includes('/student');
        const isGameWindow = clientUrl.pathname.includes('/play');
        const isTeacherDashboard = clientUrl.pathname.includes('/teacher');
        const isPWAContext = isStudentDashboard || isGameWindow || isTeacherDashboard;
        
        // Additional check: must be in PWA mode (standalone or with pwa=true)
        const isPWAMode = clientUrl.searchParams.has('pwa') || 
                         clientUrl.searchParams.has('emailAccess') ||
                         isStudentDashboard || isGameWindow || isTeacherDashboard;
        
        if (isPWAContext && isPWAMode) {
          // ENHANCED: Test if client is actually responsive/alive
          try {
            // Send a ping message and wait for response to verify window is actually alive
            const isAlive = await testClientAlive(client);
            if (isAlive) {
              existingPWAClients.push(client);
              console.log('[SW] ✅ Found alive PWA client:', clientUrl.pathname);
            } else {
              console.log('[SW] 💀 Found dead PWA client (will ignore):', clientUrl.pathname);
            }
          } catch (testError) {
            console.log('[SW] ❌ Client alive test failed:', testError.message);
            // If test fails, don't include this client
          }
        }
      } catch (error) {
        console.error('[SW] ❌ Error checking client:', error);
      }
    }
    
    console.log(`[SW] 🔍 Found ${existingPWAClients.length} existing PWA windows`);
    
    if (existingPWAClients.length > 0) {
      // FOCUS-FIRST: Attempt to focus the most relevant existing PWA window
      const studentDashboard = existingPWAClients.find(client => 
        new URL(client.url).pathname.includes('/student')
      );
      const targetClient = studentDashboard || existingPWAClients[0];
      
      console.log('[SW] 🎯 FOCUS-FIRST: Attempting to focus existing PWA window:', new URL(targetClient.url).pathname);
      
      let focusSucceeded = false;
      
      try {
        await targetClient.focus();
        focusSucceeded = true;
        
        console.log('[SW] ✅ Successfully focused existing PWA window');
        
        // Notify the existing PWA about new activity
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
        console.log('[SW] ⚠️ Focus failed with error:', focusError.name, focusError.message);
        
        // ENHANCED FALLBACK LOGIC for browser security restrictions
        if (focusError.name === 'InvalidAccessError' || focusError.message.includes('Not allowed to focus')) {
          console.log('[SW] 🔒 Browser security blocked focus attempt - applying fallback strategy');
          
          // Strategy: Tell existing windows to check if they can close themselves
          // This respects the browser security model where only the window itself can decide to close
          for (const client of existingPWAClients) {
            try {
              client.postMessage({
                type: 'FORCE_CLOSE_LAUNCHER',
                reason: 'focus_blocked_by_security',
                canAutoClose: true, // Hint that auto-close is acceptable
                newWindowInfo: {
                  url: currentUrl,
                  source: source,
                  studentEmail: studentEmail
                },
                timestamp: Date.now()
              });
            } catch (messageError) {
              console.error('[SW] ❌ Error sending close message to existing window:', messageError);
            }
          }
          
          // Tell the new window to close itself (it was opened by link click, so it can close)
          requestingClient.postMessage({
            type: 'CLOSE_DUPLICATE_PWA',
            success: true,
            focusedWindow: new URL(targetClient.url).pathname,
            reason: 'focus_blocked_fallback_close_new',
            timestamp: Date.now()
          });
          
          console.log('[SW] 🎯 Fallback complete - new window instructed to close, existing notified');
          
        } else {
          // Other focus error - treat as general failure
          console.log('[SW] ❌ Focus failed with non-security error - keeping new window');
          
          requestingClient.postMessage({
            type: 'CLOSE_DUPLICATE_PWA',
            success: false,
            reason: 'focus_failed_other_error',
            error: focusError.message,
            timestamp: Date.now()
          });
        }
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
    
    // Find PWA windows (student dashboard or game windows) - with alive testing
    const pwaClients = [];
    
    for (const client of allClients) {
      try {
        if (client.id === requestingClient.id) continue; // Skip requesting client
        
        const clientUrl = new URL(client.url);
        const isStudentDashboard = clientUrl.pathname.includes('/student');
        const isGameWindow = clientUrl.pathname.includes('/play');
        const isPWAContext = isStudentDashboard || isGameWindow;
        
        if (isPWAContext) {
          // Test if client is actually alive before including it
          try {
            const isAlive = await testClientAlive(client);
            if (isAlive) {
              pwaClients.push(client);
              console.log('[SW] ✅ Found alive PWA client for email link:', clientUrl.pathname);
            } else {
              console.log('[SW] 💀 Found dead PWA client for email link (ignoring):', clientUrl.pathname);
            }
          } catch (testError) {
            console.log('[SW] ❌ Email link client alive test failed:', testError.message);
          }
        }
      } catch (error) {
        console.error('[SW] ❌ Error checking email link client:', error);
      }
    }
    
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