import { useState, useEffect } from "react";
import { useAuth } from '../contexts/AuthContext';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  showInstallPrompt: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

export const usePWA = () => {
  const { currentUser, isStudent } = useAuth();
  const [pwaState, setPwaState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    showInstallPrompt: false,
    installPrompt: null
  });

  // State for brief install prompt (for pwa=auto simplified single-link system)
  const [showBriefInstallPrompt, setShowBriefInstallPrompt] = useState(false);

  // IMMEDIATE URL parameter detection - runs before any other PWA logic
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const forceBrowser = urlParams.get('forceBrowser') === 'true';
    const pwaParam = urlParams.get('pwa');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    console.log('🔧 PWA Hook - Immediate URL parameter check:', {
      forceBrowser,
      pwaParam,
      isStandalone,
      currentUrl: window.location.href
    });
    
    // Handle pwa=auto parameter (simplified single-link system)
    if (pwaParam === 'auto') {
      console.log('🎯 PWA Hook - pwa=auto detected, smart routing enabled');
      // Clean the parameter to prevent URL pollution
      urlParams.delete('pwa');
      const cleanUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
      window.history.replaceState({}, '', cleanUrl);
      
      // If we're already in PWA mode, stay here
      if (isStandalone) {
        console.log('✅ PWA Hook - Already in PWA mode, continuing');
        return;
      }
      
      // If not in PWA mode, show brief install prompt if installable, then continue in browser
      console.log('🌐 PWA Hook - In browser mode, will show brief install prompt if available');
      
      // Check if installable and show brief prompt
      setTimeout(() => {
        if (pwaState.isInstallable && !pwaState.isInstalled) {
          console.log('📱 PWA Hook - Showing brief install prompt for pwa=auto');
          setShowBriefInstallPrompt(true);
          
          // Auto-dismiss after 3 seconds
          setTimeout(() => {
            setShowBriefInstallPrompt(false);
            console.log('📱 PWA Hook - Brief install prompt auto-dismissed');
          }, 3000);
        }
      }, 1000); // Small delay to allow PWA state to be determined
      
      return;
    }
    
    // If we're in standalone mode (PWA) but forceBrowser is requested
    if (isStandalone && forceBrowser) {
      console.log('🎯 PWA Hook - forceBrowser detected in standalone mode, redirecting to browser');
      console.log('🎯 PWA Hook - Browser URL will be:', window.location.href);
      
      // Create clean browser URL (remove forceBrowser to prevent loops)
      const url = new URL(window.location.href);
      url.searchParams.delete('forceBrowser');
      const browserUrl = url.toString();
      
      console.log('🎯 PWA Hook - Clean browser URL:', browserUrl);
      
      // Create anchor element to simulate real user click (more reliable than window.open)
      const anchor = document.createElement('a');
      anchor.href = browserUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      
      // Simulate user click with proper event
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        button: 0
      });
      
      anchor.dispatchEvent(clickEvent);
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(anchor);
      }, 100);
      
      // Try to close PWA window
      setTimeout(() => {
        try {
          window.close();
        } catch (e) {
          console.log('🎯 PWA Hook - Could not close PWA window, showing user message');
          alert('✅ Opened in your browser. You can close this PWA window.');
        }
      }, 500);
      
      console.log('🎯 PWA Hook - forceBrowser redirect handled');
      return; // Exit early to prevent other PWA logic
    }
  }, []); // Run only once on mount

  // Enhanced PWA installation detection
  const checkIfInstalled = async (): Promise<boolean> => {
    try {
      console.log('🔍 PWA Hook - Starting enhanced installation check...');
      
      // Method 1: Check if currently in standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSPWA = (window.navigator as any).standalone === true;
      const isAndroidPWA = document.referrer.includes('android-app://');
      
      console.log('🔍 PWA Hook - Standalone check:', { isStandalone, isIOSPWA, isAndroidPWA });
      
      if (isStandalone || isIOSPWA || isAndroidPWA) {
        console.log('✅ PWA Hook - Detected via standalone mode');
        return true;
      }
      
      // Method 2: Production environment heuristics
      const isProduction = window.location.hostname.includes('verse-dev-central.web.app') || 
                         window.location.hostname.includes('verse-central.web.app') ||
                         (window.location.protocol === 'https:' && 
                          window.location.hostname !== 'localhost');
      
      console.log('🔍 PWA Hook - Environment check:', { 
        hostname: window.location.hostname,
        isProduction,
        hostnameCheck: window.location.hostname.includes('verse-dev-central.web.app'),
        protocolCheck: window.location.protocol === 'https:',
        notLocalhost: window.location.hostname !== 'localhost'
      });
      
      if (isProduction) {
        console.log('🔍 PWA Hook - Running production environment checks...');
        
        // Check for indicators that suggest PWA installation
        const productionPWAIndicators = {
          hasServiceWorker: 'serviceWorker' in navigator,
          chromeMinimal: window.outerHeight - window.innerHeight < 300,
          httpsSecure: window.location.protocol === 'https:',
          noReferrerOrLauncher: document.referrer === '' || document.referrer.includes('launch.html'),
          expectedPWAUrl: window.location.pathname.startsWith('/student') || window.location.pathname.startsWith('/play'),
          macOSChrome: navigator.platform.includes('Mac') && navigator.userAgent.includes('Chrome')
        };
        
        console.log('🔍 PWA Hook - Production PWA indicators:', productionPWAIndicators);
        console.log('🔍 PWA Hook - Production environment details:', {
          hostname: window.location.hostname,
          protocol: window.location.protocol,
          pathname: window.location.pathname,
          referrer: document.referrer,
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          outerHeight: window.outerHeight,
          innerHeight: window.innerHeight,
          chromeHeight: window.outerHeight - window.innerHeight
        });
        
        // Score-based detection for production
        const prodScore = Object.values(productionPWAIndicators).filter(Boolean).length;
        console.log(`🔍 PWA Hook - Production PWA score: ${prodScore}/6 (need 3+ for detection)`);
        
        if (prodScore >= 3) {
          console.log(`✅ PWA Hook - Production PWA detected with score ${prodScore}/6`);
          return true;
        } else {
          console.log(`❌ PWA Hook - Production PWA NOT detected, score too low: ${prodScore}/6`);
        }
      }
      
      // Method 3: Enhanced macOS Chrome PWA detection
      const isMacOS = navigator.platform.includes('Mac');
      const isChrome = navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Edge');
      const isHTTPS = window.location.protocol === 'https:';
      
      if (isMacOS && isChrome && isHTTPS) {
        const windowFeatures = {
          hasMenuBar: window.menubar && window.menubar.visible,
          hasToolBar: window.toolbar && window.toolbar.visible,
          chromeHeight: window.outerHeight - window.innerHeight
        };
        
        // On macOS Chrome, PWAs often have these characteristics:
        const macPWAIndicators = {
          minimalChrome: windowFeatures.chromeHeight < 200,
          noMenuBar: !windowFeatures.hasMenuBar,
          emptyReferrer: document.referrer === '',
          hasServiceWorker: 'serviceWorker' in navigator,
          productionUrl: isProduction
        };
        
        console.log('🔍 PWA Hook - macOS PWA indicators:', macPWAIndicators);
        
        // If multiple indicators suggest PWA, return true
        const macScore = Object.values(macPWAIndicators).filter(Boolean).length;
        if (macScore >= 3) {
          console.log(`✅ PWA Hook - macOS PWA detected with score ${macScore}/5`);
          return true;
        }
      }
      
      // Method 4: Check for getInstalledRelatedApps (Chrome/Android)
      if ('getInstalledRelatedApps' in navigator) {
        try {
          const apps = await (navigator as any).getInstalledRelatedApps();
          console.log('🔍 PWA Hook - Related apps check:', apps.length);
          if (apps.length > 0) {
            console.log('✅ PWA Hook - Detected via getInstalledRelatedApps');
            return true;
          }
        } catch (e) {
          console.log('🔍 PWA Hook - getInstalledRelatedApps error:', e);
        }
      }
      
      // Method 5: Service worker + minimal chrome detection
      if ('serviceWorker' in navigator) {
        try {
          console.log('🔍 PWA Hook - Checking service worker + minimal chrome...');
          const registrations = await navigator.serviceWorker.getRegistrations();
          const chromeHeight = window.outerHeight - window.innerHeight;
          
          console.log('🔍 PWA Hook - Service worker details:', {
            registrationsCount: registrations.length,
            chromeHeight: chromeHeight,
            threshold: 150,
            meetsThreshold: chromeHeight < 150
          });
          
          if (registrations.length > 0 && chromeHeight < 150) {
            console.log('✅ PWA Hook - Detected via service worker + minimal chrome');
            return true;
          } else {
            console.log('❌ PWA Hook - Service worker + minimal chrome check failed');
          }
        } catch (e) {
          console.log('🔍 PWA Hook - Service worker check error:', e);
        }
      } else {
        console.log('❌ PWA Hook - Service worker not supported');
      }
      
      console.log('❌ PWA Hook - No PWA installation detected');
      return false;
      
    } catch (error) {
      console.error('💥 PWA Hook - Error in checkIfInstalled:', error);
      return false;
    }
  };

  useEffect(() => {
    // Check for email link access (students can access via email without Firebase auth)
    const urlParams = new URLSearchParams(window.location.search);
    const emailAccess = urlParams.get('emailAccess') === 'true';
    const fromEmail = urlParams.get('from') === 'email';
    const studentEmailParam = urlParams.get('studentEmail');
    const sourceParam = urlParams.get('source') === 'email';
    const isStudentRoute = window.location.pathname === '/student';
    const sessionFlag = sessionStorage.getItem('direct_token_access') === 'true';
    
    const isEmailLinkAccess = emailAccess || 
                             (fromEmail && studentEmailParam) ||
                             sourceParam ||
                             (sessionFlag && isStudentRoute);
    
    console.log('🔍 PWA Hook - useEffect triggered:', { 
      currentUser: !!currentUser, 
      isStudent, 
      userEmail: currentUser?.email,
      isEmailLinkAccess,
      emailAccess,
      fromEmail,
      studentEmailParam: !!studentEmailParam,
      sourceParam,
      isStudentRoute,
      sessionFlag
    });
    
    // Enable PWA functionality for:
    // 1. Authenticated students (currentUser && isStudent)
    // 2. Email link access to student dashboard (isEmailLinkAccess && isStudentRoute)
    const shouldEnablePWA = (currentUser && isStudent) || (isEmailLinkAccess && isStudentRoute);
    
    if (!shouldEnablePWA) {
      console.log('🚫 PWA Hook - Not enabling PWA:', { 
        hasCurrentUser: !!currentUser, 
        isStudent,
        isEmailLinkAccess,
        isStudentRoute,
        shouldEnablePWA
      });
      return;
    }

    console.log('✅ PWA Hook - Enabling PWA:', {
      reason: currentUser && isStudent ? 'authenticated_student' : 'email_link_access'
    });

    // PWA Launch Redirect - Redirect from browser to PWA if installed
    const checkAndRedirectToPWA = (isInstalled: boolean) => {
      console.log('🔄 PWA Hook - Starting PWA launch redirect check...');
      
      // Don't redirect if we're on a launcher page
      const isLauncherPage = window.location.pathname.includes('launch') || 
                            window.location.pathname.includes('debug-launcher') ||
                            window.location.pathname.includes('test-launcher');
      
      if (isLauncherPage) {
        console.log('🔄 PWA Hook - Skipping redirect check - on launcher page');
        return false;
      }
      
      const standaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const iOSStandalone = (window.navigator as any).standalone === true;
      const inBrowserMode = !standaloneMode && !iOSStandalone;
      
      const referrer = document.referrer;
      const hostname = window.location.hostname;
      const hasNoReferrer = referrer === '';
      const isExternalReferrer = referrer !== '' && !referrer.includes(hostname);
      const isFromLauncher = referrer.includes('launch.html');
      const fromExternalLink = hasNoReferrer || isExternalReferrer || isFromLauncher;
      
      console.log('🔄 PWA Hook - Launch redirect detailed check:', {
        isInstalled,
        inBrowserMode,
        fromExternalLink,
        currentURL: window.location.href,
        referrer: referrer,
        hostname: hostname,
        standaloneMode: standaloneMode,
        iOSStandalone: iOSStandalone,
        hasNoReferrer: hasNoReferrer,
        isExternalReferrer: isExternalReferrer,
        isFromLauncher: isFromLauncher,
        displayMode: standaloneMode ? 'standalone' : 'browser'
      });
      
      // If in browser mode from external link, check PWA status and show appropriate guidance
      if (inBrowserMode && fromExternalLink) {
        console.log('🔄 PWA Hook - Checking PWA installation status for guidance...');
        
        // Check for recent launch attempts to prevent duplicates
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const launchKey = 'pwa_launch_' + (token || 'default');
        const lastLaunch = sessionStorage.getItem(launchKey);
        const now = Date.now();
        
        if (lastLaunch) {
          const timeSinceLastLaunch = now - parseInt(lastLaunch);
          if (timeSinceLastLaunch < 3000) { // 3 second prevention window
            console.log(`🚫 PWA Hook - Duplicate launch prevented! Last launch was ${timeSinceLastLaunch}ms ago`);
            return false; // Skip showing guidance to prevent confusion
          }
        }
        
        // Preserve deep link parameters for PWA launch
        if (window.location.search) {
          console.log('💾 PWA Hook - Preserving deep link params:', window.location.search);
          localStorage.setItem('deepLinkParams', window.location.search);
        }
        
        // Enhanced PWA detection using getInstalledRelatedApps
        const checkPWAInstallationAdvanced = async () => {
          let pwaInstalled = isInstalled; // Start with our existing detection
          
          console.log('🔍 PWA Hook - Advanced check starting with:', { 
            isInstalled, 
            initialDetection: pwaInstalled 
          });
          
          // If our production heuristics already detected PWA, trust that result
          if (pwaInstalled) {
            console.log('✅ PWA Hook - Production heuristics detected PWA, trusting this result');
            return true;
          }
          
          // Only use getInstalledRelatedApps as fallback when heuristics failed
          if ('getInstalledRelatedApps' in navigator) {
            try {
              console.log('🔍 PWA Hook - Checking with getInstalledRelatedApps as fallback...');
              const apps = await (navigator as any).getInstalledRelatedApps();
              console.log('🔍 PWA Hook - Related apps found:', apps);
              
              const domain = window.location.hostname;
              const relatedAppDetected = apps.some((app: any) => 
                app.platform === 'webapp' && 
                (app.url?.includes(domain) || app.id?.includes(domain))
              );
              
              console.log('🔍 PWA Hook - getInstalledRelatedApps result:', relatedAppDetected);
              
              if (relatedAppDetected) {
                pwaInstalled = true;
              }
            } catch (error) {
              console.log('🔍 PWA Hook - getInstalledRelatedApps not supported:', error);
            }
          }
          
          console.log('🔍 PWA Hook - Final advanced detection result:', pwaInstalled);
          return pwaInstalled;
        };
        
        // Create hybrid PWA guidance notification
        const createHybridPWANotification = async () => {
          const finalPWAStatus = await checkPWAInstallationAdvanced();
          
          const notification = document.createElement('div');
          notification.id = 'pwa-hybrid-notification';
          notification.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: linear-gradient(135deg, ${finalPWAStatus ? '#007bff' : '#28a745'}, ${finalPWAStatus ? '#0056b3' : '#20c997'});
            color: white;
            padding: 16px 24px;
            z-index: 99999;
            font-family: system-ui, -apple-system, sans-serif;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: slideDown 0.4s ease-out;
            text-align: center;
            font-size: 16px;
            font-weight: 500;
          `;
          
          // Show launch instructions modal
          const showLaunchInstructions = () => {
            console.log('📱 PWA Hook - Showing launch instructions...');
            
            const modal = document.createElement('div');
            modal.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0,0,0,0.7);
              z-index: 100000;
              display: flex;
              align-items: center;
              justify-content: center;
              animation: fadeIn 0.3s ease-out;
            `;
            
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
              background: white;
              border-radius: 12px;
              padding: 32px;
              max-width: 500px;
              margin: 20px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.3);
              animation: scaleIn 0.3s ease-out;
              text-align: center;
            `;
            
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isWindows = navigator.platform.toUpperCase().indexOf('WIN') >= 0;
            
            modalContent.innerHTML = `
              <div style="color: #333; line-height: 1.6;">
                <h3 style="margin: 0 0 20px 0; color: #007bff; font-size: 24px;">🚀 Open Your LuminateLearn App</h3>
                <p style="font-size: 18px; margin-bottom: 24px;">Your app is installed! Here's how to open it:</p>
                
                <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left;">
                  ${isMac ? `
                    <div style="margin-bottom: 16px;">
                      <strong style="color: #007bff;">Option 1: Spotlight Search</strong><br>
                      • Press <kbd style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 14px;">⌘ + Space</kbd><br>
                      • Type "LuminateLearn"<br>
                      • Press <kbd style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 14px;">Enter</kbd>
                    </div>
                    <div>
                      <strong style="color: #007bff;">Option 2: Dock/Applications</strong><br>
                      • Look for the LuminateLearn icon in your Dock<br>
                      • Or find it in Applications folder
                    </div>
                  ` : isWindows ? `
                    <div style="margin-bottom: 16px;">
                      <strong style="color: #007bff;">Option 1: Start Menu</strong><br>
                      • Press <kbd style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 14px;">Windows</kbd> key<br>
                      • Type "LuminateLearn"<br>
                      • Press <kbd style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 14px;">Enter</kbd>
                    </div>
                    <div>
                      <strong style="color: #007bff;">Option 2: Desktop/Taskbar</strong><br>
                      • Look for the LuminateLearn icon on your desktop<br>
                      • Or check your taskbar
                    </div>
                  ` : `
                    <div>
                      <strong style="color: #007bff;">How to open:</strong><br>
                      • Look for the LuminateLearn app icon<br>
                      • Check your app drawer or home screen<br>
                      • Search for "LuminateLearn" in your device
                    </div>
                  `}
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                  💡 <em>Your assignment will be waiting for you when you open the app!</em>
                </p>
                
                <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                  background: #007bff;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 16px;
                  font-weight: 600;
                  margin-top: 20px;
                  transition: background 0.2s ease;
                " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
                  Got it!
                </button>
              </div>
            `;
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
              if (e.target === modal) {
                modal.remove();
              }
            });
          };
          
          // Create close button
          const closeButton = document.createElement('button');
          closeButton.innerHTML = '✕';
          closeButton.style.cssText = `
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 6px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin-left: 16px;
          `;
          closeButton.onclick = () => {
            notification.style.animation = 'slideUp 0.4s ease-out forwards';
            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
              }
            }, 400);
          };
          
          // Create the notification content
          const contentDiv = document.createElement('div');
          contentDiv.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;';
          
          if (finalPWAStatus) {
            // PWA is installed - show "Open App" guidance with link handling tip
            console.log('📱 PWA Hook - Showing "Open App" guidance for installed PWA');
            
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = 'display: flex; align-items: center; gap: 8px;';
            messageDiv.innerHTML = `
              <span style="font-size: 24px;">📱</span>
              <span>Your LuminateLearn app is installed!</span>
            `;
            
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';
            
            const openButton = document.createElement('button');
            openButton.innerHTML = '🚀 Open App';
            openButton.style.cssText = `
              background: rgba(255,255,255,0.9);
              color: #007bff;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              font-size: 14px;
              transition: all 0.2s ease;
            `;
            
            const linkHandlingButton = document.createElement('button');
            linkHandlingButton.innerHTML = '🔗 Auto-Open Links';
            linkHandlingButton.style.cssText = `
              background: rgba(255,255,255,0.7);
              color: #007bff;
              border: 1px solid rgba(255,255,255,0.8);
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              font-size: 14px;
              transition: all 0.2s ease;
            `;
            
            // Show link handling setup instructions
            const showLinkHandlingInstructions = () => {
              console.log('🔗 PWA Hook - Showing link handling instructions...');
              
              const linkModal = document.createElement('div');
              linkModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease-out;
              `;
              
              const linkModalContent = document.createElement('div');
              linkModalContent.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 32px;
                max-width: 600px;
                margin: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                animation: scaleIn 0.3s ease-out;
                text-align: center;
              `;
              
              linkModalContent.innerHTML = `
                <div style="color: #333; line-height: 1.6;">
                  <h3 style="margin: 0 0 20px 0; color: #007bff; font-size: 24px;">🔗 Auto-Open Assignment Links</h3>
                  <p style="font-size: 18px; margin-bottom: 24px;">Make assignment links open directly in your LuminateLearn app!</p>
                  
                  <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin: 20px 0; text-align: left;">
                    <div style="margin-bottom: 20px;">
                      <strong style="color: #007bff; font-size: 16px;">📍 Step 1: Chrome Settings</strong><br>
                      <div style="margin: 8px 0; padding-left: 20px;">
                        • Click the <strong>address bar</strong> where it shows the URL<br>
                        • Look for a <strong>site settings icon</strong> (🔒 or ⚙️)<br>
                        • Or go to Chrome Menu → Settings → Site Settings → [Find LuminateLearn]
                      </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                      <strong style="color: #007bff; font-size: 16px;">📲 Step 2: Find Your App</strong><br>
                      <div style="margin: 8px 0; padding-left: 20px;">
                        • Look for <strong>"LuminateLearn - Student"</strong><br>
                        • Click on it to open app settings
                      </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                      <strong style="color: #007bff; font-size: 16px;">🔗 Step 3: Enable Link Handling</strong><br>
                      <div style="margin: 8px 0; padding-left: 20px;">
                        • Find <strong>"Opening supported links"</strong><br>
                        • Select <strong>"Open in LuminateLearn - Student"</strong><br>
                        • <em>(Not "Open in Chrome browser")</em>
                      </div>
                    </div>
                    
                    <div style="background: #e3f2fd; padding: 16px; border-radius: 8px; border-left: 4px solid #007bff;">
                      <strong style="color: #0277bd;">✨ Result:</strong><br>
                      Assignment links from emails will now open directly in your LuminateLearn app instead of the browser!
                    </div>
                  </div>
                  
                  <p style="color: #666; font-size: 14px; margin-top: 20px;">
                    💡 <em>This is a one-time setup that makes all future assignment links seamless!</em>
                  </p>
                  
                  <div id="link-modal-close-container"></div>
                </div>
              `;
              
              linkModal.appendChild(linkModalContent);
              document.body.appendChild(linkModal);
              
              // Create close button
              const linkCloseContainer = linkModalContent.querySelector('#link-modal-close-container');
              if (linkCloseContainer) {
                const linkCloseButton = document.createElement('button');
                linkCloseButton.textContent = 'Got it!';
                linkCloseButton.style.cssText = `
                  background: #007bff;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 16px;
                  font-weight: 600;
                  margin-top: 20px;
                  transition: background 0.2s ease;
                `;
                
                linkCloseContainer.appendChild(linkCloseButton);
                
                linkCloseButton.addEventListener('click', (e) => {
                  console.log('🔗 PWA Hook - Link handling modal close button clicked!');
                  e.preventDefault();
                  e.stopPropagation();
                  linkModal.remove();
                });
                
                linkCloseButton.addEventListener('mouseover', () => {
                  linkCloseButton.style.background = '#0056b3';
                });
                linkCloseButton.addEventListener('mouseout', () => {
                  linkCloseButton.style.background = '#007bff';
                });
              }
              
              // Close when clicking outside
              linkModal.addEventListener('click', (e) => {
                if (e.target === linkModal) {
                  linkModal.remove();
                }
              });
            };
            
            openButton.addEventListener('click', showLaunchInstructions);
            openButton.addEventListener('mouseover', () => {
              openButton.style.background = 'white';
            });
            openButton.addEventListener('mouseout', () => {
              openButton.style.background = 'rgba(255,255,255,0.9)';
            });
            
            linkHandlingButton.addEventListener('click', showLinkHandlingInstructions);
            linkHandlingButton.addEventListener('mouseover', () => {
              linkHandlingButton.style.background = 'white';
              linkHandlingButton.style.borderColor = 'rgba(255,255,255,1)';
            });
            linkHandlingButton.addEventListener('mouseout', () => {
              linkHandlingButton.style.background = 'rgba(255,255,255,0.7)';
              linkHandlingButton.style.borderColor = 'rgba(255,255,255,0.8)';
            });
            
            buttonsContainer.appendChild(openButton);
            buttonsContainer.appendChild(linkHandlingButton);
            
            contentDiv.appendChild(messageDiv);
            contentDiv.appendChild(buttonsContainer);
            
          } else {
            // PWA is not installed - show install prompt
            console.log('📱 PWA Hook - Showing "Install App" prompt for uninstalled PWA');
            
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = 'display: flex; align-items: center; gap: 8px;';
            messageDiv.innerHTML = `
              <span style="font-size: 24px;">📲</span>
                              <span>Get the LuminateLearn app for the best experience!</span>
            `;
            
            const installButton = document.createElement('button');
            installButton.innerHTML = '📲 Install App';
            installButton.style.cssText = `
              background: rgba(255,255,255,0.9);
              color: #28a745;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              font-size: 14px;
              transition: all 0.2s ease;
            `;
            
            installButton.addEventListener('click', async () => {
              console.log('📲 PWA Hook - Install button clicked');
              
              // Try to use the stored prompt first, then fall back to global
              let promptToUse = pwaState.installPrompt || (window as any).deferredPrompt;

              if (!promptToUse) {
                console.warn('❌ PWA Hook - No install prompt available for banner button');
                console.log('💡 PWA Hook - Showing manual installation instructions instead');
                
                // Show manual installation instructions
                const instructionModal = document.createElement('div');
                instructionModal.style.cssText = `
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background: rgba(0,0,0,0.7);
                  z-index: 100000;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  animation: fadeIn 0.3s ease-out;
                `;
                
                const modalContent = document.createElement('div');
                modalContent.style.cssText = `
                  background: white;
                  border-radius: 12px;
                  padding: 32px;
                  max-width: 500px;
                  margin: 20px;
                  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                  animation: scaleIn 0.3s ease-out;
                  text-align: center;
                `;
                
                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                const isChrome = navigator.userAgent.includes('Chrome');
                
                modalContent.innerHTML = `
                  <div style="color: #333; line-height: 1.6;">
                    <h3 style="margin: 0 0 20px 0; color: #28a745; font-size: 24px;">📲 Install LuminateLearn App</h3>
                    ${isChrome ? `
                      <p style="font-size: 18px; margin-bottom: 24px;">Use Chrome's install option:</p>
                      <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left;">
                        <div style="margin-bottom: 16px;">
                          <strong style="color: #28a745;">Option 1: Address Bar</strong><br>
                          • Look for the <strong>install icon</strong> (⊞ or 🔗) in your address bar<br>
                          • Click it to install the LuminateLearn app
                        </div>
                        <div style="margin-bottom: 16px;">
                          <strong style="color: #28a745;">Option 2: Chrome Menu</strong><br>
                          • Click the <strong>three dots</strong> (⋮) in the top right<br>
                                                      • Look for <strong>"Install LuminateLearn"</strong><br>
                          • Click to install
                        </div>
                        ${isMac ? `
                          <div>
                            <strong style="color: #28a745;">Option 3: Add to Dock</strong><br>
                            • Chrome Menu → <strong>"More Tools"</strong> → <strong>"Add to Dock"</strong>
                          </div>
                        ` : ''}
                      </div>
                    ` : `
                      <p style="font-size: 18px; margin-bottom: 24px;">Your browser supports PWA installation:</p>
                      <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        • Look for an <strong>install option</strong> in your browser menu<br>
                        • Check for an <strong>install icon</strong> in the address bar<br>
                        • Try the browser's <strong>bookmark or share menu</strong>
                      </div>
                    `}
                    
                    <p style="color: #666; font-size: 14px; margin-top: 20px;">
                      💡 <em>Once installed, you'll get a native app experience with faster loading!</em>
                    </p>
                    
                    <div id="close-button-container"></div>
                  </div>
                `;
                
                instructionModal.appendChild(modalContent);
                document.body.appendChild(instructionModal);
                
                // Create and add the close button via JavaScript for reliable event binding
                const closeButtonContainer = modalContent.querySelector('#close-button-container');
                if (closeButtonContainer) {
                  const closeButton = document.createElement('button');
                  closeButton.textContent = 'Got it!';
                  closeButton.style.cssText = `
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 600;
                    margin-top: 20px;
                    transition: background 0.2s ease;
                  `;
                  
                  // Add the button to the container
                  closeButtonContainer.appendChild(closeButton);
                  
                  // Close button functionality - direct event listener
                  closeButton.addEventListener('click', (e) => {
                    console.log('💡 PWA Hook - Install modal close button clicked!');
                    e.preventDefault();
                    e.stopPropagation();
                    instructionModal.remove();
                  });
                  
                  // Hover effects for close button
                  closeButton.addEventListener('mouseover', () => {
                    closeButton.style.background = '#218838';
                  });
                  closeButton.addEventListener('mouseout', () => {
                    closeButton.style.background = '#28a745';
                  });
                  
                  console.log('💡 PWA Hook - Close button created and event listeners attached');
                } else {
                  console.error('💡 PWA Hook - Close button container not found!');
                }
                
                // Close modal when clicking outside
                instructionModal.addEventListener('click', (e) => {
                  if (e.target === instructionModal) {
                    console.log('💡 PWA Hook - Install modal background clicked');
                    instructionModal.remove();
                  }
                });
                
                notification.remove();
                return;
              }

              // Validate that the installPrompt has a valid prompt function
              if (!promptToUse.prompt || typeof promptToUse.prompt !== 'function') {
                console.error('❌ PWA Hook - Install prompt is invalid');
                setPwaState(prev => ({ ...prev, showInstallPrompt: true }));
                notification.remove();
                return;
              }

              try {
                console.log('📱 PWA Hook - Banner triggering install prompt...');
                
                // Show the install prompt directly
                await promptToUse.prompt();
                
                // Wait for the user to respond to the prompt
                const { outcome } = await promptToUse.userChoice;
                
                console.log(`✅ PWA Hook - Banner install result: ${outcome}`);
                
                if (outcome === 'accepted') {
                  console.log('🎉 PWA Hook - User accepted installation from banner');
                  setPwaState(prev => ({
                    ...prev,
                    showInstallPrompt: false,
                    installPrompt: null,
                    isInstalled: true
                  }));
                  (window as any).deferredPrompt = null;
                } else {
                  console.log('❌ PWA Hook - User dismissed installation from banner');
                  setPwaState(prev => ({
                    ...prev,
                    showInstallPrompt: false
                  }));
                  (window as any).deferredPrompt = null;
                }
                
                // Remove the banner after the interaction
                notification.remove();
                
              } catch (error) {
                console.error('💥 PWA Hook - Error with banner install:', error);
                // Fall back to showing the regular install prompt
                setPwaState(prev => ({ ...prev, showInstallPrompt: true }));
                notification.remove();
              }
            });
            
            installButton.addEventListener('mouseover', () => {
              installButton.style.background = 'white';
            });
            installButton.addEventListener('mouseout', () => {
              installButton.style.background = 'rgba(255,255,255,0.9)';
            });
            
            contentDiv.appendChild(messageDiv);
            contentDiv.appendChild(installButton);
          }
          
          contentDiv.appendChild(closeButton);
          notification.appendChild(contentDiv);
          
          console.log('✅ PWA Hook - Hybrid PWA notification created');
          
          // Add animation styles
          const style = document.createElement('style');
          style.textContent = `
            @keyframes slideDown {
              from { transform: translateY(-100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(0); opacity: 1; }
              to { transform: translateY(-100%); opacity: 0; }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { transform: scale(0.9); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            #pwa-hybrid-notification button:hover {
              transform: translateY(-1px);
            }
          `;
          document.head.appendChild(style);
          document.body.appendChild(notification);
          
          // Auto-hide after 15 seconds if no interaction
          setTimeout(() => {
            if (notification.parentNode && notification.id === 'pwa-hybrid-notification') {
              notification.style.animation = 'slideUp 0.4s ease-out forwards';
              setTimeout(() => {
                if (notification.parentNode) {
                  notification.parentNode.removeChild(notification);
                }
                if (style.parentNode) {
                  style.parentNode.removeChild(style);
                }
              }, 400);
            }
          }, 15000);
        };
        
        // Show the hybrid PWA notification
        // createHybridPWANotification(); // DISABLED: No longer needed with new authentication system
        
        return true;
      }
      
      return false;
    };

    // Check if already installed (async)
    const checkInstallation = async () => {
      const isInstalled = await checkIfInstalled();
      console.log('📱 PWA Hook - Installation check:', { isInstalled });
      setPwaState(prev => ({ ...prev, isInstalled }));
      
      // Handle deep link parameters if PWA is launched
      if (isInstalled && window.matchMedia('(display-mode: standalone)').matches) {
        const savedParams = localStorage.getItem('deepLinkParams');
        if (savedParams && !window.location.search) {
          console.log('📱 PWA Hook - Restoring deep link params:', savedParams);
          
          // Parse the saved parameters
          const urlParams = new URLSearchParams(savedParams);
          const token = urlParams.get('token');
          
          if (token) {
            // If there's a token, navigate to the play route
            console.log('📱 PWA Hook - Token detected in deep link, navigating to game:', token);
            window.location.href = `/play?token=${token}`;
            localStorage.removeItem('deepLinkParams');
            return;
          } else {
            // For other parameters, just append to current URL
            window.history.replaceState({}, '', window.location.pathname + savedParams);
            localStorage.removeItem('deepLinkParams');
          }
        }
      }
      
      // ALWAYS check for PWA launch redirect, regardless of installation status
      console.log('🔄 PWA Hook - About to check PWA launch redirect...');
      const redirected = checkAndRedirectToPWA(isInstalled);
      if (redirected) {
        console.log('🚀 PWA Hook - PWA launch redirect initiated');
      } else {
        console.log('🚫 PWA Hook - PWA launch redirect not triggered');
      }
      
      // Enhanced PWA deep link handling when already in standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const target = urlParams.get('target');
      
      console.log('📱 PWA Enhanced Deep Link - Checking standalone mode conditions:', {
        isStandalone,
        hasToken: !!token,
        hasTarget: !!target,
        currentPath: window.location.pathname,
        searchParams: window.location.search
      });
      
      // Don't redirect if we're on a launcher page
      const isLauncherPage = window.location.pathname.includes('launch') || 
                            window.location.pathname.includes('debug-launcher') ||
                            window.location.pathname.includes('test-launcher');
      
      if (isStandalone && (token || target) && !isLauncherPage) {
        console.log('📱 PWA Enhanced Deep Link - ✅ Already in standalone mode, checking for navigation needed');
        console.log('📱 PWA Enhanced Deep Link - Current path:', window.location.pathname);
        console.log('📱 PWA Enhanced Deep Link - Token:', token);
        console.log('📱 PWA Enhanced Deep Link - Target:', target);
        
        // If we have a token but we're not on /play, navigate there
        if (token && !window.location.pathname.startsWith('/play')) {
          const playUrl = `/play${window.location.search}`;
          console.log('📱 PWA Enhanced Deep Link - 🚀 Navigating to play route:', playUrl);
          setTimeout(() => {
            window.location.href = playUrl;
          }, 100);
        }
        // If we have a target and we're not already there, navigate
        else if (target && target.startsWith('/')) {
          const decodedTarget = decodeURIComponent(target);
          if (window.location.pathname !== decodedTarget) {
            const targetUrl = `${decodedTarget}${window.location.search}`;
            console.log('📱 PWA Enhanced Deep Link - 🚀 Navigating to target route:', targetUrl);
            setTimeout(() => {
              window.location.href = targetUrl;
            }, 100);
          } else {
            console.log('📱 PWA Enhanced Deep Link - ✅ Already on target path:', decodedTarget);
          }
        } else {
          console.log('📱 PWA Enhanced Deep Link - ✅ Already on correct path for token');
        }
      } else {
        console.log('📱 PWA Enhanced Deep Link - ❌ Conditions not met:', {
          isStandalone,
          hasToken: !!token,
          hasTarget: !!target
        });
      }
      
      // Setup link interception if PWA is installed
      if (isInstalled) {
        const cleanup = setupLinkInterception();
        return cleanup;
      }
    };
    
    checkInstallation();

    // PWA Link Interception for Deep Linking
    const setupLinkInterception = () => {
      const isInPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

      // Enhanced LaunchQueue API with proper navigation
      if ('launchQueue' in window) {
        try {
          (window as any).launchQueue.setConsumer((launchParams: any) => {
            console.log('📱 PWA LaunchQueue - Received launch params:', launchParams);
            console.log('📱 PWA LaunchQueue - LaunchParams structure:', JSON.stringify(launchParams, null, 2));
            console.log('📱 PWA LaunchQueue - Has targetURL:', !!launchParams.targetURL);
            console.log('📱 PWA LaunchQueue - targetURL value:', launchParams.targetURL);
            
            if (launchParams.targetURL) {
              try {
                const url = new URL(launchParams.targetURL);
                console.log('📱 PWA LaunchQueue - Parsed URL:', {
                  href: url.href,
                  pathname: url.pathname,
                  search: url.search,
                  hash: url.hash
                });
                
                if (url.search) {
                  console.log('📱 PWA LaunchQueue - Processing deep link:', url.search);
                  
                  // Parse URL parameters to determine navigation target
                  const urlParams = new URLSearchParams(url.search);
                  const target = urlParams.get('target');
                  const token = urlParams.get('token');
                  const forceBrowser = urlParams.get('forceBrowser') === 'true';
                  
                  console.log('📱 PWA LaunchQueue - Parsed params:', { target, token, forceBrowser });
                  
                  // Check if this should be opened in browser instead of PWA
                  if (forceBrowser && isInPWA) {
                    console.log('📱 Detected forceBrowser=true in PWA context');
                    console.log('📱 Opening link in browser using simulated user click');

                    // Create clean browser URL (remove forceBrowser to prevent loops)
                    const cleanUrl = new URL(url.href);
                    cleanUrl.searchParams.delete('forceBrowser');
                    const browserUrl = cleanUrl.toString();
                    
                    console.log('📱 Clean browser URL:', browserUrl);
                    
                    // Create anchor element to simulate real user click
                    const anchor = document.createElement('a');
                    anchor.href = browserUrl;
                    anchor.target = '_blank';
                    anchor.rel = 'noopener noreferrer';
                    
                    // Add the anchor to DOM temporarily
                    document.body.appendChild(anchor);
                    
                    // Simulate user click with proper event
                    const clickEvent = new MouseEvent('click', {
                      view: window,
                      bubbles: true,
                      cancelable: true,
                      ctrlKey: false,
                      metaKey: false,
                      shiftKey: false,
                      button: 0
                    });
                    
                    anchor.dispatchEvent(clickEvent);
                    
                    // Clean up
                    setTimeout(() => {
                      document.body.removeChild(anchor);
                    }, 100);

                    // Show user feedback
                    setTimeout(() => {
                      alert('✅ Opened in your browser. You may close this PWA tab.');
                    }, 500);

                    console.log('📱 forceBrowser link handled - opened in browser');
                    return;
                  }
                  
                  // Navigate to the correct route instead of just updating URL
                  if (target && target.startsWith('/')) {
                    const decodedTarget = decodeURIComponent(target);
                    const fullUrl = decodedTarget + url.search;
                    console.log('📱 PWA LaunchQueue - Navigating to target:', fullUrl);
                    setTimeout(() => {
                      window.location.href = fullUrl;
                    }, 100);
                  } else if (token) {
                    const playUrl = `/play${url.search}`;
                    console.log('📱 PWA LaunchQueue - Navigating to play with token:', playUrl);
                    setTimeout(() => {
                      window.location.href = playUrl;
                    }, 100);
                  } else {
                    // Fallback: just update the URL params
                    console.log('📱 PWA LaunchQueue - Fallback: updating URL params only');
                    window.history.replaceState({}, '', window.location.pathname + url.search);
                  }
                } else {
                  console.log('📱 PWA LaunchQueue - No search parameters found in URL');
                }
              } catch (error) {
                console.error('📱 PWA LaunchQueue - Error parsing targetURL:', error);
              }
            } else {
              console.log('📱 PWA LaunchQueue - No targetURL in launch params');
              
              // Fallback: check current URL for navigation needs
              const currentUrl = window.location.href;
              console.log('📱 PWA LaunchQueue - Current URL fallback check:', currentUrl);
              
              const urlParams = new URLSearchParams(window.location.search);
              const target = urlParams.get('target');
              const token = urlParams.get('token');
              
              if (target || token) {
                console.log('📱 PWA LaunchQueue - Found params in current URL:', { target, token });
                
                if (target && target.startsWith('/')) {
                  const decodedTarget = decodeURIComponent(target);
                  if (window.location.pathname !== decodedTarget) {
                    const fullUrl = decodedTarget + window.location.search;
                    console.log('📱 PWA LaunchQueue - Fallback navigating to target:', fullUrl);
                    setTimeout(() => {
                      window.location.href = fullUrl;
                    }, 100);
                  }
                } else if (token && !window.location.pathname.startsWith('/play')) {
                  const playUrl = `/play${window.location.search}`;
                  console.log('📱 PWA LaunchQueue - Fallback navigating to play:', playUrl);
                  setTimeout(() => {
                    window.location.href = playUrl;
                  }, 100);
                }
              }
            }
          });
          console.log('📱 PWA LaunchQueue - Consumer registered');
        } catch (error) {
          console.log('📱 PWA LaunchQueue - Not supported yet:', error);
        }
      }
      
      // Register PWA as link handler for our domain URLs
      if ('navigator' in window && 'registerProtocolHandler' in navigator) {
        try {
          navigator.registerProtocolHandler(
            'web+lumino',
            window.location.origin + '/play?token=%s'
          );
          console.log('📱 PWA Deep Linking - Protocol handler registered');
        } catch (error) {
          console.log('📱 PWA Deep Linking - Protocol handler not supported:', error);
        }
      }

      // URL interception for same-origin links
      const interceptLinks = (event: Event) => {
        const target = event.target as HTMLAnchorElement;
        if (target && target.tagName === 'A' && target.href) {
          const linkUrl = new URL(target.href);
          const currentUrl = new URL(window.location.href);
          
          // Check if link is to our domain and we're in PWA mode
          if (linkUrl.origin === currentUrl.origin && pwaState.isInstalled) {
            event.preventDefault();
            console.log('📱 PWA Deep Linking - Intercepting link:', target.href);
            window.location.href = target.href;
          }
        }
      };

      document.addEventListener('click', interceptLinks, true);
      
      return () => {
        document.removeEventListener('click', interceptLinks, true);
      };
    };

    // PWA Debugging - Check current state
    console.log('🔧 PWA Debug - Current environment:', {
      'window.location.protocol': window.location.protocol,
      'window.location.hostname': window.location.hostname,
      'navigator.serviceWorker': !!navigator.serviceWorker,
      'window.matchMedia standalone': window.matchMedia('(display-mode: standalone)').matches,
      'document.referrer': document.referrer
    });

    // Check manifest accessibility
    fetch('/manifest.webmanifest')
      .then(response => {
        console.log('🔧 PWA Debug - Manifest fetch:', {
          status: response.status,
          ok: response.ok,
          url: response.url
        });
        return response.json();
      })
      .then(manifest => {
        console.log('🔧 PWA Debug - Manifest content:', manifest);
        console.log('🔧 PWA Debug - Manifest validation:', {
          hasName: !!manifest.name,
          hasShortName: !!manifest.short_name,
          hasStartUrl: !!manifest.start_url,
          hasIcons: !!manifest.icons && manifest.icons.length > 0,
          hasDisplay: !!manifest.display,
          startUrl: manifest.start_url
        });
      })
      .catch(error => {
        console.error('🔧 PWA Debug - Manifest fetch error:', error);
      });

    // Check if service worker is registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log('🔧 PWA Debug - Service Worker registrations:', registrations.length);
        registrations.forEach((registration, index) => {
          console.log(`🔧 PWA Debug - SW ${index}:`, {
            scope: registration.scope,
            state: registration.active?.state,
            hasUpdateHandler: !!registration.onupdatefound
          });
        });
      });
    }

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      
      // Only handle real beforeinstallprompt events, not our test events
      if (!event.prompt || typeof event.prompt !== 'function') {
        console.log('🔧 PWA Debug - Ignoring fake/test beforeinstallprompt event');
        return;
      }
      
      console.log('🎯 PWA Hook - beforeinstallprompt event received');
      console.log('🎯 PWA Hook - Event details:', {
        platforms: event.platforms,
        type: event.type,
        timeStamp: event.timeStamp,
        hasPrompt: typeof event.prompt === 'function'
      });
      
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Store the event globally for access from anywhere
      (window as any).deferredPrompt = event;
      
      // Save the event so it can be triggered later
      setPwaState(prev => ({
        ...prev,
        isInstallable: true,
        showInstallPrompt: true,
        installPrompt: event
      }));

      console.log('PWA install prompt available for student');
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      console.log('PWA installed successfully');
      setPwaState(prev => ({
        ...prev,
        isInstalled: true,
        showInstallPrompt: false,
        installPrompt: null
      }));
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Debug: Check if beforeinstallprompt has already fired
    setTimeout(() => {
      console.log('🔧 PWA Debug - 5 second check:', {
        'beforeinstallprompt fired': !!pwaState.installPrompt,
        'showInstallPrompt': pwaState.showInstallPrompt,
        'isInstallable': pwaState.isInstallable
      });
      
      // Additional Chrome PWA criteria check
      console.log('🔧 PWA Debug - Chrome PWA criteria:', {
        'HTTPS or localhost': window.location.protocol === 'https:' || window.location.hostname === 'localhost',
        'Service Worker registered': 'serviceWorker' in navigator,
        'Manifest linked': !!document.querySelector('link[rel="manifest"]'),
        'Display mode': window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
        'User agent': navigator.userAgent.includes('Chrome'),
        'Platform': navigator.platform,
        'Navigator standalone': (navigator as any).standalone || false
      });
      
      console.log('🔧 PWA Debug - Detailed criteria check:');
      console.log('  - Protocol:', window.location.protocol);
      console.log('  - Hostname:', window.location.hostname);
      console.log('  - SW support:', 'serviceWorker' in navigator);
      console.log('  - Manifest link:', (document.querySelector('link[rel="manifest"]') as HTMLLinkElement)?.href);
      console.log('  - User Agent:', navigator.userAgent);
      console.log('  - Display mode:', window.matchMedia('(display-mode: standalone)').matches);
      
      // Check if PWA is already installed
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('🔧 PWA Debug - App is already running in standalone mode (installed)');
      }
      
      // Manual trigger test (for debugging)
      console.log('🔧 PWA Debug - Manual beforeinstallprompt test...');
      window.addEventListener('beforeinstallprompt', (e) => {
        console.log('🎯 PWA Debug - beforeinstallprompt FINALLY fired!', e);
      });
      
    }, 5000);

    // Also check after 10 seconds
    setTimeout(() => {
      console.log('🔧 PWA Debug - 10 second final check:', {
        'Install prompt available': !!pwaState.installPrompt,
        'Chrome thinks installable': pwaState.isInstallable,
        'PWA enabled': isPWAEnabled
      });
      
      // Chrome PWA installation heuristics check
      console.log('🔧 PWA Debug - Chrome installation heuristics:');
      console.log('  - Page has been visited before:', document.referrer !== '');
      console.log('  - User has interacted with page:', document.hasFocus());
      console.log('  - Time on page > 30s:', performance.now() > 30000);
      console.log('  - No recent dismissal (unknown)');
      
      // Add user interaction tracking to help trigger beforeinstallprompt
      let userHasInteracted = false;
      const trackInteraction = () => {
        userHasInteracted = true;
        console.log('🔧 PWA Debug - User interaction detected, PWA may become installable soon');
        
        // Check for beforeinstallprompt again after interaction
        setTimeout(() => {
          if (!pwaState.installPrompt && !(window as any).deferredPrompt) {
            console.log('🔧 PWA Debug - Still no install prompt after user interaction');
          }
        }, 2000);
      };
      
      // Listen for various user interactions
      ['click', 'touchstart', 'keydown', 'scroll'].forEach(event => {
        document.addEventListener(event, trackInteraction, { once: true });
      });
      
      // Check interaction status after delay
      setTimeout(() => {
        console.log('🔧 PWA Debug - User interaction status after 15s:', userHasInteracted);
        if (!userHasInteracted) {
          console.log('🔧 PWA Debug - No user interaction detected - this may prevent beforeinstallprompt');
        }
      }, 15000);
      
      // Additional comprehensive PWA checks
      console.log('🔧 PWA Debug - Comprehensive installability check:');
      
      // Check if already installed
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isInstalled = isStandalone || isInWebAppiOS;
      console.log('  - Already installed:', isInstalled);
      
      // Check manifest details
      fetch('/manifest.webmanifest')
        .then(response => response.json())
        .then(manifest => {
          console.log('🔧 PWA Debug - Manifest details:', {
            name: manifest.name,
            start_url: manifest.start_url,
            display: manifest.display,
            current_url: window.location.pathname,
            url_match: manifest.start_url === window.location.pathname,
            icons_count: manifest.icons?.length || 0,
            has_512_icon: manifest.icons?.some((icon: any) => icon.sizes.includes('512x512'))
          });
          
          // Check for common PWA blocking issues
          console.log('🔧 PWA Debug - Potential blocking issues:');
          console.log('  - URL mismatch:', manifest.start_url !== window.location.pathname);
          console.log('  - Missing large icon:', !manifest.icons?.some((icon: any) => icon.sizes.includes('512x512')));
          console.log('  - Display not standalone:', manifest.display !== 'standalone');
          console.log('  - Already in standalone mode:', isStandalone);
        })
        .catch(error => {
          console.error('🔧 PWA Debug - Failed to fetch manifest:', error);
        });
      
      // Check Chrome's internal PWA state
      if ('getInstalledRelatedApps' in navigator) {
        (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
          console.log('🔧 PWA Debug - Related apps:', relatedApps);
        }).catch((error: any) => {
          console.log('🔧 PWA Debug - No related apps or error:', error);
        });
      }
      
      // Final attempt to trigger beforeinstallprompt
      console.log('🔧 PWA Debug - Waiting for real beforeinstallprompt event...');
      // Note: Real beforeinstallprompt events are triggered by Chrome automatically
      // when PWA criteria are met and user engagement thresholds are reached
      
    }, 10000);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [currentUser, isStudent]);

  // Install PWA function
  const installPWA = async (): Promise<boolean> => {
    console.log('🚀 PWA Hook - installPWA called:', { 
      hasInstallPrompt: !!pwaState.installPrompt,
      showInstallPrompt: pwaState.showInstallPrompt,
      isInstallable: pwaState.isInstallable,
      hasGlobalPrompt: !!(window as any).deferredPrompt
    });

    // Try to use the stored prompt first, then fall back to global
    let promptToUse = pwaState.installPrompt || (window as any).deferredPrompt;

    if (!promptToUse) {
      console.warn('❌ PWA Hook - No install prompt available. This can happen when:');
      console.warn('  • PWA criteria not fully met (HTTPS, manifest, service worker)');
      console.warn('  • User has already dismissed the prompt');
      console.warn('  • Browser doesn\'t support PWA installation');
      console.warn('  • App is already installed');
      console.warn('  • Chrome cache needs clearing (try clearing site data)');
      
      // Manual fallback - show installation instructions
      console.log('🔧 PWA Debug - Attempting manual installation guidance...');
      return false;
    }

    // Validate that the installPrompt has a valid prompt function
    if (!promptToUse.prompt || typeof promptToUse.prompt !== 'function') {
      console.error('❌ PWA Hook - Install prompt is invalid (no prompt function). Clearing invalid prompt.');
      setPwaState(prev => ({
        ...prev,
        showInstallPrompt: false,
        installPrompt: null,
        isInstallable: false
      }));
      (window as any).deferredPrompt = null;
      return false;
    }

    try {
      console.log('📱 PWA Hook - Showing install prompt...');
      
      // Show the install prompt
      await promptToUse.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await promptToUse.userChoice;
      
      console.log(`✅ PWA Hook - Install prompt result: ${outcome}`);
      
      if (outcome === 'accepted') {
        console.log('🎉 PWA Hook - User accepted installation');
        setPwaState(prev => ({
          ...prev,
          showInstallPrompt: false,
          installPrompt: null
        }));
        (window as any).deferredPrompt = null;
        return true;
      } else {
        console.log('❌ PWA Hook - User dismissed installation');
        // User dismissed the prompt
        setPwaState(prev => ({
          ...prev,
          showInstallPrompt: false
        }));
        (window as any).deferredPrompt = null;
        return false;
      }
    } catch (error) {
      console.error('💥 PWA Hook - Error installing PWA:', error);
      (window as any).deferredPrompt = null;
      return false;
    }
  };

  // Dismiss install prompt
  const dismissInstallPrompt = () => {
    setPwaState(prev => ({
      ...prev,
      showInstallPrompt: false
    }));
  };

  // Check if PWA features should be available
  // Enable for: 1. Authenticated students, 2. Email link access to student dashboard
  const urlParams = new URLSearchParams(window.location.search);
  const emailAccess = urlParams.get('emailAccess') === 'true';
  const fromEmail = urlParams.get('from') === 'email';
  const studentEmailParam = urlParams.get('studentEmail');
  const sourceParam = urlParams.get('source') === 'email';
  const isStudentRoute = window.location.pathname === '/student';
  const sessionFlag = sessionStorage.getItem('direct_token_access') === 'true';
  
  const isEmailLinkAccess = emailAccess || 
                           (fromEmail && studentEmailParam) ||
                           sourceParam ||
                           (sessionFlag && isStudentRoute);
  
  const isPWAEnabled = (currentUser && isStudent) || (isEmailLinkAccess && isStudentRoute);

  return {
    // State
    isInstallable: pwaState.isInstallable && isPWAEnabled,
    isInstalled: pwaState.isInstalled,
    showInstallPrompt: pwaState.showInstallPrompt && isPWAEnabled,
    showBriefInstallPrompt: showBriefInstallPrompt && isPWAEnabled,
    isPWAEnabled,
    
    // Actions
    installPWA,
    dismissInstallPrompt,
    dismissBriefInstallPrompt: () => setShowBriefInstallPrompt(false),
    
    // Utility functions
    checkIfInstalled
  };
};
