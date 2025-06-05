import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "",
  size = 'medium',
  fullScreen = false
}) => {
  const sizeMap = {
    small: { logo: '40px', text: '14px' },
    medium: { logo: '80px', text: '18px' },
    large: { logo: '120px', text: '24px' }
  };

  const currentSize = sizeMap[size];

  const containerStyle: React.CSSProperties = fullScreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px'
  };

  return (
    <div style={containerStyle}>
      {/* Animated Logo Container */}
      <div style={{
        position: 'relative',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Pulsing background circle */}
        <div style={{
          position: 'absolute',
          width: currentSize.logo,
          height: currentSize.logo,
          backgroundColor: '#EBF8FF',
          borderRadius: '50%',
          animation: 'pulse 2s ease-in-out infinite',
          zIndex: 2
        }} />
        
        {/* App Logo */}
        <img 
          src="/android-chrome-192x192.png" 
          alt="Loading..." 
          style={{
            width: currentSize.logo,
            height: currentSize.logo,
            borderRadius: '50%',
            animation: 'bounce 1.5s ease-in-out infinite',
            zIndex: 3,
            position: 'relative'
          }}
        />
      </div>

      {/* Progress dots */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginTop: '16px'
      }}>
        {[0, 1, 2].map(index => (
          <div
            key={index}
            style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#4299E1',
              borderRadius: '50%',
              animation: `dotBounce 1.4s ease-in-out infinite ${index * 0.2}s`
            }}
          />
        ))}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate(0, 0) scale(1);
          }
          40%, 43% {
            transform: translate(0, -8px) scale(1.1);
          }
          70% {
            transform: translate(0, -4px) scale(1.05);
          }
          90% {
            transform: translate(0, -2px) scale(1.02);
          }
        }
        
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
          100% {
            transform: scale(0.95);
            opacity: 0.7;
          }
        }
        
        @keyframes dotBounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner; 