/**
 * Email Link Handler Service
 * Handles the three types of email links: PWA, Browser, and Install
 * Uses Service Worker + BroadcastChannel for PWA window coordination
 */

export interface EmailLinkParams {
  studentEmail?: string;
  source?: string;
  mode?: 'pwa' | 'browser' | 'install';
  target?: 'dashboard' | 'assignment';
  token?: string;
  focus?: boolean;
  install?: string;
}

export class EmailLinkHandler {
  private static instance: EmailLinkHandler;
  private assignmentChannel: BroadcastChannel | null = null;
  private serviceWorkerReady = false;

  private constructor() {
    // Check if we're in browser-only mode before initializing
    const urlParams = new URLSearchParams(window.location.search);
    const forceBrowser = urlParams.get('forceBrowser') === 'true';
    
    if (forceBrowser) {
      console.log('[EmailLink] 🚫 Browser-only mode detected - skipping service worker initialization');
      return;
    }
    
    this.initializeBroadcastChannel();
    this.checkServiceWorkerReady();
  }

  public static getInstance(): EmailLinkHandler {
    if (!EmailLinkHandler.instance) {
      EmailLinkHandler.instance = new EmailLinkHandler();
    }
    return EmailLinkHandler.instance;
  }

  private initializeBroadcastChannel() {
    try {
      this.assignmentChannel = new BroadcastChannel('lumino-assignments');
      console.log('[EmailLink] 📡 BroadcastChannel initialized');
    } catch (error) {
      console.warn('[EmailLink] ⚠️ BroadcastChannel not supported:', error);
    }
  }

  private async checkServiceWorkerReady() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        this.serviceWorkerReady = !!registration.active;
        console.log('[EmailLink] 🔧 Service Worker ready:', this.serviceWorkerReady);
      } catch (error) {
        console.warn('[EmailLink] ⚠️ Service Worker check failed:', error);
      }
    }
  }

  /**
   * Handle PWA link click - FOCUS-FIRST approach
   */
  public async handlePWALink(params: EmailLinkParams): Promise<void> {
    console.log('[EmailLink] 📱 Handling PWA link with LAUNCHER BRIDGE approach:', params);
    
    // Step 1: FOCUS-FIRST - Always try to focus existing PWA windows first
    if (this.serviceWorkerReady && navigator.serviceWorker.controller) {
      console.log('[EmailLink] 🎯 FOCUS-FIRST: Checking for existing PWA windows...');
      
      const focusResult = await this.tryFocusExistingPWA(params.studentEmail, params.source);
      
      if (focusResult.success) {
        console.log('[EmailLink] ✅ FOCUS-FIRST SUCCESS: Found and focused existing PWA window');
        
        // Notify the focused PWA about new activity (if it's assignment-related)
        if (params.token) {
          this.notifyPWAOfNewAssignment(params);
        }
        
        // For email link router window, just show success message instead of closing
        // This prevents interference with PWA window management
        this.showSuccessMessage('✅ Opened in existing app window');
        return;
      } else {
        console.log('[EmailLink] ❌ FOCUS-FIRST: No existing PWA windows found:', focusResult.reason);
      }
    } else {
      console.log('[EmailLink] ⚠️ Service Worker not ready, skipping focus attempt');
    }
    
    // Step 2: No existing PWA to focus - Direct dashboard redirect for seamless UX
    if (params.target === 'dashboard') {
      console.log('[EmailLink] 🎯 Direct dashboard redirect for seamless UX');
      const dashboardUrl = this.buildDashboardURL({
        ...params,
        mode: 'pwa'
      });
      
      console.log('[EmailLink] 🚀 Redirecting directly to dashboard:', dashboardUrl);
      window.location.href = dashboardUrl;
    } else {
      // For assignments, still use launcher.html bridge for authentication transfer
      console.log('[EmailLink] 🌉 Using launcher.html bridge for assignment authentication transfer');
      const launcherUrl = this.buildLauncherURL(params);
      
      console.log('[EmailLink] 🎯 Redirecting to launcher bridge:', launcherUrl);
      window.location.href = launcherUrl;
    }
  }

  /**
   * Handle Browser link click - always opens in browser
   */
  public async handleBrowserLink(params: EmailLinkParams): Promise<void> {
    console.log('[EmailLink] 🌐 Handling Browser link:', params);

    const url = this.buildDashboardURL({
      ...params,
      mode: 'browser'
    });

    // Force browser mode by redirecting current window (not opening new tab)
    // This prevents PWA detection and window management interference
    console.log('[EmailLink] 🌐 Redirecting to browser-only mode:', url);
    window.location.href = url;
  }

  /**
   * Handle Install link click - shows installation guide
   */
  public async handleInstallLink(params: EmailLinkParams): Promise<void> {
    console.log('[EmailLink] ⬇️ Handling Install link:', params);

    const url = this.buildDashboardURL({
      ...params,
      install: 'guide',
      mode: 'browser'
    });

    // Open in browser with install guide
    console.log('[EmailLink] ⬇️ Opening install guide:', url);
    window.open(url, '_blank');
  }

  /**
   * Notify existing PWA about new assignment activity
   */
  private notifyPWAOfNewAssignment(params: EmailLinkParams): void {
    console.log('[EmailLink] 📢 Notifying focused PWA about new assignment:', params);
    
    if (this.assignmentChannel) {
      this.assignmentChannel.postMessage({
        type: 'ASSIGNMENT_AVAILABLE',
        studentEmail: params.studentEmail,
        token: params.token,
        source: params.source || 'email',
        timestamp: Date.now()
      });
    }
    
    // Also try via Service Worker if available
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'NEW_ASSIGNMENT_NOTIFICATION',
        studentEmail: params.studentEmail,
        token: params.token,
        source: params.source || 'email',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Try to focus existing PWA window via Service Worker
   */
  private async tryFocusExistingPWA(studentEmail?: string, source = 'email'): Promise<{success: boolean, reason?: string}> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, reason: 'timeout' });
      }, 3000); // 3 second timeout

      // Listen for Service Worker response
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'PWA_WINDOW_FOCUSED') {
          clearTimeout(timeout);
          navigator.serviceWorker.removeEventListener('message', handleMessage);
          
          console.log('[EmailLink] 📱 Service Worker response:', event.data);
          resolve({
            success: event.data.success,
            reason: event.data.reason
          });
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      // Send request to Service Worker
      navigator.serviceWorker.controller?.postMessage({
        type: 'CHECK_PWA_WINDOWS',
        studentEmail,
        source,
        timestamp: Date.now()
      });
    });
  }



  /**
   * Attempt to close window with graceful COOP policy handling
   */
  private attemptWindowClose(): void {
    if (!this.shouldCloseCurrentWindow()) {
      console.log('[EmailLink] 🚫 Skipping window close - already in PWA context');
      return;
    }

    setTimeout(() => {
      try {
        console.log('[EmailLink] 🔄 Attempting to close email link window...');
        window.close();
        
        // Check if window actually closed after a brief delay
        setTimeout(() => {
          if (!window.closed) {
            console.warn('[EmailLink] ⚠️ Window close blocked by COOP policy - showing user hint');
            this.showCloseHint();
          } else {
            console.log('[EmailLink] ✅ Email link window closed successfully');
          }
        }, 500);
        
      } catch (error) {
        console.warn('[EmailLink] ⚠️ Unable to close window due to COOP/CORB policy:', error);
        this.showCloseHint();
      }
    }, 1000);
  }

  /**
   * Show success message to user
   */
  private showSuccessMessage(message: string): void {
    // Create a success notification for the user
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #48BB78;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 300px;
    `;
    hint.innerHTML = `
      <div style="font-weight: bold;">${message}</div>
      <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">You may safely close this tab.</div>
    `;
    
    document.body.appendChild(hint);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (hint.parentNode) {
        hint.parentNode.removeChild(hint);
      }
    }, 5000);
  }

  /**
   * Show user hint when window.close() is blocked
   */
  private showCloseHint(): void {
    // Create a subtle notification for the user
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4299E1;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 300px;
    `;
    hint.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">✅ App Launched!</div>
      <div>You may safely close this tab.</div>
    `;
    
    document.body.appendChild(hint);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (hint.parentNode) {
        hint.parentNode.removeChild(hint);
      }
    }, 8000);
    
    console.log('[EmailLink] 💡 User hint displayed: "You may safely close this tab"');
  }

  /**
   * Check if PWA is installed using multiple robust detection methods
   * Implements graceful handling of install state loss after site data clear
   */
  private async checkPWAInstalled(): Promise<{isInstalled: boolean, confidence: 'high' | 'medium' | 'low', reasons: string[]}> {
    console.log('[EmailLink] 🔍 Starting comprehensive PWA installation check...');
    
    const reasons: string[] = [];
    let confidence: 'high' | 'medium' | 'low' = 'low';
    
    // Method 1: Check if currently in standalone mode (highest confidence)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true ||
                        document.referrer.includes('android-app://');

    if (isStandalone) {
      console.log('[EmailLink] ✅ PWA detected: Currently in standalone mode');
      return { isInstalled: true, confidence: 'high', reasons: ['Currently running in standalone mode'] };
    }

    // Method 2: iOS-specific detection
    const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    if (isIOS && (window.navigator as any).standalone === true) {
      console.log('[EmailLink] ✅ PWA detected: iOS standalone mode');
      return { isInstalled: true, confidence: 'high', reasons: ['iOS standalone mode detected'] };
    }

    // Method 3: Enhanced production environment checks
    const userAgent = navigator.userAgent.toLowerCase();
    const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
    const isEdge = userAgent.includes('edg');
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
    const isFirefox = userAgent.includes('firefox');
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

    // Check for PWA indicators
    let pwaScore = 0;
    const indicators = {
      serviceWorker: false,
      manifest: false,
      https: false,
      installedApps: false,
      displayMode: false
    };

    // HTTPS check
    if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
      indicators.https = true;
      pwaScore++;
      reasons.push('HTTPS/localhost detected');
    }

    // Service Worker check
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          indicators.serviceWorker = true;
          pwaScore++;
          reasons.push(`Service Worker registered (${registrations.length} registrations)`);
        }
      } catch (error) {
        console.warn('[EmailLink] ⚠️ Service worker check failed:', error);
        reasons.push('Service Worker check failed');
      }
    }

    // Manifest check
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (manifestLink) {
      indicators.manifest = true;
      pwaScore++;
      reasons.push('Manifest linked');
    }

    // getInstalledRelatedApps check (Chrome/Android) - Most reliable for installation
    if ('getInstalledRelatedApps' in navigator) {
      try {
        const apps = await (navigator as any).getInstalledRelatedApps();
        console.log('[EmailLink] 🔍 getInstalledRelatedApps result:', apps);
        if (apps.length > 0) {
          indicators.installedApps = true;
          pwaScore += 3; // Highest weight for this indicator
          confidence = 'high';
          reasons.push(`Related apps found (${apps.length})`);
          
          console.log('[EmailLink] ✅ PWA detected via getInstalledRelatedApps');
          return { isInstalled: true, confidence: 'high', reasons };
        } else {
          reasons.push('No related apps found (may indicate uninstalled or cleared data)');
        }
      } catch (error) {
        console.warn('[EmailLink] ⚠️ getInstalledRelatedApps check failed:', error);
        reasons.push('getInstalledRelatedApps check failed');
      }
    }

    // Display mode check (if PWA manifest exists)
    if (manifestLink) {
      try {
        const response = await fetch(manifestLink.href);
        const manifest = await response.json();
        if (manifest.display === 'standalone' || manifest.display === 'fullscreen') {
          indicators.displayMode = true;
          pwaScore++;
          reasons.push('Manifest has standalone/fullscreen display');
        }
      } catch (error) {
        console.warn('[EmailLink] ⚠️ Manifest fetch failed:', error);
        reasons.push('Manifest fetch failed');
      }
    }

    // Determine confidence level and installation status
    if (pwaScore >= 4 && indicators.serviceWorker && indicators.manifest) {
      confidence = 'medium';
    } else if (pwaScore >= 2) {
      confidence = 'low';
    }

    // More lenient PWA detection for iOS/Safari email links
    let isPWAInstalled = false;
    
    if (isIOS || isSafari) {
      // On iOS/Safari, be more lenient since getInstalledRelatedApps isn't available
      // and email links open in browser context, not PWA context
      if (indicators.manifest && indicators.https) {
        // If we have basic PWA infrastructure, assume PWA might be installed
        // iOS handles PWA launching gracefully - if not installed, it opens in browser
        isPWAInstalled = true;
        confidence = 'medium';
        reasons.push('iOS/Safari detected - assuming PWA available (graceful fallback)');
        console.log('[EmailLink] 🍎 iOS/Safari PWA assumed available - will attempt PWA launch');
      } else {
        isPWAInstalled = pwaScore >= 2;
        reasons.push('iOS/Safari detected - using lenient detection criteria');
      }
    } else {
      // Standard detection for other browsers
      isPWAInstalled = pwaScore >= 3 && indicators.serviceWorker && indicators.manifest;
    }
    
    console.log('[EmailLink] 📊 PWA detection results:', {
      pwaScore,
      confidence,
      indicators,
      reasons,
      userAgent: { isChrome, isEdge, isSafari, isFirefox, isMobile }
    });
    
    console.log(`[EmailLink] ${isPWAInstalled ? '✅' : '❌'} PWA installation status: ${isPWAInstalled ? 'INSTALLED' : 'NOT INSTALLED'} (score: ${pwaScore}/7, confidence: ${confidence})`);
    
    return { isInstalled: isPWAInstalled, confidence, reasons };
  }

  /**
   * Build URL for launcher.html bridge (maintains authentication context)
   */
  private buildLauncherURL(params: EmailLinkParams): string {
    const baseUrl = window.location.origin;
    const url = new URL('/launcher.html', baseUrl);

    // Set target destination for launcher
    if (params.target === 'assignment' && params.token) {
      url.searchParams.set('target', encodeURIComponent(`/play?token=${params.token}&pwa=true&pwa_type=game&from=launcher&emailAccess=true`));
    } else {
      // Dashboard target with email parameters
      let dashboardTarget = '/student';
      const dashboardParams = new URLSearchParams();
      
      if (params.studentEmail) {
        dashboardParams.set('studentEmail', params.studentEmail);
      }
      if (params.source) {
        dashboardParams.set('source', params.source);
      }
      
      // Add PWA context parameters
      dashboardParams.set('pwa', 'true');
      dashboardParams.set('from', 'email');
      dashboardParams.set('emailAccess', 'true');
      
      if (dashboardParams.toString()) {
        dashboardTarget += '?' + dashboardParams.toString();
      }
      
      url.searchParams.set('target', encodeURIComponent(dashboardTarget));
    }
    
    // Add PWA hint for launcher
    url.searchParams.set('pwa', 'true');
    
    console.log('[EmailLink] 🌉 Built launcher URL:', url.toString());
    return url.toString();
  }

  /**
   * Build URL for Student Dashboard (simplified design - no direct game tokens)
   */
  private buildDashboardURL(params: EmailLinkParams): string {
    const baseUrl = window.location.origin;
    
    // Always route to Student Dashboard - provides better UX
    const path = '/student';
    const url = new URL(path, baseUrl);

    // Add student identification
    if (params.studentEmail) {
      url.searchParams.set('studentEmail', params.studentEmail);
    }
    
    // Add source tracking
    if (params.source) {
      url.searchParams.set('source', params.source);
    }
    
    // Set mode-specific parameters for Student Dashboard
    if (params.mode === 'pwa') {
      // PWA mode: Focus existing OR launch PWA OR browser with install message
      url.searchParams.set('pwa', 'true');
      url.searchParams.set('from', 'email');
      url.searchParams.set('emailAccess', 'true');
    } else if (params.mode === 'browser') {
      // Browser mode: Always browser tab, no install message
      url.searchParams.set('forceBrowser', 'true');
      url.searchParams.set('from', 'email');
    } else if (params.mode === 'install') {
      // Install mode: Browser tab with install message
      url.searchParams.set('forceBrowser', 'true');
      url.searchParams.set('from', 'email');
      url.searchParams.set('showInstall', 'true');
    }

    return url.toString();
  }

  /**
   * Notify about assignment availability via BroadcastChannel
   */
  private notifyAssignmentAvailable(source: string): void {
    if (this.assignmentChannel) {
      this.assignmentChannel.postMessage({
        type: 'ASSIGNMENT_AVAILABLE',
        source,
        timestamp: Date.now()
      });
      console.log('[EmailLink] 📡 Assignment notification sent via BroadcastChannel');
    }
  }

  /**
   * Determine if current window should be closed after focusing PWA
   */
  private shouldCloseCurrentWindow(): boolean {
    // Don't close if we're already in a PWA context
    const isInPWA = window.matchMedia('(display-mode: standalone)').matches ||
                   (window.navigator as any).standalone === true ||
                   window.location.pathname.includes('/student') ||
                   window.location.pathname.includes('/play');

    return !isInPWA;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.assignmentChannel) {
      this.assignmentChannel.close();
      this.assignmentChannel = null;
    }
  }
}

// Export singleton instance
export const emailLinkHandler = EmailLinkHandler.getInstance(); 