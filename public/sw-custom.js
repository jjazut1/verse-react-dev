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