/**
 * PWA Link Handling Service
 * Manages deep linking and URL interception for email-to-PWA navigation
 */

interface PWALinkConfig {
  domain: string;
  pwaInstalled: boolean;
  enableInterception: boolean;
}

class PWALinkService {
  private config: PWALinkConfig;
  private linkInterceptor: ((event: Event) => void) | null = null;

  constructor() {
    this.config = {
      domain: window.location.origin,
      pwaInstalled: this.checkPWAInstalled(),
      enableInterception: true
    };
  }

  /**
   * Check if PWA is currently installed/running
   */
  private checkPWAInstalled(): boolean {
    // Check if running in standalone mode (PWA installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    // Check if running in PWA mode on iOS
    const isIOSPWA = (window.navigator as any).standalone === true;
    // Check if running as PWA on Android
    const isAndroidPWA = document.referrer.includes('android-app://');
    
    return isStandalone || isIOSPWA || isAndroidPWA;
  }

  /**
   * Initialize PWA link handling
   */
  public initialize(): void {
    console.log('🔗 PWA Link Service - Initializing...', {
      domain: this.config.domain,
      pwaInstalled: this.config.pwaInstalled,
      enableInterception: this.config.enableInterception
    });

    // Register protocol handler for custom URLs
    this.registerProtocolHandler();

    // Setup link interception if PWA is installed
    if (this.config.pwaInstalled && this.config.enableInterception) {
      this.setupLinkInterception();
    }

    // Listen for PWA installation
    this.setupInstallationListener();
  }

  /**
   * Register protocol handler for deep linking
   */
  private registerProtocolHandler(): void {
    if ('registerProtocolHandler' in navigator) {
      try {
        navigator.registerProtocolHandler(
          'web+lumino',
          `${this.config.domain}/play?token=%s`
        );
        console.log('🔗 PWA Link Service - Protocol handler registered for web+lumino');
      } catch (error) {
        console.log('🔗 PWA Link Service - Protocol handler registration failed:', error);
      }
    }
  }

  /**
   * Setup link interception for same-origin links
   */
  private setupLinkInterception(): void {
    this.linkInterceptor = (event: Event) => {
      const target = event.target as HTMLAnchorElement;
      
      if (!target || target.tagName !== 'A' || !target.href) {
        return;
      }

      try {
        const linkUrl = new URL(target.href);
        const currentUrl = new URL(window.location.href);
        
        // Only intercept links to our domain
        if (linkUrl.origin === currentUrl.origin) {
          console.log('🔗 PWA Link Service - Intercepting same-origin link:', target.href);
          
          // Let the PWA handle the navigation
          event.preventDefault();
          
          // Use pushState for smooth navigation within PWA
          if (linkUrl.pathname !== currentUrl.pathname || linkUrl.search !== currentUrl.search) {
            window.history.pushState({}, '', target.href);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }
      } catch (error) {
        console.error('🔗 PWA Link Service - Link interception error:', error);
      }
    };

    document.addEventListener('click', this.linkInterceptor, true);
    console.log('🔗 PWA Link Service - Link interception enabled');
  }

  /**
   * Remove link interception
   */
  private removeLinkInterception(): void {
    if (this.linkInterceptor) {
      document.removeEventListener('click', this.linkInterceptor, true);
      this.linkInterceptor = null;
      console.log('🔗 PWA Link Service - Link interception disabled');
    }
  }

  /**
   * Setup listener for PWA installation events
   */
  private setupInstallationListener(): void {
    window.addEventListener('appinstalled', () => {
      console.log('🔗 PWA Link Service - App installed, enabling link interception');
      this.config.pwaInstalled = true;
      
      if (this.config.enableInterception && !this.linkInterceptor) {
        this.setupLinkInterception();
      }
    });
  }

  /**
   * Create special PWA-aware links
   */
  public createPWALink(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.config.domain);
    
    // Add PWA-specific parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    // Add PWA hint for better link handling
    if (this.config.pwaInstalled) {
      url.searchParams.set('pwa', 'true');
    }

    return url.toString();
  }

  /**
   * Handle link clicks programmatically
   */
  public navigateToLink(href: string): void {
    try {
      const url = new URL(href);
      const currentUrl = new URL(window.location.href);
      
      if (url.origin === currentUrl.origin && this.config.pwaInstalled) {
        // Navigate within PWA
        console.log('🔗 PWA Link Service - Programmatic navigation within PWA:', href);
        window.location.href = href;
      } else {
        // External link or no PWA
        window.location.href = href;
      }
    } catch (error) {
      console.error('🔗 PWA Link Service - Navigation error:', error);
      window.location.href = href;
    }
  }

  /**
   * Check if a URL should open in PWA
   */
  public shouldOpenInPWA(href: string): boolean {
    try {
      const url = new URL(href);
      const currentUrl = new URL(window.location.href);
      
      return url.origin === currentUrl.origin && this.config.pwaInstalled;
    } catch {
      return false;
    }
  }

  /**
   * Generate email-optimized links
   */
  public generateEmailLinks(assignmentToken: string) {
    const baseUrl = this.config.domain;
    
    return {
      pwaInstallLink: `${baseUrl}/student?pwa=install&from=email`,
      assignmentLink: `${baseUrl}/play?token=${assignmentToken}&from=email`,
      studentPortalLink: `${baseUrl}/student?from=email`,
      
      // Protocol handler links (experimental)
      protocolAssignmentLink: `web+lumino:${assignmentToken}`
    };
  }

  /**
   * Cleanup and destroy service
   */
  public destroy(): void {
    this.removeLinkInterception();
    console.log('🔗 PWA Link Service - Destroyed');
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<PWALinkConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    console.log('🔗 PWA Link Service - Config updated:', {
      old: oldConfig,
      new: this.config
    });

    // Re-setup if needed
    if (oldConfig.pwaInstalled !== this.config.pwaInstalled) {
      if (this.config.pwaInstalled && this.config.enableInterception) {
        this.setupLinkInterception();
      } else {
        this.removeLinkInterception();
      }
    }
  }
}

// Create singleton instance
export const pwaLinkService = new PWALinkService();

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  pwaLinkService.initialize();
}

export default pwaLinkService; 