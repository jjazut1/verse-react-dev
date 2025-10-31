import { Link as RouterLink } from 'react-router-dom';

const Footer = () => {
  return (
    <footer style={{
      backgroundColor: '#2D3748', // var(--color-gray-700)
      color: '#E2E8F0', // var(--color-gray-200)
      width: '100%',
      marginTop: 'auto'
    }}>
      {/* Main Footer Content */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: 'var(--spacing-16) var(--spacing-4)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 'var(--spacing-8)',
      }}>
        {/* Brand Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-3)'
        }}>
          <h2 style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'bold',
            margin: 0,
            color: '#FFFFFF'
          }}>
            LuminateLearn
          </h2>
          <p style={{
            fontSize: 'var(--font-size-md)',
            margin: 0,
            lineHeight: '1.6',
            color: '#CBD5E0', // var(--color-gray-300)
            maxWidth: '300px'
          }}>
            Create Efficiently. Spark Curiosity. Shape Minds.
          </p>
        </div>

        {/* Quick Links Column */}
        <div>
          <h3 style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: '600',
            marginBottom: 'var(--spacing-4)',
            color: '#FFFFFF'
          }}>
            Quick Links
          </h3>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-2)'
          }}>
            <li>
              <RouterLink
                to="/"
                style={{
                  color: '#E2E8F0',
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-md)',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#90CDF4'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#E2E8F0'}
              >
                Start Here
              </RouterLink>
            </li>
            <li>
              <a
                href="mailto:support@luminatelearn.com?subject=About LuminateLearn"
                style={{
                  color: '#E2E8F0',
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-md)',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#90CDF4'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#E2E8F0'}
              >
                About
              </a>
            </li>
            <li>
              <a
                href="mailto:support@luminatelearn.com"
                style={{
                  color: '#E2E8F0',
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-md)',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#90CDF4'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#E2E8F0'}
              >
                Contact Us
              </a>
            </li>
          </ul>
        </div>

        {/* Resources Column */}
        <div>
          <h3 style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: '600',
            marginBottom: 'var(--spacing-4)',
            color: '#FFFFFF'
          }}>
            Resources
          </h3>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-2)'
          }}>
            <li>
              <a
                href="#ios-app"
                style={{
                  color: '#E2E8F0',
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-md)',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#90CDF4'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#E2E8F0'}
                onClick={(e) => e.preventDefault()}
              >
                iOS App Download
              </a>
            </li>
            <li>
              <a
                href="#android-app"
                style={{
                  color: '#E2E8F0',
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-md)',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#90CDF4'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#E2E8F0'}
                onClick={(e) => e.preventDefault()}
              >
                Android App Download
              </a>
            </li>
          </ul>
        </div>

        {/* Support Column */}
        <div>
          <h3 style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: '600',
            marginBottom: 'var(--spacing-4)',
            color: '#FFFFFF'
          }}>
            Support
          </h3>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-2)'
          }}>
            <li>
              <a
                href="mailto:support@luminatelearn.com"
                style={{
                  color: '#E2E8F0',
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-md)',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#90CDF4'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#E2E8F0'}
              >
                support@luminatelearn.com
              </a>
            </li>
            <li>
              <RouterLink
                to="/privacy-policy"
                style={{
                  color: '#E2E8F0',
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-md)',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#90CDF4'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#E2E8F0'}
              >
                Privacy Policy
              </RouterLink>
            </li>
            <li>
              <RouterLink
                to="/terms-of-service"
                style={{
                  color: '#E2E8F0',
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-md)',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#90CDF4'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#E2E8F0'}
              >
                Terms of Service
              </RouterLink>
            </li>
            <li>
              <RouterLink
                to="/data-deletion"
                style={{
                  color: '#E2E8F0',
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-md)',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#90CDF4'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#E2E8F0'}
              >
                Data Deletion
              </RouterLink>
            </li>
            <li>
              <RouterLink
                to="/cookie-settings"
                style={{
                  color: '#E2E8F0',
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-md)',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#90CDF4'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#E2E8F0'}
              >
                Cookie Settings
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright Section */}
      <div style={{
        borderTop: '1px solid #4A5568', // var(--color-gray-600)
        padding: 'var(--spacing-6) var(--spacing-4)',
        textAlign: 'center'
      }}>
        <p style={{
          margin: 0,
          fontSize: 'var(--font-size-sm)',
          color: '#A0AEC0' // var(--color-gray-400)
        }}>
          © {new Date().getFullYear()} LuminateLearn. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
