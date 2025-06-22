import { useEffect, useRef } from 'react';

interface SinglePWAWindowOptions {
  enabled?: boolean;
  studentEmail?: string;
  source?: string;
  onDuplicateDetected?: (action: 'focused_existing' | 'closed_duplicates' | 'no_action') => void;
}

export function useSinglePWAWindow(options: SinglePWAWindowOptions = {}) {
  const {
    enabled = true,
    studentEmail,
    source = 'pwa_launch',
    onDuplicateDetected
  } = options;

  const processedRef = useRef(false);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);

  useEffect(() => {
    // Only run once per component mount and if enabled
    if (!enabled || processedRef.current) {
      return;
    }

    // Check if we're in a PWA context, but respect forceBrowser parameter
    const urlParams = new URLSearchParams(window.location.search);
    const forceBrowser = urlParams.has('forceBrowser') && urlParams.get('forceBrowser') === 'true';
    
    // CRITICAL: If forceBrowser is true, this is explicitly NOT a PWA context
    if (forceBrowser) {
  
      return;
    }
    
    const isPWAContext = (
      window.location.pathname.includes('/student') || 
      window.location.pathname.includes('/play') || 
      window.location.pathname.includes('/teacher') ||
      window.location.pathname.includes('/email-link') ||
      window.location.pathname.includes('/login') ||
      urlParams.has('pwa') ||
      urlParams.has('emailAccess') ||
      urlParams.has('studentEmail')
    );



    if (!isPWAContext) {
      return;
    }

    // Check if service worker is available
    if (!('serviceWorker' in navigator)) {
      return;
    }

    processedRef.current = true;

    const enforceSignlePWA = async () => {
      try {
        console.log('[useSinglePWAWindow] 🎯 Enforcing single PWA window');

        // Set up message listener for service worker responses
        const handleServiceWorkerMessage = (event: MessageEvent) => {
          if (event.data?.type === 'CLOSE_DUPLICATE_PWA') {
            console.log('[useSinglePWAWindow] 📨 Received close duplicate response:', event.data);

            if (event.data.success) {
              // Existing PWA was focused OR fallback strategy applied
              const reason = event.data.reason;
              onDuplicateDetected?.('focused_existing');
              
              if (reason === 'existing_pwa_focused') {
                console.log('[useSinglePWAWindow] ✅ Existing PWA successfully focused, closing this window');
              } else if (reason === 'focus_blocked_fallback_close_new') {
                console.log('[useSinglePWAWindow] 🔒 Focus blocked by browser security, closing new window per fallback strategy');
              } else if (reason === 'focus_failed_prefer_existing') {
                console.log('[useSinglePWAWindow] ✅ Focus failed but preferring existing PWA, closing this window');
              } else {
                console.log('[useSinglePWAWindow] ✅ Closing this window, reason:', reason);
              }
              
              // Small delay to ensure message processing
              setTimeout(() => {
                try {
                  window.close();
                } catch (closeError) {
                  console.log('[useSinglePWAWindow] ❌ Could not close window:', closeError);
                  // Window might be user-launched and cannot be closed programmatically
                  // This is expected behavior in some browser security contexts
                }
              }, 500);

            } else {
              // No existing PWA or other error, this window can stay
              const reason = event.data.reason;
              console.log('[useSinglePWAWindow] ✅ This window can stay, reason:', reason);
              
              if (reason === 'no_existing_pwa') {
                onDuplicateDetected?.('no_action');
              } else if (reason === 'focus_failed_other_error') {
                onDuplicateDetected?.('no_action');
              } else {
                onDuplicateDetected?.('no_action');
              }
            }

            // Clean up listener
            navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
            messageHandlerRef.current = null;
          }
        };

        // Store reference for cleanup
        messageHandlerRef.current = handleServiceWorkerMessage;
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

        // Send message to service worker to enforce single PWA
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
          registration.active.postMessage({
            type: 'ENFORCE_SINGLE_PWA',
            currentUrl: window.location.href,
            studentEmail: studentEmail,
            source: source,
            timestamp: Date.now()
          });
        }

        // Timeout safety net
        setTimeout(() => {
          if (messageHandlerRef.current) {
            console.log('[useSinglePWAWindow] ⏰ Timeout reached, removing listener');
            navigator.serviceWorker.removeEventListener('message', messageHandlerRef.current);
            messageHandlerRef.current = null;
          }
        }, 5000);

      } catch (error) {
        console.error('[useSinglePWAWindow] ❌ Error enforcing single PWA:', error);
      }
    };

    // Small delay to ensure page is ready
    const timeoutId = setTimeout(enforceSignlePWA, 100);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (messageHandlerRef.current) {
        navigator.serviceWorker.removeEventListener('message', messageHandlerRef.current);
        messageHandlerRef.current = null;
      }
    };
  }, [enabled, studentEmail, source, onDuplicateDetected]);

  // Handle PWA activity notifications and client alive pings
  useEffect(() => {
    if (!enabled) return;

    const handleServiceWorkerMessages = (event: MessageEvent) => {
      if (event.data?.type === 'PWA_ACTIVITY_NOTIFICATION') {
        console.log('[useSinglePWAWindow] 📨 Received PWA activity notification:', event.data);
        
        // Could trigger UI updates here (like showing "New assignment available" notification)
        // This is where you'd handle updating the Student Dashboard if needed
      } else if (event.data?.type === 'CLIENT_ALIVE_PING') {
        // CRITICAL: Respond to service worker ping to prove this window is alive
        console.log('[useSinglePWAWindow] 🏓 Responding to client alive ping');
        
        // Send response back to service worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CLIENT_ALIVE_RESPONSE',
            clientId: event.data.clientId,
            timestamp: Date.now()
          });
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessages);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessages);
    };
  }, [enabled]);

  return {
    // Could expose utilities here if needed
    isProcessed: processedRef.current
  };
} 