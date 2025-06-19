import React from 'react';
import { usePWA } from '../hooks/usePWA';

interface PWAInstallBannerProps {
  className?: string;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ className = '' }) => {
  const { showInstallPrompt, installPWA, dismissInstallPrompt, isInstalled, isPWAEnabled } = usePWA();

  console.log('🎨 PWA Banner - Render state:', {
    showInstallPrompt,
    isInstalled,
    isPWAEnabled,
    shouldShow: showInstallPrompt && !isInstalled
  });

  // Development mode: Show banner even if beforeinstallprompt hasn't fired
  const isDevelopment = import.meta.env.DEV;
  
  // TEMPORARY: Force show banner for testing (remove this later)
  const forceShowForTesting = true;
  
  const shouldShowBanner = (showInstallPrompt || isDevelopment || forceShowForTesting) && !isInstalled && isPWAEnabled;

  console.log('🎨 PWA Banner - Development check:', {
    isDevelopment,
    showInstallPrompt,
    isInstalled,
    isPWAEnabled,
    shouldShowBanner,
    finalDecision: shouldShowBanner,
    'import.meta.env.DEV': import.meta.env.DEV,
    'import.meta.env.MODE': import.meta.env.MODE
  });

  // Don't show banner if PWA is already installed or not enabled
  if (!shouldShowBanner) {
    console.log('🚫 PWA Banner - Not showing banner:', { 
      showInstallPrompt, 
      isInstalled, 
      isPWAEnabled,
      isDevelopment,
      shouldShowBanner
    });
    return null;
  }

  console.log('✅ PWA Banner - Showing banner (dev mode or install prompt available)');

  // Detect user's platform for specific instructions
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);

  const getInstallInstructions = () => {
    if (isIOS) {
      return `📱 Install on iOS:\n\n1. Tap the Share button (⬆️) in Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to install\n\nNote: PWA installation only works in Safari on iOS.`;
    } else if (isAndroid && isChrome) {
      return `📱 Install on Android:\n\n1. Look for the install icon (⬇️) in the address bar\n2. Tap "Install" or "Add to Home Screen"\n3. Follow the prompts\n\nOr:\n1. Tap the menu (⋮) in Chrome\n2. Select "Add to Home Screen"\n3. Tap "Install"`;
    } else if (isChrome) {
      return `💻 Install on Desktop:\n\n1. Look for the install icon (⬇️) in the address bar\n2. Click "Install Lumino Learning"\n3. Follow the prompts\n\nOr:\n1. Click the menu (⋮) in Chrome\n2. Select "Install Lumino Learning..."\n3. Click "Install"`;
    } else {
      return `📱 Install Instructions:\n\nFor the best experience, please use:\n• Chrome on Android/Desktop\n• Safari on iOS\n\nThen look for install options in your browser menu or address bar.`;
    }
  };

  // Manual installation instructions for when automatic prompt fails
  const showManualInstructions = () => {
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isChrome) {
      instructions = 'Chrome: Look for the install icon (⊕) in the address bar, or go to Menu → Install Lumino Learning';
    } else if (isSafari) {
      instructions = 'Safari: Tap the Share button (□↑) and select "Add to Home Screen"';
    } else if (isFirefox) {
      instructions = 'Firefox: Look for the install icon in the address bar, or go to Menu → Install';
    } else {
      instructions = 'Look for an install option in your browser menu or address bar';
    }
    
    alert(`Manual Installation:\n\n${instructions}\n\nNote: If the install option doesn't appear, try:\n1. Clear your browser cache\n2. Refresh the page\n3. Interact with the page (click/scroll)\n4. Wait 30+ seconds`);
  };

  // Enhanced install handler
  const handleInstall = async () => {
    const success = await installPWA();
    if (!success) {
      // If automatic installation failed, show manual instructions
      console.log('🔧 PWA Banner - Automatic install failed, showing manual instructions');
      showManualInstructions();
    }
  };

  return (
    <div className={`pwa-install-banner ${className}`} style={{
      background: 'linear-gradient(135deg, #4299E1 0%, #3182CE 100%)',
      color: 'white',
      borderRadius: '12px',
      margin: '16px 0',
      boxShadow: '0 4px 12px rgba(66, 153, 225, 0.3)',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 20px',
        gap: '16px'
      }}>
        <div style={{ fontSize: '2rem', flexShrink: 0 }}>
          📱
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 600 }}>
            Install Lumino Learning
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9, lineHeight: 1.4 }}>
            Get the app experience! Install Lumino Learning for faster access to your assignments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <button 
            onClick={handleInstall}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {showInstallPrompt ? 'Install App' : 'How to Install'}
          </button>
          {isDevelopment && (
            <button 
              onClick={() => {
                console.log('🔧 PWA Test - Manual check triggered');
                window.location.reload();
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
              title="Reload page to check for install prompt"
            >
              🔄 Test
            </button>
          )}
          <button 
            onClick={() => {
              console.log('🔧 PWA Debug - Note: Real beforeinstallprompt events are triggered by Chrome automatically');
              // Real events cannot be manually triggered - they depend on Chrome's internal heuristics
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
            title="Test PWA installation criteria"
          >
            🧪 Debug
          </button>
          <button 
            onClick={dismissInstallPrompt}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              opacity: 0.7,
              transition: 'opacity 0.2s ease'
            }}
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* Status indicator */}
      <div style={{
        fontSize: '0.8rem',
        opacity: 0.8,
        textAlign: 'center',
        padding: '8px 16px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        {showInstallPrompt ? (
          '✅ Ready to install - Click "Install App" above'
        ) : isDevelopment ? (
          '🔧 Dev Mode: PWA install prompts may not appear until production build'
        ) : (
          `📱 ${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop'}: Click "How to Install" for instructions`
        )}
      </div>
    </div>
  );
}; 