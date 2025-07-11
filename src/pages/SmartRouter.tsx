import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePWA } from '../hooks/usePWA';
import LoadingSpinner from '../components/LoadingSpinner';
import { emailLinkAnalytics } from '../services/emailLinkAnalytics';

/**
 * Smart Router for Email Template Links
 * Handles PWA detection and intelligent routing for the 5-link email system
 */
const SmartRouter: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isInstalled, isInstallable, installPWA } = usePWA();
  const [isDetecting, setIsDetecting] = useState(true);
  const [routeDecision, setRouteDecision] = useState<string>('');

  // Get route parameters
  const routeType = window.location.pathname.includes('/assignment') ? 'assignment' : 'dashboard';
  const token = searchParams.get('token');
  const mode = searchParams.get('mode'); // 'browser', 'pwa', or 'install'
  const forceBrowser = searchParams.get('forceBrowser') === 'true';
  const pwaMode = searchParams.get('pwaMode'); // 'required' for PWA-only links
  const showGuide = searchParams.get('showGuide') === 'true';
  const fromEmail = searchParams.get('from') === 'email';
  const studentEmail = searchParams.get('studentEmail'); // For email link access

  useEffect(() => {
    const handleSmartRouting = async () => {
      console.log('🎯 Smart Router - Starting intelligent routing', {
        routeType,
        token,
        mode,
        forceBrowser,
        pwaMode,
        showGuide,
        fromEmail,
        studentEmail,
        isInstalled,
        isInstallable
      });
      
      // Enhanced PWA detection debugging
      console.log('🔍 Smart Router - Enhanced PWA detection debug:', {
        'window.matchMedia standalone': window.matchMedia('(display-mode: standalone)').matches,
        'navigator.standalone': (window.navigator as any).standalone,
        'document.referrer': document.referrer,
        'window.location.href': window.location.href,
        'window.location.hostname': window.location.hostname,
        'window.outerHeight - innerHeight': window.outerHeight - window.innerHeight,
        'serviceWorker available': 'serviceWorker' in navigator
      });

      // Handle explicit mode requests first
      if (forceBrowser) {
        setRouteDecision('🖥️ Force Browser Mode');
        const emailParams = studentEmail ? `&studentEmail=${studentEmail}&emailAccess=true` : '';
        const url = routeType === 'assignment' 
          ? `/play?token=${token}&mode=browser&from=email&forceBrowser=true${emailParams}`
          : `/student?mode=browser&from=email&forceBrowser=true${emailParams}`;
        console.log('🖥️ Smart Router - Force browser mode, redirecting to:', url);
        
        // Track analytics
        emailLinkAnalytics.trackEmailLinkClick(
          routeType === 'assignment' ? 'browser-assignment' : 'browser-dashboard',
          { token: token || undefined, userId: undefined }
        );
        
        window.location.href = url;
        return;
      }

      if (pwaMode === 'required') {
        if (isInstalled) {
          setRouteDecision('📱 PWA Required - Opening in App');
          const emailParams = studentEmail ? `&studentEmail=${studentEmail}&emailAccess=true` : '';
          const url = routeType === 'assignment'
            ? `/play?token=${token}&pwa=true&pwa_type=game&from=email${emailParams}`
            : `/student?pwa_type=student&from=email${emailParams}`;
          console.log('📱 Smart Router - PWA required and installed, redirecting to:', url);
          window.location.href = url;
        } else {
          setRouteDecision('📱 PWA Required - Installing First');
          console.log('📱 Smart Router - PWA required but not installed, redirecting to install');
          navigate(`/student?pwa=install&from=email&showGuide=true&returnUrl=${encodeURIComponent(window.location.href)}`);
        }
        return;
      }

      if (showGuide || mode === 'install') {
        if (isInstalled) {
          setRouteDecision('📱 Install Guide - Already Installed');
          console.log('📱 Smart Router - Install requested but already installed');
          navigate('/student?pwa=alreadyInstalled&showGuide=true');
        } else {
          setRouteDecision('📱 Install Guide - Showing Installation');
          console.log('📱 Smart Router - Showing install guide');
          navigate('/student?pwa=install&showGuide=true');
        }
        return;
      }

      // Smart routing logic - detect best option
      await new Promise(resolve => setTimeout(resolve, 2000)); // Allow PWA detection to complete - increased delay

      // Check if currently in PWA mode
      const isCurrentlyInPWA = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone === true ||
                               document.referrer.includes('android-app://');
      
      console.log('🎯 Smart Router - Universal routing (all browser loads get PWA guidance):', {
        'usePWA.isInstalled': isInstalled,
        'isCurrentlyInPWA': isCurrentlyInPWA,
        'routeType': routeType,
        'fromEmail': fromEmail,
        'timing': 'After 2-second delay'
      });

      // Universal approach - route to destination, StudentDashboard will show universal PWA guidance
      if (isInstalled && !isCurrentlyInPWA) {
        // PWA is installed but we're in browser - prefer PWA
        setRouteDecision('🎯 Smart Route - Using Installed PWA');
        const emailParams = studentEmail ? `&studentEmail=${studentEmail}&emailAccess=true` : '';
        const url = routeType === 'assignment'
          ? `/play?token=${token}&pwa=true&pwa_type=game&from=email&emailAccess=true${emailParams}`
          : `/student?pwa_type=student&from=email${emailParams}`;
        console.log('🎯 Smart Router - PWA detected, using PWA route:', url);
        
        // Use launcher for PWA to ensure proper window management
        if (routeType === 'assignment') {
          window.location.href = `/launch.html?target=%2Fplay&token=${token}&pwa=true&from=email`;
        } else {
          window.location.href = url;
        }
      } else {
        // Default browser route - StudentDashboard will show universal PWA guidance
        setRouteDecision('🎯 Smart Route - Using Browser (Universal PWA guidance)');
        const emailParams = studentEmail ? `&studentEmail=${studentEmail}&emailAccess=true` : '';
        const url = routeType === 'assignment'
          ? `/play?token=${token}&from=email&emailAccess=true${emailParams}`
          : `/student?from=email${emailParams}`;
        console.log('🎯 Smart Router - Using browser route with universal PWA guidance:', url);
        window.location.href = url;
      }
    };

    // Add a delay to allow PWA detection to complete
    const timer = setTimeout(() => {
      handleSmartRouting().finally(() => {
        setIsDetecting(false);
      });
    }, 1500); // Increased delay to give PWA detection more time

    return () => clearTimeout(timer);
  }, [routeType, token, mode, forceBrowser, pwaMode, showGuide, fromEmail, isInstalled, isInstallable, navigate]);

  // Show loading state while detecting
  if (isDetecting) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <LoadingSpinner />
        <h2 style={{ marginTop: '20px', color: '#374151' }}>LuminateLearn</h2>
        <p style={{ color: '#6b7280', textAlign: 'center', maxWidth: '400px' }}>
          Detecting your device capabilities and choosing the best way to open your content...
        </p>
        {routeDecision && (
          <p style={{ color: '#059669', fontWeight: 'bold', marginTop: '10px' }}>
            {routeDecision}
          </p>
        )}
        <div style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#4b5563'
        }}>
          <strong>What's happening:</strong>
          <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                          <li>🔍 Checking if LuminateLearn app is installed</li>
            <li>🎯 Selecting the best way to open your content</li>
            <li>🚀 Redirecting to your assignment or dashboard</li>
          </ul>
        </div>
      </div>
    );
  }

  // Fallback UI (shouldn't be reached due to redirects)
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h2 style={{ color: '#374151' }}>Redirecting...</h2>
      <p style={{ color: '#6b7280' }}>
        If you're not redirected automatically, please check your browser settings.
      </p>
      <button
        onClick={() => window.location.href = '/student'}
        style={{
          marginTop: '20px',
          padding: '12px 24px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Go to Student Dashboard
      </button>
    </div>
  );
};

export default SmartRouter; 