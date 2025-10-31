import { useState, useEffect } from 'react';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowBanner(false);
  };

  const handleDeny = () => {
    localStorage.setItem('cookieConsent', 'denied');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#2D3748', // Dark background matching footer
      color: '#E2E8F0',
      padding: 'var(--spacing-4)',
      boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.3)',
      zIndex: 9999,
      borderTop: '1px solid #4A5568'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--spacing-4)',
        flexWrap: 'wrap'
      }}>
        {/* Message */}
        <div style={{
          flex: '1',
          minWidth: '300px',
          fontSize: 'var(--font-size-md)',
          lineHeight: '1.6'
        }}>
          <p style={{ margin: 0 }}>
            Your privacy is important to us. LuminateLearn collects cookies to remember your preferences and optimize your experience when you visit our website. For more information, please visit our{' '}
            <a 
              href="/terms-of-service"
              style={{
                color: '#90CDF4',
                textDecoration: 'underline',
                fontWeight: '500'
              }}
            >
              Terms of Use
            </a>
            {' '}and our{' '}
            <a 
              href="/privacy-policy"
              style={{
                color: '#90CDF4',
                textDecoration: 'underline',
                fontWeight: '500'
              }}
            >
              Privacy Policy
            </a>.
          </p>
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-3)',
          alignItems: 'center'
        }}>
          <button
            onClick={handleDeny}
            style={{
              padding: 'var(--spacing-2) var(--spacing-4)',
              fontSize: 'var(--font-size-md)',
              fontWeight: '500',
              backgroundColor: 'transparent',
              color: '#E2E8F0',
              border: '2px solid #4A5568',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4A5568';
              e.currentTarget.style.borderColor = '#718096';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#4A5568';
            }}
          >
            Deny
          </button>
          <button
            onClick={handleAccept}
            style={{
              padding: 'var(--spacing-2) var(--spacing-4)',
              fontSize: 'var(--font-size-md)',
              fontWeight: '500',
              backgroundColor: '#3182CE',
              color: 'white',
              border: '2px solid #3182CE',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2C5282';
              e.currentTarget.style.borderColor = '#2C5282';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3182CE';
              e.currentTarget.style.borderColor = '#3182CE';
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

