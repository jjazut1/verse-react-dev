import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const usePWANavigation = () => {
    const navigate = useNavigate();

    const handleNavigationMessage = useCallback((event: MessageEvent) => {
        console.log('[PWA] Received message:', event.data);
        
        if (event.data?.type === 'NAVIGATE_TO_ASSIGNMENT') {
            const { url, token, timestamp, from } = event.data;
            
            console.log('[PWA] ✅ Processing NAVIGATE_TO_ASSIGNMENT request', {
                url,
                token,
                timestamp,
                from,
                currentLocation: window.location.href
            });

            // Focus this window first
            console.log('[PWA] Attempting to focus window');
            try {
                window.focus();
                console.log('[PWA] ✅ Window focus completed');
                
                // Bring PWA to front if possible
                if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                    navigator.serviceWorker.ready.then(registration => {
                        if (registration.active) {
                            registration.active.postMessage({
                                type: 'FOCUS_WINDOW'
                            });
                            console.log('[PWA] Sent FOCUS_WINDOW message to service worker');
                        }
                    });
                }
            } catch (e) {
                console.warn('[PWA] Could not focus PWA window:', e);
            }

            // Send acknowledgment back to launcher via service worker (primary method)
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                console.log('[PWA] Sending ACK back to launcher via service worker');
                navigator.serviceWorker.controller.postMessage({
                    type: 'NAVIGATE_TO_ASSIGNMENT_ACK',
                    success: true,
                    timestamp: Date.now(),
                    originalTimestamp: timestamp
                });
            }

            // Send acknowledgment back to launcher via BroadcastChannel (fallback)
            console.log('[PWA] Sending BroadcastChannel ACK');
            const channel = new BroadcastChannel('luminatelearn-pwa-navigation');
            channel.postMessage({
                type: 'PWA_NAVIGATION_ACK',
                timestamp: Date.now(),
                originalTimestamp: timestamp
            });
            channel.close();

            // Navigation is handled by usePWAMessageAck hook using window.location.href for full reload
            console.log('[PWA] 🎯 Navigation will be handled by usePWAMessageAck hook for full page reload');
        }
    }, [navigate]);

    useEffect(() => {
        // Listen for service worker messages (primary method)
        const handleServiceWorkerMessage = (event: MessageEvent) => {
            console.log('[PWA] Received service worker message:', event.data);
            
            if (event.data?.type === 'NAVIGATE_TO_ASSIGNMENT') {
                const { url, token, timestamp, from } = event.data;
                console.log('[PWA] ✅ Processing service worker navigation request', { url, token, timestamp, from });
                
                // Handle navigation immediately
                handleNavigationMessage(event);
            } else {
                console.log('[PWA] Ignoring non-navigation service worker message');
            }
        };

        // Listen for navigation messages via BroadcastChannel (fallback method)
        const channel = new BroadcastChannel('luminatelearn-pwa-navigation');
        channel.onmessage = handleNavigationMessage;

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        }

        console.log('[PWA] 🎧 Listening for assignment navigation messages via service worker and BroadcastChannel');

        return () => {
            channel.close();
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
            }
        };
    }, [handleNavigationMessage]);

    return null; // This hook doesn't render anything
}; 