/**
 * Email Link Analytics Service
 * Tracks usage and effectiveness of the 5-link email template system
 */

interface EmailLinkEvent {
  linkType: 'smart-assignment' | 'smart-dashboard' | 'browser-assignment' | 'browser-dashboard' | 'pwa-assignment' | 'pwa-dashboard' | 'install';
  userId?: string;
  studentEmail?: string;
  token?: string;
  pwaInstalled: boolean;
  userAgent: string;
  fromEmail: boolean;
  timestamp: number;
  sessionId: string;
}

interface EmailLinkAnalytics {
  trackEmailLinkClick: (linkType: EmailLinkEvent['linkType'], additionalData?: Partial<EmailLinkEvent>) => void;
  trackSmartRouteDecision: (routeType: 'assignment' | 'dashboard', decision: 'pwa' | 'browser', reason: string) => void;
  trackPWAInstallFromEmail: (success: boolean, method: 'automatic' | 'manual' | 'failed') => void;
  getSessionId: () => string;
  generateAnalyticsReport: () => Promise<any>;
}

class EmailLinkAnalyticsService implements EmailLinkAnalytics {
  private sessionId: string;
  private events: EmailLinkEvent[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    console.log('📊 Email Link Analytics initialized with session:', this.sessionId);
  }

  private generateSessionId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  trackEmailLinkClick(linkType: EmailLinkEvent['linkType'], additionalData: Partial<EmailLinkEvent> = {}): void {
    try {
      const event: EmailLinkEvent = {
        linkType,
        pwaInstalled: this.detectPWAInstallation(),
        userAgent: navigator.userAgent,
        fromEmail: this.detectEmailOrigin(),
        timestamp: Date.now(),
        sessionId: this.sessionId,
        ...additionalData
      };

      this.events.push(event);
      
      // Store in localStorage for persistence
      const storedEvents = JSON.parse(localStorage.getItem('email_link_analytics') || '[]');
      storedEvents.push(event);
      localStorage.setItem('email_link_analytics', JSON.stringify(storedEvents));

      console.log('📊 Email Link Analytics - Link clicked:', {
        linkType: event.linkType,
        pwaInstalled: event.pwaInstalled,
        fromEmail: event.fromEmail,
        sessionId: event.sessionId
      });

      // Send to backend analytics if available
      this.sendToBackend(event);
    } catch (error) {
      console.error('📊 Email Link Analytics - Error tracking click:', error);
    }
  }

  trackSmartRouteDecision(routeType: 'assignment' | 'dashboard', decision: 'pwa' | 'browser', reason: string): void {
    try {
      const event = {
        type: 'smart_route_decision',
        routeType,
        decision,
        reason,
        pwaInstalled: this.detectPWAInstallation(),
        timestamp: Date.now(),
        sessionId: this.sessionId
      };

      console.log('📊 Email Link Analytics - Smart route decision:', event);
      
      // Store analytics
      const storedDecisions = JSON.parse(localStorage.getItem('smart_route_decisions') || '[]');
      storedDecisions.push(event);
      localStorage.setItem('smart_route_decisions', JSON.stringify(storedDecisions));

      this.sendToBackend(event);
    } catch (error) {
      console.error('📊 Email Link Analytics - Error tracking smart route:', error);
    }
  }

  trackPWAInstallFromEmail(success: boolean, method: 'automatic' | 'manual' | 'failed'): void {
    try {
      const event = {
        type: 'pwa_install_from_email',
        success,
        method,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userAgent: navigator.userAgent
      };

      console.log('📊 Email Link Analytics - PWA install tracked:', event);

      // Store analytics
      const storedInstalls = JSON.parse(localStorage.getItem('pwa_install_analytics') || '[]');
      storedInstalls.push(event);
      localStorage.setItem('pwa_install_analytics', JSON.stringify(storedInstalls));

      this.sendToBackend(event);
    } catch (error) {
      console.error('📊 Email Link Analytics - Error tracking PWA install:', error);
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  private detectPWAInstallation(): boolean {
    try {
      // Multiple PWA detection methods
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSPWA = (window.navigator as any).standalone === true;
      const isAndroidPWA = document.referrer.includes('android-app://');
      
      return isStandalone || isIOSPWA || isAndroidPWA;
    } catch {
      return false;
    }
  }

  private detectEmailOrigin(): boolean {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('from') === 'email';
    } catch {
      return false;
    }
  }

  private async sendToBackend(event: any): Promise<void> {
    try {
      // Only send in production and if analytics endpoint is available
      const isProduction = window.location.hostname.includes('verse-dev-central.web.app') || 
                         window.location.hostname.includes('verse-central.web.app');
      
      if (!isProduction) {
        console.log('📊 Analytics - Dev mode, skipping backend send:', event);
        return;
      }

      // Send to Firebase Analytics or custom endpoint
      // You can integrate with Firebase Analytics here
      console.log('📊 Analytics - Would send to backend:', event);
      
      // Example Firebase Analytics integration:
      // import { logEvent } from 'firebase/analytics';
      // logEvent(analytics, 'email_link_interaction', event);
      
    } catch (error) {
      console.warn('📊 Analytics - Backend send failed:', error);
    }
  }

  async generateAnalyticsReport(): Promise<any> {
    try {
      const emailEvents = JSON.parse(localStorage.getItem('email_link_analytics') || '[]');
      const routeDecisions = JSON.parse(localStorage.getItem('smart_route_decisions') || '[]');
      const installEvents = JSON.parse(localStorage.getItem('pwa_install_analytics') || '[]');

      const report = {
        totalEmailLinkClicks: emailEvents.length,
        linkTypeBreakdown: this.calculateLinkTypeBreakdown(emailEvents),
        smartRouteEffectiveness: this.calculateSmartRouteEffectiveness(routeDecisions),
        pwaInstallSuccess: this.calculatePWAInstallSuccess(installEvents),
        userAgentBreakdown: this.calculateUserAgentBreakdown(emailEvents),
        sessionCount: new Set(emailEvents.map((e: any) => e.sessionId)).size,
        timeRange: {
          earliest: Math.min(...emailEvents.map((e: any) => e.timestamp)),
          latest: Math.max(...emailEvents.map((e: any) => e.timestamp))
        }
      };

      console.log('📊 Email Link Analytics Report:', report);
      return report;
    } catch (error) {
      console.error('📊 Analytics - Error generating report:', error);
      return null;
    }
  }

  private calculateLinkTypeBreakdown(events: any[]): any {
    const breakdown: any = {};
    events.forEach(event => {
      breakdown[event.linkType] = (breakdown[event.linkType] || 0) + 1;
    });
    return breakdown;
  }

  private calculateSmartRouteEffectiveness(decisions: any[]): any {
    const effectiveness = {
      totalDecisions: decisions.length,
      pwaRoutes: decisions.filter((d: any) => d.decision === 'pwa').length,
      browserRoutes: decisions.filter((d: any) => d.decision === 'browser').length
    };
    
    return {
      ...effectiveness,
      pwaPercentage: effectiveness.totalDecisions > 0 ? 
        (effectiveness.pwaRoutes / effectiveness.totalDecisions * 100).toFixed(1) : 0
    };
  }

  private calculatePWAInstallSuccess(installs: any[]): any {
    const success = installs.filter((i: any) => i.success).length;
    const total = installs.length;
    
    return {
      total,
      successful: success,
      successRate: total > 0 ? (success / total * 100).toFixed(1) : 0,
      methodBreakdown: installs.reduce((acc: any, install: any) => {
        acc[install.method] = (acc[install.method] || 0) + 1;
        return acc;
      }, {})
    };
  }

  private calculateUserAgentBreakdown(events: any[]): any {
    const agents: any = {};
    events.forEach(event => {
      const ua = event.userAgent;
      let category = 'Other';
      
      if (ua.includes('Chrome')) category = 'Chrome';
      else if (ua.includes('Safari') && !ua.includes('Chrome')) category = 'Safari';
      else if (ua.includes('Firefox')) category = 'Firefox';
      else if (ua.includes('Edge')) category = 'Edge';
      
      agents[category] = (agents[category] || 0) + 1;
    });
    return agents;
  }
}

// Export singleton instance
export const emailLinkAnalytics = new EmailLinkAnalyticsService();

// Export types for use in other components
export type { EmailLinkEvent, EmailLinkAnalytics }; 