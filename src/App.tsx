import { createBrowserRouter, RouterProvider, Navigate, useParams, useRouteError, isRouteErrorResponse, useNavigate, useSearchParams, redirect } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { UnsavedChangesProvider } from './contexts/UnsavedChangesContext'
import { ModalProvider } from './contexts/ModalContext'
import { LoadingProvider } from './contexts/LoadingContext'
import Navbar from './components/Navbar'
import { GlobalModals } from './components/GlobalModals'
import Home from './pages/Home'
import Login from './pages/Login'
import LoginComplete from './pages/LoginComplete'
import ForgotPassword from './pages/ForgotPassword'
import EmailAuthFeedback from './pages/EmailAuthFeedback'
import GamePlayer from './components/GamePlayer'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentDashboard from './pages/StudentDashboard'
import ConfigurationRouter from './pages/configurations/ConfigurationRouter'
import WhackAMoleConfig from './pages/configurations/WhackAMoleConfig'
import SortCategoriesEggConfig from './pages/configurations/SortCategoriesEggConfig'
import GameByToken from './pages/GameByToken'
import AdminPage from './pages/AdminPage'
import SetAdminPage from './pages/SetAdminPage'
import SpinnerWheelConfig from './pages/configurations/SpinnerWheelConfig'
import AnagramConfig from './pages/configurations/AnagramConfig'
import SentenceSenseConfig from './pages/configurations/SentenceSenseConfig'
import PlaceValueShowdownConfig from './pages/configurations/PlaceValueShowdownConfig'
import LinkInterceptor from './components/LinkInterceptor'
import { useEffect } from 'react'
import { usePWANavigation } from './hooks/usePWANavigation'

// Create a layout component that includes the Navbar
const Layout = ({ children }: { children: React.ReactNode }) => {
  // Enable PWA navigation listening
  usePWANavigation();
  
  // Service Worker-based window management for Layout-wrapped routes (like /student from device icons)
  useEffect(() => {
    // Enhanced PWA detection
    const standaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
    const navigatorStandalone = (window.navigator as any).standalone === true;
    const pwaParam = window.location.search.includes('pwa=true');
    const isStudentRoute = window.location.pathname === '/student';
    const isTeacherRoute = window.location.pathname === '/teacher';
    
    console.log('Layout: PWA Detection Details:', {
      standaloneMatch,
      navigatorStandalone, 
      pwaParam,
      isStudentRoute,
      isTeacherRoute,
      pathname: window.location.pathname,
      search: window.location.search
    });
    
    // More inclusive PWA detection - if it's student/teacher route, assume it's PWA
    const isPWA = standaloneMatch || navigatorStandalone || pwaParam || isStudentRoute || isTeacherRoute;
    
    console.log('Layout: Final PWA decision:', isPWA);
    
    if (isPWA) {
      console.log(`Layout: 🎯 Service Worker window management for PWA route: ${window.location.pathname}`);
      
      // Mark this as a device icon launched PWA window
      window.name = 'standalone-pwa';
      const deviceIconOrigin = 'device_icon';
      localStorage.setItem('pwa_origin', deviceIconOrigin);
      console.log('Layout: Marked window as device icon launched PWA');
      console.log('Layout: Verified localStorage pwa_origin:', localStorage.getItem('pwa_origin'));
      
      // Tell service worker to close existing PWA windows when this device icon window opens
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        console.log('Layout: 📢 Requesting closure of existing PWA windows');
        navigator.serviceWorker.controller.postMessage({
          type: 'CLOSE_EXISTING_ASSIGNMENT_WINDOWS',
          token: 'device-icon-window',
          source: 'device-icon',
          path: window.location.pathname,
          timestamp: Date.now()
        });
      }
      
      // Listen for service worker messages
      const handleServiceWorkerMessage = (event: MessageEvent) => {
        console.log('Layout: 🎵 Received service worker message:', event.data);
        
        if (event.data?.type === 'FORCE_CLOSE_LAUNCHER') {
          console.log('Layout: 🔄 Service worker requesting window close');
          
          const storedOrigin = localStorage.getItem('pwa_origin');
          console.log('Layout: Stored origin value:', storedOrigin);
          const wasUserLaunched = storedOrigin === 'device_icon';
          console.log('Layout: Was user launched (device icon):', wasUserLaunched);
          console.log('Layout: Window name:', window.name);
          
          // Additional check using window.name as backup
          const isDeviceIconWindow = wasUserLaunched || window.name === 'standalone-pwa';
          console.log('Layout: Final device icon window determination:', isDeviceIconWindow);
          
          if (isDeviceIconWindow) {
            console.log('Layout: 🚨 Cannot auto-close device icon window, showing user message');
            alert('Please close this tab manually. A newer game window has been launched.');
          } else {
            console.log('Layout: 🔄 Auto-closing JavaScript-opened window');
            window.close();
          }
        }
      };
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        
        // Cleanup function
        return () => {
          navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
        };
      }
    } else {
      console.log('Layout: Not a PWA context, skipping window management');
    }
  }, []);
  
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

// Redirect component for old assignment URLs - updated to use loader-based redirect
const assignmentLoader = ({ params }: { params: { token?: string } }) => {
  if (!params.token) {
    return redirect('/');
  }
  return redirect(`/play?token=${params.token}`);
};

// Improved Error Boundary Component with better error handling
function ErrorBoundary() {
  const error = useRouteError();
  const params = useParams();
  const token = params.token;
  const navigate = useNavigate();
  
  // Safe way to extract error message
  const getErrorDetails = () => {
    try {
      if (isRouteErrorResponse(error)) {
        // Check for specific "No route matches URL" error
        if (error.status === 404 && error.data && typeof error.data === 'string' && error.data.includes('No route matches URL')) {
          const urlMatch = error.data.match(/URL "([^"]+)"/);
          const path = urlMatch ? urlMatch[1] : 'unknown path';
          
          console.log(`Route error: No route matches URL "${path}"`);
          
          // Extract token from path if it's a play or assignment route
          let extractedToken = '';
          if (path.startsWith('/play/')) {
            extractedToken = path.replace('/play/', '');
          } else if (path.startsWith('/assignment/')) {
            extractedToken = path.replace('/assignment/', '');
          }
          
          return {
            message: `Page not found: ${path}`,
            details: `The requested page does not exist. ${extractedToken ? `Token: ${extractedToken}` : ''}`,
            isRouteNotFound: true,
            extractedToken
          };
        }
        
        return {
          message: `${error.status} ${error.statusText}`,
          details: error.data?.message || 'No additional details available',
          isRouteNotFound: error.status === 404
        };
      }
      if (error instanceof Error) {
        return {
          message: error.message || 'Unknown error',
          details: error.stack || 'No stack trace available',
          isRouteNotFound: error.message.includes('No route matches URL')
        };
      }
      return {
        message: 'Unknown error type',
        details: String(error) || JSON.stringify(error, null, 2),
        isRouteNotFound: false
      };
    } catch (e) {
      return {
        message: 'Error while processing the error details',
        details: String(e),
        isRouteNotFound: false
      };
    }
  };

  const errorInfo = getErrorDetails();
  console.error("Route error:", errorInfo.message, error);
  
  // Error recovery
  useEffect(() => {
    try {
      const errorMessage = errorInfo.message;
      
      // Check for stored token from direct navigation
      const tokenFromStorage = sessionStorage.getItem('route_token');
      
      // Handle direct navigation errors
      if (errorInfo.isRouteNotFound && tokenFromStorage) {
        console.log(`Detected direct navigation with stored token: ${tokenFromStorage}`);
        
        // Clear stored navigation data
        sessionStorage.removeItem('route_token');
        sessionStorage.removeItem('route_path');
        
        // Navigate to the correct route with query parameter
        const timer = setTimeout(() => {
          navigate(`/play?token=${tokenFromStorage}`);
        }, 100);
        
        return () => clearTimeout(timer);
      }
      
      // Handle React Router errors
      if (
        (errorMessage.includes("handled by React Router default ErrorBoundary") || 
         errorMessage.includes("Minified React error #419") ||
         errorMessage.includes("Minified React error #421")) &&
        !sessionStorage.getItem('errorRefreshed')
      ) {
        console.log("Detected React Router error, refreshing page...");
        sessionStorage.setItem('errorRefreshed', 'true');
        window.location.reload();
        return;
      }
      
      // For route not found errors with extracted token
      if (errorInfo.isRouteNotFound && errorInfo.extractedToken) {
        console.log(`Attempting to redirect with token: ${errorInfo.extractedToken}`);
        // Wait a moment before redirecting to avoid potential loops
        const timer = setTimeout(() => {
          navigate(`/play?token=${errorInfo.extractedToken}`);
        }, 100);
        
        return () => clearTimeout(timer);
      }
      
      // Clear the refresh flag if we're on a different route
      const currentPath = window.location.pathname;
      const errorPathStored = sessionStorage.getItem('errorPath');
      
      if (errorPathStored && errorPathStored !== currentPath) {
        sessionStorage.removeItem('errorRefreshed');
      }
      
      sessionStorage.setItem('errorPath', currentPath);
    } catch (e) {
      console.error("Error in ErrorBoundary useEffect:", e);
    }
  }, [errorInfo.message, navigate, errorInfo.isRouteNotFound, errorInfo.extractedToken]);
  
  // For route not found errors, display a special message
  if (errorInfo.isRouteNotFound) {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '40px 20px',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <h1 style={{ 
          fontSize: '24px', 
          marginBottom: '20px',
          color: '#333'
        }}>
          Page Not Found
        </h1>
        <p style={{ 
          fontSize: '16px',
          color: '#666',
          marginBottom: '30px'
        }}>
          The page you're looking for doesn't exist.
          {errorInfo.extractedToken && ` We're trying to redirect you to the correct page...`}
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#2563eb',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          Go to Home
        </a>
        
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            marginTop: '40px', 
            padding: '20px', 
            background: '#f7f7f7', 
            borderRadius: '4px',
            textAlign: 'left',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Error Details</summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
                {(() => {
                  try {
                    return `Error: ${errorInfo.message}\n\nDetails: ${errorInfo.details}`;
                  } catch (e) {
                    return "Could not render error details";
                  }
                })()}
              </pre>
            </details>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '40px 20px',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '24px', 
        marginBottom: '20px',
        color: '#333'
      }}>
        Game not found
      </h1>
      <p style={{ 
        fontSize: '16px',
        color: '#666',
        marginBottom: '30px'
      }}>
        {token 
          ? "We couldn't find this assignment. It may have been deleted or the link is incorrect."
          : "The game or assignment you're looking for doesn't exist or may have been deleted."
        }
      </p>
      <a
        href="/"
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          background: '#2563eb',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          fontWeight: 'bold'
        }}
      >
        Go to Home
      </a>
      
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          marginTop: '40px', 
          padding: '20px', 
          background: '#f7f7f7', 
          borderRadius: '4px',
          textAlign: 'left',
          fontFamily: 'monospace',
          fontSize: '14px'
        }}>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Error Details</summary>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
              {(() => {
                try {
                  return `Error: ${errorInfo.message}\n\nDetails: ${errorInfo.details}`;
                } catch (e) {
                  return "Could not render error details";
                }
              })()}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout><Home /></Layout>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/login",
    element: <Layout><Login /></Layout>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/login-complete",
    element: <Layout><LoginComplete /></Layout>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/feedback",
    element: <Layout><EmailAuthFeedback /></Layout>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/forgot-password",
    element: <Layout><ForgotPassword /></Layout>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/game/:configId",
    element: <Layout><GamePlayer /></Layout>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/teacher",
    element: <Layout><TeacherDashboard /></Layout>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/student",
    element: <Layout><StudentDashboard /></Layout>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/link",
    element: <LinkInterceptor />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/play",
    element: <GameByToken />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/play/:token",
    loader: ({ params }) => redirect(`/play?token=${params.token}`),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/assignment/:token",
    loader: assignmentLoader,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/assignment",
    element: <Navigate to="/" replace />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/configure",
    element: <Layout><ConfigurationRouter /></Layout>,
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: "whack-a-mole",
        element: <WhackAMoleConfig />
      },
      {
        path: "whack-a-mole/:templateId",
        element: <WhackAMoleConfig />
      },
      {
        path: "sort-categories-egg",
        element: <SortCategoriesEggConfig />
      },
      {
        path: "sort-categories-egg/:templateId",
        element: <SortCategoriesEggConfig />
      },
      {
        path: "spinner-wheel",
        element: <SpinnerWheelConfig />
      },
      {
        path: "spinner-wheel/:templateId",
        element: <SpinnerWheelConfig />
      },
      {
        path: "anagram",
        element: <AnagramConfig />
      },
      {
        path: "anagram/:templateId",
        element: <AnagramConfig />
      },
      {
        path: "sentence-sense",
        element: <SentenceSenseConfig />
      },
      {
        path: "sentence-sense/:templateId",
        element: <SentenceSenseConfig />
      },
      {
        path: "place-value-showdown",
        element: <PlaceValueShowdownConfig />
      },
      {
        path: "place-value-showdown/:templateId",
        element: <PlaceValueShowdownConfig />
      }
      // Additional game configuration routes will be added here
    ]
  },
  {
    path: "/admin",
    element: <Layout><AdminPage /></Layout>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/set-admin",
    element: <Layout><SetAdminPage /></Layout>,
    errorElement: <ErrorBoundary />,
  },
  // Add a catch-all route that will handle any undefined paths
  {
    path: "*",
    element: <Navigate to="/" replace />,
    errorElement: <ErrorBoundary />,
  }
]);

function App() {
  return (
    <AuthProvider>
      <UnsavedChangesProvider>
        <ModalProvider>
          <LoadingProvider>
            <RouterProvider router={router} />
            <GlobalModals />
          </LoadingProvider>
        </ModalProvider>
      </UnsavedChangesProvider>
    </AuthProvider>
  )
}

export default App
