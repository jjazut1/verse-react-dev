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
    if (!enabled || processedRef.current) return;

    // Check if we're in a PWA context
    const isPWAContext = window.location.pathname.includes('/student') || 
                        window.location.pathname.includes('/play') || 
                        window.location.pathname.includes('/teacher') ||
                        new URLSearchParams(window.location.search).has('pwa') ||
                        new URLSearchParams(window.location.search).has('emailAccess');

    if (!isPWAContext) {
      console.log('[useSinglePWAWindow] Not in PWA context, skipping enforcement');
      return;
    }

    // Check if service worker is available
    if (!('serviceWorker' in navigator)) {
      console.log('[useSinglePWAWindow] Service Worker not available');
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
              // Existing PWA was focused, we should close this window
              onDuplicateDetected?.('focused_existing');
              
              console.log('[useSinglePWAWindow] ✅ Existing PWA focused, closing this window');
              
              // Small delay to ensure message processing
              setTimeout(() => {
                window.close();
              }, 500);

            } else {
              // No existing PWA or focus failed, this window can stay
              const reason = event.data.reason;
              console.log('[useSinglePWAWindow] ✅ This window can stay, reason:', reason);
              
              if (reason === 'focus_failed_keeping_new') {
                onDuplicateDetected?.('closed_duplicates');
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

  // Handle PWA activity notifications (when existing PWA receives focus)
  useEffect(() => {
    if (!enabled) return;

    const handlePWAActivityNotification = (event: MessageEvent) => {
      if (event.data?.type === 'PWA_ACTIVITY_NOTIFICATION') {
        console.log('[useSinglePWAWindow] 📨 Received PWA activity notification:', event.data);
        
        // Could trigger UI updates here (like showing "New assignment available" notification)
        // This is where you'd handle updating the Student Dashboard if needed
      }
    };

    navigator.serviceWorker?.addEventListener('message', handlePWAActivityNotification);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handlePWAActivityNotification);
    };
  }, [enabled]);

  return {
    // Could expose utilities here if needed
    isProcessed: processedRef.current
  };
} 