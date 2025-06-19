import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { updateAssignment, createAttempt, getAssignmentByToken } from '../services/assignmentService';
import { getDoc, doc, Timestamp, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { usePWA } from '../hooks/usePWA';
import { usePWANavigation } from '../hooks/usePWANavigation';
import { usePWAMessageAck } from '../hooks/usePWAMessageAck';
import { Assignment } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

// Game components (import as needed)
import SentenceSenseAdapter from '../components/games/sentence-sense/SentenceSenseAdapter';
import PlaceValueShowdownAdapter from '../components/games/place-value-showdown/PlaceValueShowdownAdapter';
import WhackAMoleAdapter from '../components/games/whack-a-mole/WhackAMoleAdapter';
import SpinnerWheel from '../components/games/spinner-wheel/SpinnerWheel';
import SortCategoriesEggRevealAdapter from '../components/games/sort-categories-egg-reveal/SortCategoriesEggRevealAdapter';
import AnagramAdapter from '../components/games/anagram/AnagramAdapter';


interface Props {}

const GameByToken: React.FC<Props> = () => {
  // Enable PWA navigation listening for assignment focus behavior
  usePWANavigation();
  
  // CRITICAL: Enable dedicated PWA message ACK handler
  usePWAMessageAck();
  
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser: authContextUser } = useAuth(); // Rename to avoid conflict
  const { isInstalled } = usePWA(); // Add PWA detection
  
  // Special flag for email link access which skips authentication
  const [isEmailLinkAccess, setIsEmailLinkAccess] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameConfig, setGameConfig] = useState<any | null>(null);
  const [assignment, setAssignment] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentNameSubmitted, setStudentNameSubmitted] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Authentication state
  const [authEmail, setAuthEmail] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  
  // Add a state to track if reload is needed after high score modal
  const [pendingReload, setPendingReload] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [isHighScoreProcessing, setIsHighScoreProcessing] = useState(false);
  
  // Check authentication status on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Check for direct access mode
      const isDirectAccess = isEmailLinkAccess || 
                            sessionStorage.getItem('direct_token_access') === 'true' || 
                            searchParams.get('directAccess') === 'true';
                            
      // If direct access, always set as authenticated regardless of Firebase auth state
      if (isDirectAccess) {
        setIsAuthenticated(true);
        console.log('Authentication state overridden for direct access:', { authenticated: true });
        
        // Create a minimal user object if none exists
        if (!user && assignment) {
          const syntheticUser = {
            email: assignment.studentEmail || 'student@example.com',
            displayName: assignment.studentName || 'Student'
          };
          setCurrentUser(syntheticUser);
          console.log('Created synthetic user for direct access:', syntheticUser);
        } else {
          setCurrentUser(user);
        }
      } else {
        // Normal authentication flow
        setIsAuthenticated(!!user);
        setCurrentUser(user);
        console.log('Authentication state changed:', { authenticated: !!user, email: user?.email });
      }
      
      // Close the auth form if the user is now authenticated
      if (user || isDirectAccess) {
        setShowAuthForm(false);
      }
    });
    
    return () => unsubscribe();
  }, [isEmailLinkAccess, assignment, searchParams]);
  
  // Enhanced email link and PWA launcher parameter detection
  useEffect(() => {
    // Check if we came from an email link or direct token access route
    const currentUrl = window.location.href;
    const referrer = document.referrer;
    const hasOobCodeInReferrer = referrer.includes('oobCode=');
    const hasOobCodeInUrl = currentUrl.includes('oobCode=') || searchParams.get('oobCode');
    const hasAssignmentId = referrer.includes('assignmentId=') || searchParams.get('assignmentId');
    const hasModeSignIn = currentUrl.includes('mode=signIn') || searchParams.get('mode') === 'signIn';
    
    // Check direct token access from Login.tsx
    const directAccessParam = searchParams.get('directAccess');
    const hasDirectAccess = directAccessParam === 'true' || sessionStorage.getItem('direct_token_access') === 'true';
    
    // Check for requireAuth parameter (used in email links)
    const requireAuthParam = searchParams.get('requireAuth');
    const hasRequireAuth = requireAuthParam === 'true';
    
    // Enhanced PWA launcher detection with type identification
    const fromLauncher = searchParams.get('from') === 'launcher';
    const emailAccess = searchParams.get('emailAccess') === 'true';
    const pwaParam = searchParams.get('pwa') === 'true';
    const pwaType = searchParams.get('pwa_type'); // 'game', 'student', 'launcher'
    
    // Log all parameters to debug the detection
    console.log('GameByToken: Enhanced access mode detection:', {
      hasOobCodeInReferrer, 
      hasOobCodeInUrl, 
      hasAssignmentId, 
      hasModeSignIn,
      directAccessParam,
      hasDirectAccess,
      requireAuthParam,
      hasRequireAuth,
      fromLauncher,
      emailAccess,
      pwaParam,
      pwaType,
      referrer,
      tokenValue: token
    });
    
    // Enhanced condition checking for email link access
    if ((hasOobCodeInReferrer || hasOobCodeInUrl) || 
        (hasAssignmentId) || 
        (hasModeSignIn) ||
        (hasDirectAccess) ||
        (hasRequireAuth) ||
        (fromLauncher && emailAccess) ||
        (pwaParam && token) ||
        (pwaType === 'game' && token)) {
      console.log('GameByToken: ✅ Enhanced special access mode detected - enabling email link access');
      setIsEmailLinkAccess(true);
      
      // Store flag in session storage to persist across page reloads
      sessionStorage.setItem('direct_token_access', 'true');
    }
    
    // Check for existing PWA window if this is from email (separate from the above conditions)
    const fromEmail = searchParams.get('from') === 'email';
    console.log('GameByToken: Email check debug:', {
      fromEmail,
      token,
      fromParam: searchParams.get('from'),
      allParams: Object.fromEntries(searchParams.entries())
    });
    
    // Service Worker-based window management - listen for close messages
    console.log(`GameByToken: 🎯 Service Worker window management enabled`);
    console.log('GameByToken: Source details:', { fromEmail, token, pwaType, fromParam: searchParams.get('from') });
    
    // Mark this as an email/JavaScript launched window (can be auto-closed)
    window.name = 'assignment-window';
    localStorage.setItem('pwa_origin', fromEmail ? 'email_link' : 'javascript');
    console.log('GameByToken: Marked window as email/JS launched (auto-closeable)');
    
    // Tell service worker to close existing assignment windows
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLOSE_EXISTING_ASSIGNMENT_WINDOWS',
        token: token,
        timestamp: Date.now()
      });
    }
    
    // Listen for service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('GameByToken: 🎵 Received service worker message:', event.data);
      
      if (event.data?.type === 'FORCE_CLOSE_LAUNCHER') {
        console.log('GameByToken: 🔄 Service worker requesting window close');
        
        const wasUserLaunched = localStorage.getItem('pwa_origin') === 'device_icon';
        console.log('GameByToken: Was user launched (device icon):', wasUserLaunched);
        
        if (wasUserLaunched) {
          console.log('GameByToken: 🚨 Cannot auto-close device icon window, showing user message');
          alert('Please close this tab manually. A newer game window has been launched.');
        } else {
          console.log('GameByToken: 🔄 Auto-closing email/JS-opened window');
          window.close();
        }
      }
      
      if (event.data?.type === 'NAVIGATE_TO_ASSIGNMENT') {
        console.log('GameByToken: 🔄 Service worker requesting navigation');
        // Handle navigation if needed
      }
    };
    
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    
    // Cleanup function
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
    
    // Additional token check - if token is in URL directly from email link
    const urlParams = new URLSearchParams(window.location.search);
    const oobCode = urlParams.get('oobCode');
    const emailParam = urlParams.get('email');
    const modeParam = urlParams.get('mode');
    
    if (oobCode || (emailParam && token) || (modeParam === 'signIn')) {
      console.log('GameByToken: Email link parameters detected in URL, skipping authentication requirement');
      setIsEmailLinkAccess(true);
      
      // Store email for potential use later
      if (emailParam) {
        setAuthEmail(emailParam);
      }
    }
  }, [searchParams, token]);

  // Listen for close messages from service worker (DISABLED - using PWA type-based management)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      // New approach: Service worker only manages launchers, not game windows
      // Game windows manage themselves through BroadcastChannel
      
      // Log service worker messages for debugging
      if (event.data && event.data.type) {
        console.log('GameByToken: Received service worker message:', event.data.type, event.data);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [token]);

  // Removed complex service worker window management - now using simple BroadcastChannel approach
  
  useEffect(() => {
    // Validate token parameter
    if (!token) {
      console.error("GameByToken: Missing token parameter");
      setError("Invalid game link. Please check the URL and try again.");
      setLoading(false);
      return;
    }
    console.log("GameByToken: Processing token", token);
    
    // Check if the URL is a sign-in link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      // Get the email from localStorage - we stored it when we sent the link
      let email = window.localStorage.getItem('emailForSignIn');
      
      // If we don't have the email, ask for it
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      
      if (email) {
        setIsAuthenticating(true);
        // Sign in with the email link
        signInWithEmailLink(auth, email, window.location.href)
          .then((result) => {
            // Clear the email from storage
            window.localStorage.removeItem('emailForSignIn');
            // Continue loading the game
            setIsAuthenticated(true);
            setCurrentUser(result.user);
            console.log('Successfully authenticated via email link:', { email: result.user?.email });
            loadGameAndAssignment(token);
            setIsAuthenticating(false);
          })
          .catch((error) => {
            console.error('Error signing in with email link:', error);
            setError('Failed to authenticate. Please try accessing the game from your email again.');
            setIsAuthenticating(false);
          });
      }
    } else {
      // Not a sign-in link, just load the game
      // but we'll check authentication status later before saving progress
      loadGameAndAssignment(token);
    }
  }, [token]);
  
  // Add a new effect to show authentication form immediately if user is not authenticated
  useEffect(() => {
    // Once the game config and assignment are loaded and we know the user isn't authenticated
    if (!loading && gameConfig && assignment && !isAuthenticated && !currentUser) {
      // If this is a direct email link access, don't require authentication
      if (isEmailLinkAccess) {
        console.log('Skipping authentication requirement for email link access');
        return;
      }
      
      // Show the authentication form right away
      if (assignment.studentEmail) {
        setAuthEmail(assignment.studentEmail);
        console.log('Pre-filling auth email for immediate authentication:', assignment.studentEmail);
      }
      
      // Only show the form if we're not already in the process of authenticating
      if (!isAuthenticating && !showAuthForm) {
        console.log('Showing authentication form immediately');
        setShowAuthForm(true);
      }
    }
  }, [loading, gameConfig, assignment, isAuthenticated, currentUser, isAuthenticating, showAuthForm, isEmailLinkAccess]);
  
  // Load the game configuration and assignment using the token
  const loadGameAndAssignment = async (tokenValue: string) => {
    if (!tokenValue) {
      setError("Invalid game token");
      setLoading(false);
      return;
    }
    
    // Check for direct access indicators
    const directAccess = searchParams.get('directAccess') === 'true' || 
                          sessionStorage.getItem('direct_token_access') === 'true';
    if (directAccess) {
      console.log('GameByToken: Loading assignment with direct access mode');
      setIsEmailLinkAccess(true);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`GameByToken: Loading assignment for token: ${tokenValue}`);
      const assignment = await getAssignmentByToken(tokenValue);
      
      if (!assignment) {
        throw new Error("Assignment not found");
      }
      
      // Load the game configuration based on the assignment's gameId
      console.log(`GameByToken: Loading game config for gameId: ${assignment.gameId}`);
      const gameConfigRef = doc(db, 'userGameConfigs', assignment.gameId);
      const gameConfigDoc = await getDoc(gameConfigRef);
      
      if (!gameConfigDoc.exists()) {
        throw new Error("Game configuration not found");
      }
      
      const gameConfig = { id: gameConfigDoc.id, ...gameConfigDoc.data() };
      
      setGameConfig(gameConfig);
      setAssignment(assignment);
      
      // Pre-fill the authentication email
      if (assignment.studentEmail) {
        setAuthEmail(assignment.studentEmail);
        console.log('Pre-filled auth email:', assignment.studentEmail);
      }
      
      // Fetch student name from users collection
      if (assignment.studentEmail) {
        try {
          console.log('Fetching student name from users collection for email:', assignment.studentEmail);
          const usersQuery = query(
            collection(db, 'users'),
            where('email', '==', assignment.studentEmail.toLowerCase()),
            limit(1)
          );
          const usersSnapshot = await getDocs(usersQuery);
          
          if (!usersSnapshot.empty) {
            const userData = usersSnapshot.docs[0].data();
            if (userData.name) {
              setStudentName(userData.name);
              console.log('Found student name in users collection:', userData.name);
            } else {
              // Fallback to email prefix if no name field
              const fallbackName = assignment.studentEmail.split('@')[0];
              setStudentName(fallbackName);
              console.log('No name field in user document, using email prefix:', fallbackName);
            }
          } else {
            // No user found in collection, use email prefix
            const fallbackName = assignment.studentEmail.split('@')[0];
            setStudentName(fallbackName);
            console.log('No user found in users collection, using email prefix:', fallbackName);
          }
        } catch (error) {
          console.error('Error fetching student name from users collection:', error);
          // Fallback to email prefix on error
          const fallbackName = assignment.studentEmail.split('@')[0];
          setStudentName(fallbackName);
          console.log('Error fetching student name, using email prefix:', fallbackName);
        }
      }
    } catch (err) {
      console.error('Error loading game by token:', err);
      
      // Provide a more specific error message for the user
      if (err instanceof Error && err.message.includes('permissions')) {
        setError(
          'Access denied. This link is specific to the email recipient and cannot be shared. ' +
          'Please check that you are using the correct link from your email or authenticate below.'
        );
      } else if (err instanceof Error && err.message.includes('not found')) {
        setError('Assignment not found. The link may be expired or invalid.');
      } else {
        setError('Failed to load the game. Please try again or contact your teacher.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Send authentication email link to the student
  const sendAuthenticationEmail = async () => {
    if (!authEmail || !authEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    // Check if this email matches the assignment's student email
    if (assignment && assignment.studentEmail && 
        authEmail.toLowerCase() !== assignment.studentEmail.toLowerCase()) {
      if (!window.confirm(
        `The email you entered (${authEmail}) doesn't match the assignment's recipient email (${assignment.studentEmail}). ` + 
        'Are you sure you want to continue with this email?'
      )) {
        return;
      }
    }
    
    try {
      setIsAuthenticating(true);
      
      // Save the email in localStorage so we can retrieve it later
      window.localStorage.setItem('emailForSignIn', authEmail);
      
      // The URL to redirect back to after authentication
      const currentUrl = window.location.href;
      
      // Send the sign-in link
      await sendSignInLinkToEmail(auth, authEmail, {
        url: currentUrl,
        handleCodeInApp: true,
      });
      
      setEmailSent(true);
    } catch (error) {
      console.error('Error sending sign-in link:', error);
      
      // More detailed error messages for common Firebase auth errors
      let errorMessage = 'Failed to send authentication email. Please try again.';
      
      if (error instanceof Error) {
        const errorCode = error.message.includes('auth/') ? 
          error.message.split('auth/')[1].split(')')[0] : 'unknown';
        
        console.error('Firebase auth error code:', errorCode);
        
        switch(errorCode) {
          case 'operation-not-allowed':
            errorMessage = 'Email authentication is not enabled on this application. Please contact the administrator.';
            break;
          case 'invalid-email':
            errorMessage = 'The email address provided is invalid. Please check and try again.';
            break;
          case 'user-disabled':
            errorMessage = 'This user account has been disabled. Please contact support.';
            break;
          case 'missing-android-pkg-name':
          case 'missing-ios-bundle-id':
          case 'invalid-continue-uri':
          case 'unauthorized-continue-uri':
            errorMessage = 'There is a configuration issue with the authentication system. Please contact support.';
            break;
        }
      }
      
      // Set the error message in state for display in the UI instead of alert
      setSaveError(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };
  
  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Update handleStartGame to skip authentication for email links
  const handleStartGame = () => {
    setIsPlaying(true);
    setStartTime(new Date());
    
    // If this is coming from an email link, we're already "authenticated" via the link
    if (isEmailLinkAccess && assignment && assignment.studentEmail) {
      console.log('Using email from assignment for email link access:', assignment.studentEmail);
      // Pre-fill student name from email if needed
      if (!studentName && assignment.studentName) {
        setStudentName(assignment.studentName);
        setStudentNameSubmitted(true);
      } else if (!studentName) {
        // Use email as name if we don't have a better option
        setStudentName(assignment.studentEmail.split('@')[0]); // Use part before @ as name
        setStudentNameSubmitted(true);
      }
    }
  };
  
  // Enhanced auto-start useEffect with comprehensive debugging and better condition checking
  useEffect(() => {
    const handleAutoStart = async () => {
      const debugInfo = {
        isEmailLinkAccess,
        loading,
        isPlaying,
        hasAssignment: !!assignment,
        hasGameConfig: !!gameConfig,
        hasStudentEmail: assignment?.studentEmail,
        hasAutoStarted,
        currentStudentName: studentName,
        isAuthenticated,
        hasCurrentUser: !!currentUser,
        gameType: gameConfig?.type
      };
      
      console.log('GameByToken: Enhanced auto-start effect triggered with:', debugInfo);
      
      // Enhanced condition checking with more detailed logging
      const canAutoStart = (
        isEmailLinkAccess &&
        !loading &&
        !isPlaying &&
        assignment &&
        gameConfig &&
        assignment.studentEmail &&
        !hasAutoStarted
      );
      
      if (canAutoStart) {
        console.log('GameByToken: ✅ All auto-start conditions met! Initiating auto-start sequence...');
        console.log('GameByToken: Starting auto-start for game type:', gameConfig.type);
        
        // Set student name immediately with fallback chain
        let nameToUse = studentName;
        if (!nameToUse) {
          // If studentName is not already set, try to get it from users collection
          try {
            const usersQuery = query(
              collection(db, 'users'),
              where('email', '==', assignment.studentEmail.toLowerCase()),
              limit(1)
            );
            const usersSnapshot = await getDocs(usersQuery);
            
            if (!usersSnapshot.empty) {
              const userData = usersSnapshot.docs[0].data();
              if (userData.name) {
                nameToUse = userData.name;
                setStudentName(userData.name);
                console.log('GameByToken: Found student name in users collection for auto-start:', userData.name);
              }
            }
          } catch (error) {
            console.error('GameByToken: Error fetching student name for auto-start:', error);
          }
          
          // If still no name, use fallbacks
          if (!nameToUse && assignment.studentName) {
            nameToUse = assignment.studentName;
            setStudentName(assignment.studentName);
            console.log('GameByToken: Using assignment student name:', assignment.studentName);
          } else if (!nameToUse) {
            nameToUse = assignment.studentEmail.split('@')[0];
            setStudentName(assignment.studentEmail.split('@')[0]);
            console.log('GameByToken: Using email prefix as name:', nameToUse);
          }
        }
        
        // Mark name as submitted to bypass any popup
        setStudentNameSubmitted(true);
        
        // Ensure authentication state is properly set for email access
        if (!isAuthenticated) {
          console.log('GameByToken: Setting authentication state for email link access');
          setIsAuthenticated(true);
        }
        
        // Create synthetic user if needed
        if (!currentUser) {
          const syntheticUser = {
            email: assignment.studentEmail,
            displayName: assignment.studentName || assignment.studentEmail.split('@')[0]
          };
          setCurrentUser(syntheticUser);
          console.log('GameByToken: Created synthetic user for auto-start:', syntheticUser);
        }
        
        // Enhanced auto-start with better delay and comprehensive debugging
        setTimeout(() => {
          console.log('GameByToken: 🚀 Executing enhanced auto-start sequence...');
          console.log('GameByToken: Final student name for auto-start:', nameToUse);
          console.log('GameByToken: Game config type:', gameConfig.type);
          
          setIsPlaying(true);
          setStartTime(new Date());
          setHasAutoStarted(true);
          
          console.log('GameByToken: ✅ Enhanced auto-start completed successfully!');
          console.log('GameByToken: State after auto-start - isPlaying: true, hasAutoStarted: true');
        }, 200); // Optimized delay for state consistency
      } else if (isEmailLinkAccess && !hasAutoStarted) {
        console.log('GameByToken: ❌ Auto-start conditions not satisfied:', {
          'loading': loading,
          'isPlaying': isPlaying,
          'hasAssignment': !!assignment,
          'hasGameConfig': !!gameConfig,
          'hasStudentEmail': assignment?.studentEmail,
          'assignmentType': assignment?.gameType,
          'gameConfigType': gameConfig?.type
        });
      }
    };
    
    handleAutoStart();
  }, [isEmailLinkAccess, loading, isPlaying, assignment, gameConfig, studentName, hasAutoStarted, isAuthenticated, currentUser]);
  
  // Additional effect to force immediate start for email link users when conditions are met
  useEffect(() => {
    const setupStudentName = async () => {
      if (isEmailLinkAccess && assignment && !loading && !hasAutoStarted) {
        console.log('Forcing immediate setup for email link user');
        
        // Immediately set up the student name from users collection first
        try {
          const usersQuery = query(
            collection(db, 'users'),
            where('email', '==', assignment.studentEmail.toLowerCase()),
            limit(1)
          );
          const usersSnapshot = await getDocs(usersQuery);
          
          if (!usersSnapshot.empty) {
            const userData = usersSnapshot.docs[0].data();
            if (userData.name) {
              setStudentName(userData.name);
              console.log('GameByToken: Found student name for immediate setup:', userData.name);
            } else {
              // Fallback logic if no name field
              if (assignment.studentName) {
                setStudentName(assignment.studentName);
              } else if (assignment.studentEmail) {
                setStudentName(assignment.studentEmail.split('@')[0]);
              }
            }
          } else {
            // Fallback logic if no user found
            if (assignment.studentName) {
              setStudentName(assignment.studentName);
            } else if (assignment.studentEmail) {
              setStudentName(assignment.studentEmail.split('@')[0]);
            }
          }
        } catch (error) {
          console.error('GameByToken: Error fetching student name for immediate setup:', error);
          // Fallback logic on error
          if (assignment.studentName) {
            setStudentName(assignment.studentName);
          } else if (assignment.studentEmail) {
            setStudentName(assignment.studentEmail.split('@')[0]);
          }
        }
        
        setStudentNameSubmitted(true);
        
        // Force authentication state for email link users
        setIsAuthenticated(true);
        
        // Create synthetic user if needed
        if (!currentUser) {
          const syntheticUser = {
            email: assignment.studentEmail,
            displayName: assignment.studentName || assignment.studentEmail.split('@')[0]
          };
          setCurrentUser(syntheticUser);
        }
      }
    };
    
    setupStudentName();
  }, [isEmailLinkAccess, assignment, loading, hasAutoStarted, currentUser]);
  
  // Add a new useEffect at the component top level to force bypassing authentication on direct access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const directAccess = urlParams.get('directAccess') === 'true';
    const hasToken = urlParams.get('token'); // Check if there's a token
    
    // If there's a directAccess parameter OR a token parameter, treat it as email link access
    if (directAccess || hasToken) {
      console.log('GameByToken: Direct access or token access detected in URL');
      setIsEmailLinkAccess(true);
      
      // Force authenticated state for direct access mode
      setIsAuthenticated(true);
      console.log('GameByToken: Setting authenticated state to true for email link access');
      
      sessionStorage.setItem('direct_token_access', 'true');
    }
  }, []);
  
  // Debug effect to track render state
  useEffect(() => {
    if (assignment && gameConfig) {
      console.log('GameByToken: Rendering state update:', {
        hasAssignment: !!assignment,
        hasGameConfig: !!gameConfig,
        gameType: gameConfig?.type,
        isPlaying: isPlaying,
        isEmailLinkAccess: isEmailLinkAccess,
        isAuthenticated: isAuthenticated,
        hasAutoStarted: hasAutoStarted,
        loading: loading
      });
    }
  }, [assignment, gameConfig, isPlaying, isEmailLinkAccess, isAuthenticated, hasAutoStarted, loading]);
  
  // Update handleGameComplete to NOT reload immediately after attempt save
  const handleGameComplete = async (score: number) => {
    // Clear any previous save errors
    setSaveError(null);
    
    if (!assignment || !startTime || !gameConfig) {
      console.error("GameByToken: Cannot save attempt - missing required data", { 
        hasAssignment: !!assignment, 
        hasStartTime: !!startTime, 
        hasGameConfig: !!gameConfig 
      });
      alert('Missing required data to save your progress. Please try again.');
      return;
    }
    
    // Check if user is authenticated
    if (!isAuthenticated || !currentUser) {
      console.warn("GameByToken: User is not authenticated. Prompting for authentication");
      // Save the score temporarily to reuse after authentication
      sessionStorage.setItem('pending_game_score', score.toString());
      sessionStorage.setItem('pending_start_time', startTime.toISOString());
      
      // Pre-fill the student's email if available
      if (assignment.studentEmail) {
        setAuthEmail(assignment.studentEmail);
      }
      
      // Stop the game to show authentication form
      setIsPlaying(false);
      
      // Force showing authentication form
      setShowAuthForm(true);
      
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const endTime = new Date();
      const durationInSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Debug log all attempt data before saving
      console.log("GameByToken: Attempting to save progress with data:", {
        assignmentId: assignment.id,
        studentEmail: assignment.studentEmail,
        studentName: studentName || 'Unknown Student',
        duration: durationInSeconds,
        score: score,
        scoreType: typeof score,
        gameType: gameConfig.type,
        userAuthenticated: isAuthenticated,
        userEmail: currentUser?.email
      });
      
      // Ensure we have a valid number for score, default to 0 if not
      const validScore = typeof score === 'number' && !isNaN(score) ? score : 0;
      
      // Use the assignment's studentEmail and the provided studentName
      const attemptId = await createAttempt(assignment.id || '', {
        duration: durationInSeconds,
        score: validScore,
        results: { score: validScore },
        studentEmail: assignment.studentEmail,
        studentName: studentName || 'Unknown Student'
      });
      
      console.log(`GameByToken: Successfully saved attempt with ID: ${attemptId}`);
      
      // Update the assignment status if needed
      if (assignment.status === 'assigned') {
        await updateAssignment(assignment.id || '', { status: 'started' });
      }
      
      // Update the completedCount and potentially the status
      const newCompletedCount = (assignment.completedCount || 0) + 1;
      const isNowCompleted = newCompletedCount >= assignment.timesRequired;
      
      await updateAssignment(assignment.id || '', { 
        completedCount: newCompletedCount,
        lastCompletedAt: Timestamp.now(),
        status: isNowCompleted ? 'completed' : assignment.status
      });
      
      console.log(`GameByToken: Updated assignment - attempts: ${newCompletedCount}/${assignment.timesRequired}, completed: ${isNowCompleted}`);
      
      // Clear any pending game data
      sessionStorage.removeItem('pending_game_score');
      sessionStorage.removeItem('pending_start_time');
      
      // Don't reload or change isPlaying state here - let the high score process complete first
      // setIsPlaying(false);
      // setStartTime(null);
      
      // setPendingReload(true); // Set flag to reload after modal
    } catch (err) {
      console.error('Error submitting attempt:', err);
      
      // More descriptive error message to the user
      let errorMessage = 'Failed to save your progress. Please try again.';
      
      if (err instanceof Error) {
        console.error('Error details:', err.message);
        // Customize error message based on the specific error
        if (err.message.includes('undefined')) {
          errorMessage = 'There was an issue with your score data. Please try again.';
        } else if (err.message.includes('permission')) {
          errorMessage = 'You have been authenticated, but there was a permission issue when updating your progress. Please use the "Continue without authentication" button below to save your progress anyway.';
          
          // If it's a permissions error, we need to re-authenticate
          setAuthEmail(assignment.studentEmail || '');
          
          // Save the score temporarily
          sessionStorage.setItem('pending_game_score', score.toString());
          sessionStorage.setItem('pending_start_time', startTime.toISOString());
          
          // Show authentication form explicitly
          setShowAuthForm(true);
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error while saving progress. Please check your connection and try again.';
        }
      }
      
      setSaveError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Check if pending game data exists and resume after authentication
  useEffect(() => {
    // If user becomes authenticated and we have pending game data, complete the previous game
    if (isAuthenticated && currentUser && !isSubmitting) {
      const pendingScore = sessionStorage.getItem('pending_game_score');
      const pendingStartTime = sessionStorage.getItem('pending_start_time');
      
      if (pendingScore && pendingStartTime) {
        console.log('Found pending game data. Resuming after authentication');
        
        // Restore the start time
        setStartTime(new Date(pendingStartTime));
        
        // Submit the attempt with the pending score
        const score = parseInt(pendingScore);
        if (!isNaN(score)) {
          // We need to use setTimeout to ensure the component is fully updated
          setTimeout(() => {
            handleGameComplete(score);
          }, 500);
        }
      }
    }
  }, [isAuthenticated, currentUser]);
  
  // New handlers for high score process
  const handleHighScoreProcessStart = () => {
    console.log('GameByToken: High score process started');
    setIsHighScoreProcessing(true);
  };

  const handleHighScoreProcessComplete = () => {
    console.log('GameByToken: High score process completed');
    setIsHighScoreProcessing(false);
    
    // Add a delay before proceeding to give modals time to display
    console.log('GameByToken: Waiting before cleaning up game state...');
    setTimeout(() => {
      console.log('GameByToken: Cleaning up game state and reloading assignment');
      setIsPlaying(false);
      setStartTime(null);
      
      // Now reload the assignment
      if (token) {
        setPendingReload(false);
        setHasAutoStarted(false);
        loadGameAndAssignment(token);
      }
    }, 1000);
  };
  
  // Check if assignment is past due
  const isPastDue = () => {
    if (!assignment) return false;
    
    const now = new Date();
    return assignment.deadline.toDate() < now;
  };
  
  // Check if assignment is fully completed
  const isCompleted = () => {
    if (!assignment) return false;
    
    return assignment.completedCount >= assignment.timesRequired;
  };
  
  // Render appropriate game component based on type
  const renderGame = () => {
    // If loading, show loading indicator
    if (loading) {
      return <div className="text-center py-10">Loading game...</div>;
    }
    
    // If error, show error message
    if (error) {
      return (
        <div className="max-w-lg mx-auto my-8 p-6 bg-red-50 border border-red-300 rounded-lg">
          <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            Return Home
          </button>
        </div>
      );
    }
    
    // If we have a game config but not playing yet
    if (gameConfig && !isPlaying) {
      // Skip authentication check if coming from email link or direct access
      const skipAuthCheck = isEmailLinkAccess || sessionStorage.getItem('direct_token_access') === 'true';
      
      if (!isAuthenticated && !currentUser && !skipAuthCheck) {
        // Show authentication form
        return renderAuthenticationForm();
      }
      
      // If we're past the deadline, show past due message but allow access
      if (isPastDue()) {
        return (
          <div className="max-w-lg mx-auto my-8 p-6 bg-yellow-50 border border-yellow-300 rounded-lg">
            <h2 className="text-xl font-bold text-yellow-700 mb-2">Assignment Past Due</h2>
            <p className="text-yellow-700">
              This assignment was due on {assignment && formatDate(assignment.deadline.toDate())}.
              You can still complete it, but it will be marked as late.
            </p>
              <button 
                onClick={handleStartGame}
                className="mt-4 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold"
              >
                Start Game
              </button>
          </div>
        );
      }
      
      // If the assignment is already completed, show completion message with option to play again
      if (isCompleted()) {
        return (
          <div className="max-w-lg mx-auto my-8 p-6 bg-green-50 border border-green-300 rounded-lg">
            <h2 className="text-xl font-bold text-green-700 mb-2">Assignment Already Completed</h2>
            <p className="text-green-700 mb-4">
              You have already completed this assignment with a score of {assignment.score}.
            </p>
              <button 
                onClick={handleStartGame}
                className="mt-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold"
              >
                Play Again
              </button>
          </div>
        );
      }
      
      // Standard start screen
      return (
        <div className="max-w-lg mx-auto my-8 p-6 bg-white border border-gray-200 shadow-md rounded-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{gameConfig.title}</h2>
          
          {gameConfig.instructions && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Instructions:</h3>
              <div className="prose prose-sm max-w-none">
                {gameConfig.instructions}
              </div>
            </div>
          )}
          
          {assignment && assignment.deadline && (
            <p className="mb-4 text-sm text-gray-600">
              Due date: {new Date(assignment.deadline.seconds * 1000).toLocaleDateString()}
            </p>
          )}
          
            <button 
              onClick={handleStartGame}
              className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-lg transition-colors"
            >
              Start Game
            </button>
        </div>
      );
    }
    
    // If playing the game, render the appropriate game component
    if (isPlaying && assignment && gameConfig) {
      console.log('GameByToken: Rendering game with type:', gameConfig.type);
      switch (gameConfig.type) {
        case 'sentence-sense':
          return (
            <SentenceSenseAdapter
              config={gameConfig}
              onGameComplete={handleGameComplete}
              playerName={studentName}
              onHighScoreProcessStart={handleHighScoreProcessStart}
              onHighScoreProcessComplete={handleHighScoreProcessComplete}
            />
          );
        case 'whack-a-mole':
          return (
            <WhackAMoleAdapter
              config={gameConfig}
              onGameComplete={handleGameComplete}
              playerName={studentName}
              onHighScoreProcessStart={handleHighScoreProcessStart}
              onHighScoreProcessComplete={handleHighScoreProcessComplete}
            />
          );
        case 'spinner-wheel':
          return (
            <SpinnerWheel
              config={gameConfig}
              onGameComplete={handleGameComplete}
            />
          );
        case 'place-value-showdown':
          return (
            <PlaceValueShowdownAdapter
              config={gameConfig}
              onGameComplete={handleGameComplete}
              playerName={studentName}
              onHighScoreProcessStart={handleHighScoreProcessStart}
              onHighScoreProcessComplete={handleHighScoreProcessComplete}
            />
          );
        case 'sort-categories-egg-reveal':
          return (
            <SortCategoriesEggRevealAdapter
              config={gameConfig}
              onGameComplete={handleGameComplete}
              playerName={studentName}
              onHighScoreProcessStart={handleHighScoreProcessStart}
              onHighScoreProcessComplete={handleHighScoreProcessComplete}
            />
          );
        case 'anagram':
          return (
            <AnagramAdapter
              config={gameConfig}
              onGameComplete={handleGameComplete}
              playerName={studentName}
              onHighScoreProcessStart={handleHighScoreProcessStart}
              onHighScoreProcessComplete={handleHighScoreProcessComplete}
            />
          );

        default:
          console.error('GameByToken: Unsupported game type:', gameConfig.type);
          return (
            <div>Unsupported game type: {gameConfig.type}</div>
          );
      }
    }
    
    // Fallback
    return <div className="text-center py-10">Something went wrong. Please try again.</div>;
  };
  
  // Render authentication form
  const renderAuthenticationForm = () => (
    <div style={{
      backgroundColor: 'white',
      borderRadius: 'var(--border-radius-md)',
      padding: 'var(--spacing-6)',
      maxWidth: '500px',
      width: '100%',
      margin: '0 auto',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{
        fontSize: 'var(--font-size-xl)',
        color: 'var(--color-gray-800)',
        marginBottom: 'var(--spacing-4)',
        textAlign: 'center'
      }}>
        Authenticate to Access Your Assignment
      </h2>
      
      {/* Display any auth errors */}
      {saveError && (
        <div style={{
          margin: 'var(--spacing-2) 0',
          padding: 'var(--spacing-2)',
          backgroundColor: 'var(--color-error-50)',
          color: 'var(--color-error-700)',
          borderRadius: 'var(--border-radius-sm)',
          fontSize: 'var(--font-size-sm)',
          marginBottom: 'var(--spacing-4)'
        }}>
          ⚠️ {saveError}
        </div>
      )}
      
      {!emailSent ? (
        <>
          <p style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-gray-600)' }}>
            To confirm your identity and access your assignment, please enter your email address below. 
            We'll send you a secure link to continue.
          </p>
          
          <div style={{ marginBottom: 'var(--spacing-4)' }}>
            <label 
              htmlFor="authEmail"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-gray-700)',
                marginBottom: 'var(--spacing-1)'
              }}
            >
              Your Email Address
            </label>
            <input
              id="authEmail"
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="Enter your email"
              style={{
                width: '100%',
                padding: 'var(--spacing-2)',
                border: '1px solid var(--color-gray-300)',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: 'var(--font-size-md)'
              }}
            />
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginTop: 'var(--spacing-1)' }}>
              Please use the same email address that your teacher sent the assignment to.
            </p>
          </div>
          
          <button
            onClick={sendAuthenticationEmail}
            disabled={isAuthenticating}
            style={{
              width: '100%',
              padding: 'var(--spacing-3)',
              backgroundColor: 'var(--color-primary-600)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: 'var(--font-size-md)',
              fontWeight: 'bold',
              cursor: isAuthenticating ? 'not-allowed' : 'pointer',
              opacity: isAuthenticating ? 0.7 : 1,
              marginBottom: 'var(--spacing-3)'
            }}
          >
            {isAuthenticating ? 'Sending...' : 'Send Authentication Link'}
          </button>
          
          {/* Temporary workaround button */}
          <div style={{ textAlign: 'center', marginTop: 'var(--spacing-3)' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--spacing-2)' }}>
              If you're having trouble with authentication:
            </p>
            <button
              onClick={() => {
                // Get the pending score from session storage
                const pendingScore = sessionStorage.getItem('pending_game_score');
                const score = pendingScore ? parseInt(pendingScore) : 0;
                
                // Close the authentication form
                setShowAuthForm(false);
                
                // Create a temporary user object
                const tempUser = {
                  email: authEmail || assignment?.studentEmail || 'student@example.com',
                  displayName: studentName || 'Student'
                };
                
                // Temporarily bypass authentication
                console.log('Bypassing authentication with temporary user:', tempUser);
                
                // Set a flag in session storage to indicate bypass mode
                sessionStorage.setItem('auth_bypass_mode', 'true');
                
                // Set up the assignment for submission without authentication
                setIsSubmitting(true);
                
                // Get attempt data from session
                const startTimeStr = sessionStorage.getItem('pending_start_time');
                const startTime = startTimeStr ? new Date(startTimeStr) : new Date();
                const endTime = new Date();
                const durationInSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
                
                // Create the attempt directly (without auth)
                if (assignment) {
                  createAttempt(assignment.id || '', {
                    duration: durationInSeconds,
                    score: score,
                    results: { score },
                    studentEmail: assignment.studentEmail || authEmail,
                    studentName: studentName || 'Anonymous Student'
                  })
                  .then(attemptId => {
                    console.log(`Successfully saved attempt with ID: ${attemptId} (auth bypassed)`);
                    
                    // Update assignment status
                    if (assignment.status === 'assigned') {
                      return updateAssignment(assignment.id || '', { status: 'started' });
                    }
                    return Promise.resolve();
                  })
                  .then(() => {
                    // Update the completedCount
                    const newCompletedCount = (assignment.completedCount || 0) + 1;
                    const isNowCompleted = newCompletedCount >= assignment.timesRequired;
                    
                    return updateAssignment(assignment.id || '', { 
                      completedCount: newCompletedCount,
                      lastCompletedAt: Timestamp.now(),
                      status: isNowCompleted ? 'completed' : assignment.status
                    });
                  })
                  .then(() => {
                    // Clear session storage
                    sessionStorage.removeItem('pending_game_score');
                    sessionStorage.removeItem('pending_start_time');
                    
                    // Reload the assignment data
                    if (token) {
                      return loadGameAndAssignment(token);
                    }
                    return Promise.resolve();
                  })
                  .catch(err => {
                    console.error('Error while bypassing authentication:', err);
                    setSaveError('Failed to save your progress in bypass mode. Please try again.');
                  })
                  .finally(() => {
                    setIsSubmitting(false);
                  });
                } else {
                  console.error('Cannot bypass authentication: No assignment data available');
                  setSaveError('Cannot proceed without assignment data. Please try refreshing the page.');
                  setIsSubmitting(false);
                }
              }}
              style={{
                padding: 'var(--spacing-2) var(--spacing-4)',
                backgroundColor: 'var(--color-gray-100)',
                color: 'var(--color-gray-700)',
                border: '1px solid var(--color-gray-300)',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer'
              }}
            >
              Continue without authentication (temporary)
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ 
            padding: 'var(--spacing-4)', 
            backgroundColor: 'var(--color-success-50)', 
            borderRadius: 'var(--border-radius-md)',
            marginBottom: 'var(--spacing-4)' 
          }}>
            <p style={{ color: 'var(--color-success-700)', marginBottom: 'var(--spacing-2)' }}>
              ✓ Authentication email sent!
            </p>
            <p style={{ color: 'var(--color-gray-700)' }}>
              We've sent an email to <strong>{authEmail}</strong>. 
              Please check your inbox and click the link to continue to your assignment.
            </p>
          </div>
          
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
            Don't see the email? Check your spam folder or try again.
          </p>
          
          <button
            onClick={() => setEmailSent(false)}
            style={{
              width: '100%',
              padding: 'var(--spacing-3)',
              backgroundColor: 'white',
              color: 'var(--color-gray-700)',
              border: '1px solid var(--color-gray-300)',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: 'var(--font-size-md)',
              marginTop: 'var(--spacing-4)',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </>
      )}
    </div>
  );
  
  // Main render
  if (isAuthenticating) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
        <p>Authenticating, please wait...</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
        <p>Loading game...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: 'var(--spacing-8)',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <p style={{ color: 'var(--color-error-600)', marginBottom: 'var(--spacing-4)' }}>{error}</p>
        
        {/* Show authentication form if it's a permissions error */}
        {error.includes('Access denied') ? (
          renderAuthenticationForm()
        ) : (
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: 'var(--spacing-4)',
              padding: 'var(--spacing-2) var(--spacing-4)',
              backgroundColor: 'var(--color-primary-600)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer'
            }}
          >
            Go Home
          </button>
        )}
      </div>
    );
  }
  
  if (isCompleted()) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: 'var(--spacing-8)',
        color: 'var(--color-success-600)'
      }}>
        <p>You have completed this assignment!</p>
        <p>Required attempts: {assignment && assignment.timesRequired}</p>
        <p>Your attempts: {assignment && assignment.completedCount}</p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: 'var(--spacing-4)',
            padding: 'var(--spacing-2) var(--spacing-4)',
            backgroundColor: 'var(--color-primary-600)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--border-radius-sm)',
            cursor: 'pointer'
          }}
        >
          Go Home
        </button>
      </div>
    );
  }
  
  // Add a new function to render the assignment info footer
  const renderAssignmentFooter = () => {
    if (!assignment) return null;
    
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(5px)',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
        padding: '12px 20px',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        fontFamily: "'Roboto', 'Helvetica', sans-serif"
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '24px', 
            height: '24px', 
            borderRadius: '50%', 
            backgroundColor: '#4CAF50',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '10px',
            fontSize: '14px'
          }}>
            ✓
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
              Authenticated as: {assignment.studentEmail}
            </div>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '20px',
          color: '#555',
          fontSize: '14px'
        }}>
          <div>
            <span style={{ color: '#777' }}>Due Date:</span> {formatDate(assignment.deadline.toDate())}
          </div>
          <div>
            <span style={{ color: '#777' }}>Attempts:</span> {assignment.completedCount || 0}/{assignment.timesRequired}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div style={{ 
      padding: 'var(--spacing-4)',
      maxWidth: '1200px',
      margin: '0 auto',
      paddingBottom: '60px' // Add padding to prevent content from being hidden behind the footer
    }}>
      {/* Authentication Modal - Show when needed */}
      {showAuthForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '0 20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 'var(--border-radius-md)',
            padding: 'var(--spacing-6)',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{
              fontSize: 'var(--font-size-xl)',
              color: 'var(--color-gray-800)',
              marginBottom: 'var(--spacing-4)',
              textAlign: 'center'
            }}>
              Authentication Required
            </h2>
            
            {/* Display any auth errors */}
            {saveError && (
              <div style={{
                margin: 'var(--spacing-2) 0',
                padding: 'var(--spacing-2)',
                backgroundColor: 'var(--color-error-50)',
                color: 'var(--color-error-700)',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: 'var(--font-size-sm)',
                marginBottom: 'var(--spacing-4)'
              }}>
                ⚠️ {saveError}
              </div>
            )}
            
            <p style={{ 
              color: 'var(--color-gray-600)', 
              marginBottom: 'var(--spacing-4)',
              textAlign: 'center' 
            }}>
              You need to authenticate to save your progress. 
              {assignment?.studentEmail ? ` Please authenticate as ${assignment.studentEmail}.` : ''}
            </p>
            
            {!emailSent ? (
              <>
                <div style={{ marginBottom: 'var(--spacing-4)' }}>
                  <label 
                    htmlFor="authEmailModal"
                    style={{
                      display: 'block',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-gray-700)',
                      marginBottom: 'var(--spacing-1)'
                    }}
                  >
                    Your Email Address
                  </label>
                  <input
                    id="authEmailModal"
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="Enter your email"
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-2)',
                      border: '1px solid var(--color-gray-300)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: 'var(--font-size-md)'
                    }}
                  />
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginTop: 'var(--spacing-1)' }}>
                    Please use the same email address that your teacher sent the assignment to.
                  </p>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-4)' }}>
                  <button
                    onClick={() => setShowAuthForm(false)}
                    style={{
                      padding: 'var(--spacing-2) var(--spacing-4)',
                      backgroundColor: 'white',
                      border: '1px solid var(--color-gray-300)',
                      borderRadius: 'var(--border-radius-sm)',
                      color: 'var(--color-gray-700)',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendAuthenticationEmail}
                    disabled={isAuthenticating}
                    style={{
                      padding: 'var(--spacing-2) var(--spacing-4)',
                      backgroundColor: 'var(--color-primary-600)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--border-radius-sm)',
                      fontWeight: 'bold',
                      cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                      opacity: isAuthenticating ? 0.7 : 1
                    }}
                  >
                    {isAuthenticating ? 'Sending...' : 'Send Authentication Link'}
                  </button>
                </div>
                
                {/* Temporary workaround section */}
                <div style={{ 
                  borderTop: '1px solid var(--color-gray-200)', 
                  paddingTop: 'var(--spacing-4)',
                  marginTop: 'var(--spacing-2)'
                }}>
                  <p style={{ 
                    fontSize: 'var(--font-size-sm)', 
                    color: 'var(--color-gray-600)', 
                    marginBottom: 'var(--spacing-3)',
                    textAlign: 'center'
                  }}>
                    <strong>Temporary Solution:</strong> If you're experiencing authentication issues, you can:
                  </p>
                  
                  <button
                    onClick={() => {
                      // Get the pending score from session storage
                      const pendingScore = sessionStorage.getItem('pending_game_score');
                      const score = pendingScore ? parseInt(pendingScore) : 0;
                      
                      // Close the authentication form
                      setShowAuthForm(false);
                      
                      // Create a temporary user object
                      const tempUser = {
                        email: authEmail || assignment?.studentEmail || 'student@example.com',
                        displayName: studentName || 'Student'
                      };
                      
                      // Temporarily bypass authentication
                      console.log('Bypassing authentication with temporary user:', tempUser);
                      
                      // Set a flag in session storage to indicate bypass mode
                      sessionStorage.setItem('auth_bypass_mode', 'true');
                      
                      // Set up the assignment for submission without authentication
                      setIsSubmitting(true);
                      
                      // Get attempt data from session
                      const startTimeStr = sessionStorage.getItem('pending_start_time');
                      const startTime = startTimeStr ? new Date(startTimeStr) : new Date();
                      const endTime = new Date();
                      const durationInSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
                      
                      // Create the attempt directly (without auth)
                      if (assignment) {
                        createAttempt(assignment.id || '', {
                          duration: durationInSeconds,
                          score: score,
                          results: { score },
                          studentEmail: assignment.studentEmail || authEmail,
                          studentName: studentName || 'Anonymous Student'
                        })
                        .then(attemptId => {
                          console.log(`Successfully saved attempt with ID: ${attemptId} (auth bypassed)`);
                          
                          // Update assignment status
                          if (assignment.status === 'assigned') {
                            return updateAssignment(assignment.id || '', { status: 'started' });
                          }
                          return Promise.resolve();
                        })
                        .then(() => {
                          // Update the completedCount
                          const newCompletedCount = (assignment.completedCount || 0) + 1;
                          const isNowCompleted = newCompletedCount >= assignment.timesRequired;
                          
                          return updateAssignment(assignment.id || '', { 
                            completedCount: newCompletedCount,
                            lastCompletedAt: Timestamp.now(),
                            status: isNowCompleted ? 'completed' : assignment.status
                          });
                        })
                        .then(() => {
                          // Clear session storage
                          sessionStorage.removeItem('pending_game_score');
                          sessionStorage.removeItem('pending_start_time');
                          
                          // Reload the assignment data
                          if (token) {
                            return loadGameAndAssignment(token);
                          }
                          return Promise.resolve();
                        })
                        .catch(err => {
                          console.error('Error while bypassing authentication:', err);
                          setSaveError('Failed to save your progress in bypass mode. Please try again.');
                        })
                        .finally(() => {
                          setIsSubmitting(false);
                        });
                      } else {
                        console.error('Cannot bypass authentication: No assignment data available');
                        setSaveError('Cannot proceed without assignment data. Please try refreshing the page.');
                        setIsSubmitting(false);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-2)',
                      backgroundColor: 'var(--color-gray-100)',
                      color: 'var(--color-gray-700)',
                      border: '1px solid var(--color-gray-300)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: 'var(--font-size-sm)',
                      cursor: 'pointer'
                    }}
                  >
                    Continue without authentication (Save progress anyway)
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ 
                  padding: 'var(--spacing-4)', 
                  backgroundColor: 'var(--color-success-50)', 
                  borderRadius: 'var(--border-radius-md)',
                  marginBottom: 'var(--spacing-4)' 
                }}>
                  <p style={{ color: 'var(--color-success-700)', marginBottom: 'var(--spacing-2)' }}>
                    ✓ Authentication email sent!
                  </p>
                  <p style={{ color: 'var(--color-gray-700)' }}>
                    We've sent an email to <strong>{authEmail}</strong>. 
                    Please check your inbox and click the link to continue to your assignment.
                  </p>
                </div>
                
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                  Don't see the email? Check your spam folder or try again.
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-4)' }}>
                  <button
                    onClick={() => {
                      setShowAuthForm(false);
                      setEmailSent(false);
                    }}
                    style={{
                      padding: 'var(--spacing-2) var(--spacing-4)',
                      backgroundColor: 'white',
                      border: '1px solid var(--color-gray-300)',
                      borderRadius: 'var(--border-radius-sm)',
                      color: 'var(--color-gray-700)',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setEmailSent(false)}
                    style={{
                      padding: 'var(--spacing-2) var(--spacing-4)',
                      backgroundColor: 'var(--color-primary-600)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--border-radius-sm)',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Try Again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    
      {assignment && gameConfig ? (
        <div>
          <h1 style={{
            fontSize: 'var(--font-size-2xl)',
            color: 'var(--color-gray-800)',
            marginBottom: 'var(--spacing-4)'
          }}>
            {gameConfig.name}
          </h1>
          
          {/* Display save error if any */}
          {saveError && (
            <div style={{
              margin: 'var(--spacing-2) 0',
              padding: 'var(--spacing-2)',
              backgroundColor: 'var(--color-error-50)',
              color: 'var(--color-error-700)',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: 'var(--font-size-sm)'
            }}>
              ⚠️ {saveError}
            </div>
          )}
          
          {/* Only show the game if authenticated or after they've submitted their name */}
          {!isPlaying ? (
            <div>
              <p style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-gray-600)' }}>
                Ready to start your assignment: <strong>{gameConfig.name}</strong>
              </p>
              <button
                onClick={handleStartGame}
                className="mt-4 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold"
              >
                Start Game
              </button>
            </div>
          ) : (
            <div style={{ 
              backgroundColor: 'white',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}>
              {renderGame()}
            </div>
          )}
        </div>
      ) : (
        // If we don't have assignment and game data yet but no error occurred,
        // show the authentication form
        <>
          {isAuthenticated && currentUser ? (
            <div style={{
              backgroundColor: 'var(--color-success-50)',
              color: 'var(--color-success-700)',
              padding: 'var(--spacing-4)',
              borderRadius: 'var(--border-radius-md)',
              marginBottom: 'var(--spacing-4)',
              textAlign: 'center'
            }}>
              <p>You are authenticated as: <strong>{currentUser.email}</strong></p>
              <p>Loading your assignment...</p>
            </div>
          ) : (
            renderAuthenticationForm()
          )}
        </>
      )}
      
      {/* Add the assignment footer */}
      {assignment && renderAssignmentFooter()}
    </div>
  );
};

export default GameByToken; 