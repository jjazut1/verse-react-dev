import { useEffect } from 'react';

export function usePWAMessageAck() {
  useEffect(() => {
    console.log('[PWA-ACK] 🚀 Initializing PWA message ACK handler');
    
    if (!navigator?.serviceWorker?.controller) {
      console.log('[PWA-ACK] ❌ No service worker controller available');
      return;
    }

    console.log('[PWA-ACK] ✅ Service worker controller available, setting up listener');

    const handler = (event: MessageEvent) => {
      console.log('[PWA-ACK] 📨 Received service worker message:', event.data);
      
      if (event.data?.type === 'NAVIGATE_TO_ASSIGNMENT') {
        console.log('[PWA-ACK] 🎯 Processing NAVIGATE_TO_ASSIGNMENT message');
        
        const targetUrl = event.data.url;
        console.log('[PWA-ACK] Target URL:', targetUrl);
        console.log('[PWA-ACK] Current URL:', window.location.href);

        // Navigate if needed - force reload even if URL is the same to ensure fresh assignment load
        if (targetUrl) {
          console.log('[PWA-ACK] 🚀 Forcing navigation to target URL (fresh assignment load)');
          window.location.href = targetUrl;
        } else {
          console.log('[PWA-ACK] ❌ No target URL provided');
        }

        // ✅ Send the critical ACK message!
        console.log('[PWA-ACK] 📤 Sending NAVIGATE_TO_ASSIGNMENT_ACK to service worker');
        navigator.serviceWorker.controller?.postMessage({
          type: 'NAVIGATE_TO_ASSIGNMENT_ACK',
          success: true,
          timestamp: Date.now()
        });

        console.log('[PWA-ACK] ✅ NAVIGATE_TO_ASSIGNMENT_ACK sent successfully');
      } else {
        console.log('[PWA-ACK] 🔇 Ignoring non-navigation message');
      }
    };

    console.log('[PWA-ACK] 🎧 Adding service worker message listener');
    navigator.serviceWorker.addEventListener('message', handler);
    
    return () => {
      console.log('[PWA-ACK] 🔇 Removing service worker message listener');
      navigator.serviceWorker.removeEventListener('message', handler);
    };
  }, []);
} 