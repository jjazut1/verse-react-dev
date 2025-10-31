import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CookieSettings = () => {
  const [currentSetting, setCurrentSetting] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    setCurrentSetting(consent);
  }, []);

  const handleUpdateConsent = (choice: 'accepted' | 'denied') => {
    localStorage.setItem('cookieConsent', choice);
    setCurrentSetting(choice);
  };

  const handleClearConsent = () => {
    localStorage.removeItem('cookieConsent');
    setCurrentSetting(null);
    // Redirect to home to show the banner again
    setTimeout(() => {
      navigate('/');
      window.location.reload();
    }, 1000);
  };

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: 'var(--spacing-8) var(--spacing-4)',
      backgroundColor: 'white',
      minHeight: '100vh'
    }}>
      <h1 style={{
        fontSize: 'var(--font-size-4xl)',
        fontWeight: 'bold',
        marginBottom: 'var(--spacing-6)',
        color: 'var(--color-gray-900)'
      }}>
        Cookie Settings
      </h1>

      <section style={{ marginBottom: 'var(--spacing-8)' }}>
        <h2 style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: '600',
          marginBottom: 'var(--spacing-4)',
          color: 'var(--color-gray-800)'
        }}>
          About Cookies
        </h2>
        <p style={{
          fontSize: 'var(--font-size-md)',
          lineHeight: '1.6',
          color: 'var(--color-gray-700)',
          marginBottom: 'var(--spacing-3)'
        }}>
          LuminateLearn uses cookies to enhance your experience on our platform. Cookies help us remember your preferences, keep you logged in, and understand how you use our educational games and tools.
        </p>
        <p style={{
          fontSize: 'var(--font-size-md)',
          lineHeight: '1.6',
          color: 'var(--color-gray-700)'
        }}>
          We respect your privacy and give you control over how we use cookies. You can accept or deny cookies at any time.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--spacing-8)' }}>
        <h2 style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: '600',
          marginBottom: 'var(--spacing-4)',
          color: 'var(--color-gray-800)'
        }}>
          Current Setting
        </h2>
        <div style={{
          backgroundColor: currentSetting === 'accepted' 
            ? 'var(--color-green-50)' 
            : currentSetting === 'denied' 
            ? 'var(--color-red-50)' 
            : 'var(--color-gray-50)',
          padding: 'var(--spacing-4)',
          borderRadius: 'var(--border-radius-lg)',
          marginBottom: 'var(--spacing-4)'
        }}>
          <p style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: '600',
            marginBottom: 'var(--spacing-2)',
            color: 'var(--color-gray-800)'
          }}>
            {currentSetting === 'accepted' 
              ? '✓ Cookies Accepted' 
              : currentSetting === 'denied' 
              ? '✗ Cookies Denied' 
              : 'No Cookie Preference Set'}
          </p>
          <p style={{
            fontSize: 'var(--font-size-md)',
            margin: 0,
            color: 'var(--color-gray-700)'
          }}>
            {currentSetting === 'accepted' 
              ? 'You have accepted cookies. This helps us provide a better experience.' 
              : currentSetting === 'denied' 
              ? 'You have denied cookies. Some features may be limited.' 
              : 'You have not made a choice yet.'}
          </p>
        </div>
      </section>

      <section style={{ marginBottom: 'var(--spacing-8)' }}>
        <h2 style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: '600',
          marginBottom: 'var(--spacing-4)',
          color: 'var(--color-gray-800)'
        }}>
          Types of Cookies We Use
        </h2>
        
        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          <h3 style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: '600',
            marginBottom: 'var(--spacing-2)',
            color: 'var(--color-gray-800)'
          }}>
            Essential Cookies (Always Active)
          </h3>
          <p style={{
            fontSize: 'var(--font-size-md)',
            lineHeight: '1.6',
            color: 'var(--color-gray-700)'
          }}>
            These cookies are necessary for the platform to function properly. They enable core features like authentication, security, and game progress saving. These cookies cannot be disabled.
          </p>
        </div>

        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          <h3 style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: '600',
            marginBottom: 'var(--spacing-2)',
            color: 'var(--color-gray-800)'
          }}>
            Preference Cookies
          </h3>
          <p style={{
            fontSize: 'var(--font-size-md)',
            lineHeight: '1.6',
            color: 'var(--color-gray-700)'
          }}>
            These cookies remember your preferences and settings, such as language preferences and display options, to provide a more personalized experience.
          </p>
        </div>

        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          <h3 style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: '600',
            marginBottom: 'var(--spacing-2)',
            color: 'var(--color-gray-800)'
          }}>
            Analytics Cookies
          </h3>
          <p style={{
            fontSize: 'var(--font-size-md)',
            lineHeight: '1.6',
            color: 'var(--color-gray-700)'
          }}>
            These cookies help us understand how users interact with our platform. This information helps us improve our educational games and features. All data is anonymized.
          </p>
        </div>
      </section>

      <section style={{ marginBottom: 'var(--spacing-8)' }}>
        <h2 style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: '600',
          marginBottom: 'var(--spacing-4)',
          color: 'var(--color-gray-800)'
        }}>
          Manage Your Preferences
        </h2>
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-3)',
          marginBottom: 'var(--spacing-4)',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => handleUpdateConsent('accepted')}
            style={{
              padding: 'var(--spacing-3) var(--spacing-6)',
              fontSize: 'var(--font-size-md)',
              fontWeight: '600',
              backgroundColor: currentSetting === 'accepted' ? '#2F855A' : '#38A169',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2F855A'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = currentSetting === 'accepted' ? '#2F855A' : '#38A169'}
          >
            {currentSetting === 'accepted' ? '✓ Cookies Accepted' : 'Accept Cookies'}
          </button>
          
          <button
            onClick={() => handleUpdateConsent('denied')}
            style={{
              padding: 'var(--spacing-3) var(--spacing-6)',
              fontSize: 'var(--font-size-md)',
              fontWeight: '600',
              backgroundColor: currentSetting === 'denied' ? '#C53030' : '#E53E3E',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C53030'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = currentSetting === 'denied' ? '#C53030' : '#E53E3E'}
          >
            {currentSetting === 'denied' ? '✓ Cookies Denied' : 'Deny Cookies'}
          </button>

          <button
            onClick={handleClearConsent}
            style={{
              padding: 'var(--spacing-3) var(--spacing-6)',
              fontSize: 'var(--font-size-md)',
              fontWeight: '600',
              backgroundColor: 'transparent',
              color: 'var(--color-gray-700)',
              border: '2px solid var(--color-gray-400)',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-gray-100)';
              e.currentTarget.style.borderColor = 'var(--color-gray-500)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'var(--color-gray-400)';
            }}
          >
            Reset & Show Banner
          </button>
        </div>
        <p style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-gray-600)',
          fontStyle: 'italic'
        }}>
          Your choice will be saved and applied immediately. The "Reset & Show Banner" option will clear your preference and show the cookie consent banner again on the home page.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--spacing-8)' }}>
        <h2 style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: '600',
          marginBottom: 'var(--spacing-4)',
          color: 'var(--color-gray-800)'
        }}>
          More Information
        </h2>
        <p style={{
          fontSize: 'var(--font-size-md)',
          lineHeight: '1.6',
          color: 'var(--color-gray-700)'
        }}>
          For more detailed information about how we use cookies and protect your privacy, please review our{' '}
          <a href="/privacy-policy" style={{ color: 'var(--color-primary-600)', textDecoration: 'underline' }}>Privacy Policy</a>
          {' '}and{' '}
          <a href="/terms-of-service" style={{ color: 'var(--color-primary-600)', textDecoration: 'underline' }}>Terms of Service</a>.
        </p>
      </section>
    </div>
  );
};

export default CookieSettings;




