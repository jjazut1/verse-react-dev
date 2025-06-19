import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const LinkInterceptor: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'detecting' | 'redirecting' | 'fallback'>('detecting');

  useEffect(() => {
    const handleRedirect = async () => {
      const urlParams = new URLSearchParams(location.search);
      const targetPath = urlParams.get('target');
      const token = urlParams.get('token');
      const pwa = urlParams.get('pwa');

      // If no target specified, go to student dashboard
      if (!targetPath) {
        navigate('/student');
        return;
      }

      setStatus('redirecting');

      // Try to detect if we're in a PWA context
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone ||
                    document.referrer.includes('android-app://');

      // Attempt to use the custom protocol for PWA
      if (!isPWA && 'serviceWorker' in navigator) {
        try {
          // Try custom protocol first
          if (token) {
            const protocolUrl = `web+lumino://play?token=${token}`;
            window.location.href = protocolUrl;
            
            // Wait a moment to see if protocol handler worked
            setTimeout(() => {
              // If we're still here, protocol didn't work, use fallback
              setStatus('fallback');
              redirectToTarget(targetPath, token, pwa);
            }, 1000);
            return;
          }
        } catch (error) {
          console.log('Protocol handler not available, using fallback');
        }
      }

      // Direct redirect if in PWA or protocol failed
      redirectToTarget(targetPath, token, pwa);
    };

    const redirectToTarget = (targetPath: string, token?: string | null, pwa?: string | null) => {
      let finalPath = targetPath;
      
      if (token) {
        finalPath += `?token=${token}`;
      }
      
      if (pwa) {
        finalPath += token ? `&pwa=${pwa}` : `?pwa=${pwa}`;
      }

      // Use navigate for internal routing
      if (targetPath.startsWith('/')) {
        navigate(finalPath);
      } else {
        // External redirect
        window.location.href = finalPath;
      }
    };

    handleRedirect();
  }, [location, navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '15px',
        padding: '30px',
        backdropFilter: 'blur(10px)',
        maxWidth: '400px'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px'
        }}>
          📱
        </div>
        
        <h2 style={{ marginBottom: '15px' }}>
          {status === 'detecting' && 'Opening Lumino Learning...'}
          {status === 'redirecting' && 'Launching App...'}
          {status === 'fallback' && 'Redirecting...'}
        </h2>
        
        <p style={{ opacity: 0.9, lineHeight: 1.5 }}>
          {status === 'detecting' && 'Detecting the best way to open your assignment...'}
          {status === 'redirecting' && 'Attempting to open in the Lumino Learning app...'}
          {status === 'fallback' && 'Opening in your browser...'}
        </p>

        <div style={{
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default LinkInterceptor; 