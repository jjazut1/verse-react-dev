import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, Attempt } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
// Removed complex email link authentication in favor of simplified approach
import { PWAInstallBanner } from '../components/PWAInstallBanner';
import { usePWA } from '../hooks/usePWA';
import { useCustomToast, ToastComponent } from '../hooks/useCustomToast';
import { useSinglePWAWindow } from '../hooks/useSinglePWAWindow';

// Define Game interface based on TeacherDashboard.tsx
interface Game {
  id: string;
  title: string;
  description?: string;
  gameType?: string;
  type?: string;
  name?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  public?: boolean;
}

// Child-friendly color palette
const colors = {
  primary: '#4299E1', // Bright blue
  secondary: '#9AE6B4', // Mint green
  accent1: '#FEB2B2', // Soft red
  accent2: '#FAF089', // Pale yellow
  accent3: '#B794F4', // Lavender
  background: '#EBF8FF', // Light blue background
  cardBg: '#FFFFFF',
  text: '#2D3748', // Dark gray for text
  textLight: '#718096' // Medium gray for secondary text
};

const StudentDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Parse query parameters
  const queryParams = new URLSearchParams(location.search);
  const studentId = queryParams.get('id');
  const isTeacherView = queryParams.get('teacherView') === 'true';
  const pwaInstall = queryParams.get('pwa'); // Check for PWA installation parameter
  
  // PWA hook for installation functionality
  const { installPWA, showInstallPrompt, isInstallable, isInstalled, showBriefInstallPrompt, dismissBriefInstallPrompt } = usePWA();
  
  // Custom toast hook for notifications
  const { toastMessage, showToast } = useCustomToast();
  
  // Email link access bypass state (similar to GameByToken)
  // Initialize early to check for email link parameters immediately
  const [isEmailLinkAccess, setIsEmailLinkAccess] = useState(() => {
    // Early detection of email link access during component initialization
    const urlParams = new URLSearchParams(window.location.search);
    const emailAccess = urlParams.get('emailAccess') === 'true';
    const fromEmail = urlParams.get('from') === 'email';
    const pwaParam = urlParams.get('pwa') === 'true';
    const studentEmailParam = urlParams.get('studentEmail');
    const sourceParam = urlParams.get('source') === 'email';
    const sessionFlag = sessionStorage.getItem('direct_token_access') === 'true';
    
    const isEmailLink = emailAccess || 
                       (fromEmail && pwaParam) || 
                       (fromEmail && studentEmailParam) ||
                       sourceParam ||
                       sessionFlag;
    
    console.log('[StudentDashboard] INITIALIZATION: Email link check:', {
      emailAccess, fromEmail, pwaParam, studentEmailParam, sourceParam, sessionFlag, isEmailLink
    });
    
    if (isEmailLink) {
      console.log('[StudentDashboard] ✅ INITIALIZATION: Email link access detected');
      sessionStorage.setItem('direct_token_access', 'true');
      
      // Store the student email for future Dashboard navigation
      if (studentEmailParam) {
        sessionStorage.setItem('student_email', studentEmailParam);
        console.log('[StudentDashboard] ✅ INITIALIZATION: Stored student email for Dashboard navigation:', studentEmailParam);
      }
    }
    
    return isEmailLink;
  });
  
  const [studentData, setStudentData] = useState<any>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [highScores, setHighScores] = useState<any[]>([]);
  const [freeGames, setFreeGames] = useState<Game[]>([]);
  const [gameConfigs, setGameConfigs] = useState<{[key: string]: any}>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assignments');
  
  // PWA installation state
  const [showPWAPrompt, setShowPWAPrompt] = useState(false);
  
  // Enhanced high scores state
  const [enhancedHighScores, setEnhancedHighScores] = useState<HighScore[]>([]);
  const [highScoresLoading, setHighScoresLoading] = useState(false);
  
  // Assignment notification state
  const [hasNewAssignments, setHasNewAssignments] = useState(false);
  
  // Single PWA window enforcement (focus-first approach)
  const [pwaWindowAction, setPwaWindowAction] = useState<string | null>(null);
  
  // Determine student email for PWA window management
  const studentEmail = studentId || currentUser?.email || queryParams.get('studentEmail') || '';
  
  // Enable single PWA window enforcement
  useSinglePWAWindow({
    enabled: true,
    studentEmail: studentEmail,
    source: 'student_dashboard',
    onDuplicateDetected: (action) => {
      console.log('[StudentDashboard] 🎯 PWA duplicate action:', action);
      setPwaWindowAction(action);
      
      if (action === 'focused_existing') {
        showToast({
          title: "Opening Existing App 🎯",
          description: "Switching to your already open LuminateLearn app...",
          status: "info",
          duration: 3000,
        });
      } else if (action === 'closed_duplicates') {
        showToast({
          title: "App Window Cleaned Up ✨",
          description: "Closed duplicate windows to keep things tidy!",
          status: "success",
          duration: 3000,
        });
      }
    }
  });
  
  // High score interface
  interface HighScore {
    id: string;
    userId: string;
    playerName: string;
    score: number;
    configId: string;
    createdAt: any;
    gameType: string;
    gameConfig?: {
      id: string;
      title?: string;
      thumbnail?: string;
      type?: string;
      [key: string]: any;
    } | null;
  }

  // Universal PWA guidance message for browser loads only - immediate and delayed checks
  useEffect(() => {
    // Immediate check first with detailed logging
    const standaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = (window.navigator as any).standalone === true;
    const isInPWAImmediate = standaloneMatch || iosStandalone;
    
         console.log('📱 StudentDashboard - IMMEDIATE CHECK:');
     console.log('  - standaloneMatch:', standaloneMatch);
     console.log('  - iosStandalone:', iosStandalone);
     console.log('  - isInPWAImmediate:', isInPWAImmediate);
     console.log('  - userAgent:', navigator.userAgent);
     console.log('  - windowSize:', `${window.outerWidth}x${window.outerHeight}`);
     console.log('  - innerSize:', `${window.innerWidth}x${window.innerHeight}`);
    
    if (isInPWAImmediate) {
      console.log('📱 StudentDashboard - IMMEDIATE CHECK: In PWA mode, skipping universal guidance message');
      return;
    }
    
    console.log('📱 StudentDashboard - IMMEDIATE CHECK: In browser mode, setting up delayed check...');
    
    // Add delay for cases where PWA detection takes time
    const timer = setTimeout(() => {
      // Double-check PWA mode after delay with detailed logging
      const standaloneMatchDelayed = window.matchMedia('(display-mode: standalone)').matches;
      const iosStandaloneDelayed = (window.navigator as any).standalone === true;
      const isInPWADelayed = standaloneMatchDelayed || iosStandaloneDelayed;
      
             console.log('📱 StudentDashboard - DELAYED CHECK:');
       console.log('  - standaloneMatchDelayed:', standaloneMatchDelayed);
       console.log('  - iosStandaloneDelayed:', iosStandaloneDelayed);
       console.log('  - isInPWADelayed:', isInPWADelayed);
       console.log('  - decision:', isInPWADelayed ? 'SKIP_MESSAGE' : 'SHOW_MESSAGE');
      
      if (isInPWADelayed) {
        console.log('📱 StudentDashboard - DELAYED CHECK: In PWA mode, skipping universal guidance message');
        return;
      }
      
      console.log('📱 StudentDashboard - DELAYED CHECK: In browser mode, showing universal PWA guidance');
      
      try {
        showToast({
          title: "🌟 Get the best LuminateLearn experience!",
          description: "See an Install icon? → Tap it to add LuminateLearn to your device\nSee \"Open in App\"? → Tap it\nSee \"Always Use\"? → Tap it",
          status: "info",
          duration: 12000, // Longer duration for universal message
        });
        console.log('📱 StudentDashboard - Universal PWA toast completed');
      } catch (error) {
        console.error('📱 StudentDashboard - Universal PWA toast error:', error);
      }
    }, 6000); // Increased to 6 seconds to allow PWA standalone detection to complete fully
    
    return () => clearTimeout(timer);
  }, []); // Run only once on mount

  // Enhanced PWA installation handling from email links
  useEffect(() => {
    const showGuide = queryParams.get('showGuide') === 'true';
    const alreadyInstalled = queryParams.get('pwa') === 'alreadyInstalled';
    const forceBrowser = queryParams.get('forceBrowser') === 'true';
    const showOpenInAppHint = queryParams.get('showOpenInAppHint') === 'true';
    const emailClient = queryParams.get('emailClient') === 'true';
    
    console.log('StudentDashboard: PWA parameters:', {
      pwaInstall,
      showGuide,
      alreadyInstalled,
      forceBrowser,
      showOpenInAppHint,
      emailClient,
      isInstallable,
      isInstalled
    });

    if (forceBrowser) {
      console.log('📱 Force browser mode detected - skipping PWA features');
      return;
    }



    if (alreadyInstalled) {
      // Show message that PWA is already installed
      const timer = setTimeout(() => {
        showToast({
          title: "App Already Installed! 🎉",
          description: "LuminateLearn is already installed on your device. You can find it on your home screen or in your applications folder.",
          status: "info",
          duration: 8000,
        });
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (pwaInstall === 'install' || showGuide) {
      if (isInstalled) {
        // PWA is already installed, show guidance on how to access it
        const timer = setTimeout(() => {
                  showToast({
          title: "App Already Installed! 🎉",
          description: "LuminateLearn is already installed. Look for the app icon on your home screen or in your applications.",
          status: "success",
          duration: 8000,
        });
        }, 1000);
        return () => clearTimeout(timer);
      } else if (isInstallable) {
        // Show PWA installation prompt
        const timer = setTimeout(() => {
          setShowPWAPrompt(true);
          console.log('📱 PWA installation prompted from email link');
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        // PWA not installable, show instructions
        const timer = setTimeout(() => {
                  showToast({
          title: "Manual Installation Required",
          description: "Look for an install button in your browser address bar, or check your browser menu for 'Install LuminateLearn' or 'Add to Home Screen'.",
          status: "info",
          duration: 10000,
        });
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
    }, [pwaInstall, isInstallable, isInstalled, queryParams, showToast]);

  // Handle PWA installation action
  const handlePWAInstall = async () => {
    try {
      await installPWA();
      setShowPWAPrompt(false);
      
      // Clean up URL parameter after installation attempt
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('pwa');
      window.history.replaceState({}, '', newUrl.toString());
      
      console.log('✅ PWA installation completed from Student Dashboard');
    } catch (error) {
      console.error('❌ PWA installation failed:', error);
    }
  };

  // Clean up email link parameters from URL after successful load
  useEffect(() => {
    // Only clean up after data has finished loading and component is ready
    if (!loading && currentUserData) {
      const cleanupTimer = setTimeout(() => {
        const currentUrl = new URL(window.location.href);
        let urlChanged = false;

        // Email link parameters that should be cleaned up for better UX
        const emailLinkParams = [
          'studentEmail',        // Student identification (internal use only)
          'source',              // Source tracking (email/direct)
          'pwa',                 // PWA mode indicator  
          'from',                // Origin tracking (email/launcher)
          'emailAccess',         // Email access bypass flag
          'forceBrowser',        // Browser mode forcing
          'showInstall',         // Install guide trigger
          'showGuide'            // Installation guide flag
        ];

        // Remove email link parameters one by one
        emailLinkParams.forEach(param => {
          if (currentUrl.searchParams.has(param)) {
            console.log(`[StudentDashboard] 🧹 Cleaning URL parameter: ${param}`);
            currentUrl.searchParams.delete(param);
            urlChanged = true;
          }
        });

        // Update URL without page reload if any parameters were removed
        if (urlChanged) {
          const cleanUrl = currentUrl.toString();
          console.log('[StudentDashboard] ✨ URL cleaned:', cleanUrl);
          window.history.replaceState({}, '', cleanUrl);
        }
      }, 2000); // 2 second delay to ensure everything is loaded

      return () => clearTimeout(cleanupTimer);
    }
  }, [loading, currentUserData]); // Trigger when loading completes and user data is available

  // Listen for assignment notifications via BroadcastChannel and Service Worker
  useEffect(() => {
    let assignmentChannel: BroadcastChannel | null = null;

    // Initialize BroadcastChannel for assignment notifications
    try {
      assignmentChannel = new BroadcastChannel('luminatelearn-assignments');
      console.log('[StudentDashboard] 📡 BroadcastChannel initialized');

      const handleAssignmentMessage = (event: MessageEvent) => {
        console.log('[StudentDashboard] 📨 BroadcastChannel message:', event.data);
        
        if (event.data?.type === 'ASSIGNMENT_AVAILABLE') {
          console.log('[StudentDashboard] 🎯 New assignment notification received');
          setHasNewAssignments(true);
          
          // Show toast notification
          showToast({
            title: "New Assignment Available! 🎯",
            description: "A new assignment has been shared with you. Check your assignments tab!",
            status: "info",
            duration: 6000,
          });
          
                     // Auto-refresh assignments after a short delay
           setTimeout(() => {
             console.log('[StudentDashboard] 🔄 Auto-refreshing assignments');
             window.location.reload(); // Simple refresh for now
           }, 2000);
        }
      };

             assignmentChannel.onmessage = handleAssignmentMessage;
    } catch (error) {
      console.warn('[StudentDashboard] ⚠️ BroadcastChannel not supported:', error);
    }

    // Listen for Service Worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('[StudentDashboard] 🔧 Service Worker message:', event.data);
      
      if (event.data?.type === 'ASSIGNMENT_NOTIFICATION') {
        console.log('[StudentDashboard] 🎯 Assignment notification from Service Worker');
        setHasNewAssignments(true);
        
        showToast({
          title: "Assignment Ready! 🚀",
          description: "Your assignment is ready to play. Welcome back!",
          status: "success",
          duration: 5000,
        });
        
                 // Refresh data
         setTimeout(() => {
           window.location.reload(); // Simple refresh for now
         }, 1500);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

         // Cleanup function
     return () => {
       if (assignmentChannel) {
         assignmentChannel.close();
       }
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [showToast]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        if (isTeacherView && studentId) {
          // Get the student data
          const studentDocRef = doc(db, 'users', studentId);
          const studentDoc = await getDoc(studentDocRef);
          
          if (studentDoc.exists()) {
            const data = studentDoc.data();
            setStudentData({
              id: studentDoc.id,
              ...data
            });
            
            // Fetch data for the specified student
            await fetchStudentSpecificData(data.email);
          } else {
            console.error("Student not found");
            navigate('/teacher'); // Redirect back if student not found
          }
        } else if (!currentUser && !isEmailLinkAccess) {
          // Not teacher view and no current user (unless email link access)
          console.log('[StudentDashboard] No current user and not email link access - redirecting to login');
          navigate('/login');
          return;
        } else if (currentUser) {
          // Regular student view for the current user
          // If this is email link access OR we have stored student email, use it for data fetching
          if (isEmailLinkAccess) {
            const studentEmailParam = queryParams.get('studentEmail') || sessionStorage.getItem('student_email');
            if (studentEmailParam) {
              console.log('[StudentDashboard] ✅ Authenticated email link user - fetching data for:', studentEmailParam);
              await fetchStudentSpecificData(studentEmailParam);
            } else {
              await fetchStudentData();
            }
          } else {
            // Check if we have a stored student email from previous email link access
            const storedStudentEmail = sessionStorage.getItem('student_email');
            if (storedStudentEmail && sessionStorage.getItem('direct_token_access') === 'true') {
              console.log('[StudentDashboard] ✅ Using stored student email for authenticated user:', storedStudentEmail);
              await fetchStudentSpecificData(storedStudentEmail);
            } else {
              await fetchStudentData();
            }
          }
        } else if (isEmailLinkAccess) {
          // Email link access - authenticate the user properly
          const studentEmailParam = queryParams.get('studentEmail');
          if (studentEmailParam) {
            console.log('🔐 Email link access detected - using simplified approach for:', studentEmailParam);
            
            // Use simplified approach - fetch student data directly
              await fetchStudentSpecificData(studentEmailParam);
              
              // Fetch actual student name from users collection
              let studentDisplayName = studentEmailParam.split('@')[0]; // Fallback
              try {
                console.log('[StudentDashboard] Fetching student name from users collection for email:', studentEmailParam);
                const usersQuery = query(
                  collection(db, 'users'),
                  where('email', '==', studentEmailParam.toLowerCase()),
                  limit(1)
                );
                const usersSnapshot = await getDocs(usersQuery);
                
                if (!usersSnapshot.empty) {
                  const userData = usersSnapshot.docs[0].data();
                  if (userData.name) {
                    studentDisplayName = userData.name;
                    console.log('[StudentDashboard] Found student name in users collection:', userData.name);
                  } else {
                    console.log('[StudentDashboard] No name field in user document, using email prefix');
                  }
                } else {
                  console.log('[StudentDashboard] No user found in users collection, using email prefix');
                }
              } catch (nameError) {
                console.error('[StudentDashboard] Error fetching student name from users collection:', nameError);
              }
              
              // Set minimal user data for display with proper name
              setCurrentUserData({
                id: 'email_link_user',
                email: studentEmailParam,
                name: studentDisplayName
              });
          } else {
            console.log('[StudentDashboard] Email link access but no studentEmail parameter');
            navigate('/login');
            return;
          }
        }
      } catch (error) {
        console.error('Error in data fetching:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser, navigate, studentId, isTeacherView, isEmailLinkAccess]);
  
  // Function to fetch data for a specific student (used in teacher view)
  const fetchStudentSpecificData = async (studentEmail: string) => {
    try {
      // Fetch assignments
      await fetchAssignmentsForEmail(studentEmail);
      
      // Fetch attempts/progress
      await fetchAttemptsForEmail(studentEmail);
      
      // Fetch available free games
      await fetchFreeGames();
      
      // Fetch high scores if available
      if (studentId) {
        await fetchHighScoresForStudent(studentId);
      } else if (currentUser?.uid) {
        // For email link users who are now authenticated, use their current user ID
        await fetchHighScoresForStudent(currentUser.uid);
      }
    } catch (error) {
      console.error('Error fetching student specific data:', error);
    }
  };
  
  const fetchStudentData = async () => {
    try {
      // First, fetch the current user's data from the database
      if (currentUser?.uid) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setCurrentUserData({
            id: userDoc.id,
            ...userDoc.data()
          });
        }
      }
      
      // Fetch assignments
      await fetchAssignments();
      
      // Fetch attempts/progress
      await fetchAttempts();
      
      // Fetch available free games
      await fetchFreeGames();
      
      // Fetch high scores
      await fetchHighScores();
    } catch (error) {
      console.error('Error fetching student data:', error);
    }
  };
  
  const fetchAssignmentsForEmail = async (email: string) => {
    try {
      // Query for assignments where the student email matches
      const assignmentsQuery = query(
        collection(db, 'assignments'),
        where('studentEmail', '==', email)
      );
      
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const assignmentsList = assignmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Assignment[];
      
      // Sort by deadline - upcoming first
      assignmentsList.sort((a, b) => {
        const dateA = a.deadline?.toDate() || new Date();
        const dateB = b.deadline?.toDate() || new Date();
        return dateA.getTime() - dateB.getTime();
      });
      
      setAssignments(assignmentsList);
      
      // Fetch game configurations for thumbnails
      await fetchGameConfigs(assignmentsList);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };
  
  const fetchAssignments = async () => {
    if (!currentUser?.email) return;
    await fetchAssignmentsForEmail(currentUser.email);
  };
  
  const fetchAttemptsForEmail = async (email: string) => {
    // Students don't have permission to read attempts collection
    // Only teachers can view attempts, so we skip this for students
    return;
  };
  
  const fetchAttempts = async () => {
    // Students don't have permission to read attempts collection
    return;
  };
  
  const fetchHighScoresForStudent = async (uid: string) => {
    try {
      // Fetch high scores from the user document
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setHighScores(userData.highScores || []);
      }
    } catch (error) {
      console.error('Error fetching high scores:', error);
    }
  };
  
  const fetchHighScores = async () => {
    if (!currentUser?.uid) return;
    await fetchHighScoresForStudent(currentUser.uid);
  };
  
  const fetchFreeGames = async () => {
    try {
      // Query for public/free games
      const gamesQuery = query(
        collection(db, 'userGameConfigs'),
        where('share', '==', true) // Only get games marked as shared/public
      );
      
      const gamesSnapshot = await getDocs(gamesQuery);
      const gamesList = gamesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Game[];
      
      setFreeGames(gamesList);
    } catch (error) {
      console.error('Error fetching free games:', error);
    }
  };
  
  // Function to fetch game configurations for assignments
  const fetchGameConfigs = async (assignmentsList: Assignment[]) => {
    try {
      const gameIds = [...new Set(assignmentsList.map(assignment => assignment.gameId).filter(Boolean))];
      
      if (gameIds.length === 0) return;
      
      const configs: {[key: string]: any} = {};
      
      // Fetch each game config
      for (const gameId of gameIds) {
        try {
          const gameConfigRef = doc(db, 'userGameConfigs', gameId);
          const gameConfigDoc = await getDoc(gameConfigRef);
          
          if (gameConfigDoc.exists()) {
            configs[gameId] = {
              id: gameConfigDoc.id,
              ...gameConfigDoc.data()
            };
          }
        } catch (error) {
          console.error(`Error fetching game config for ${gameId}:`, error);
        }
      }
      
      setGameConfigs(configs);
    } catch (error) {
      console.error('Error fetching game configs:', error);
    }
  };
  
  const handlePlayGame = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };
  
  const handlePlayAssignment = (assignment: Assignment) => {
    if (assignment.linkToken) {
      navigate(`/play?token=${assignment.linkToken}`);
    }
  };
  
  const getProgressPercentage = (assignment: Assignment) => {
    if (!assignment.timesRequired) return 0;
    return Math.min(100, Math.round((assignment.completedCount || 0) / assignment.timesRequired * 100));
  };
  
  // Helper function to determine the maximum possible score for a game type/config
  const getMaxScoreForGame = (gameType: string, gameConfig?: any) => {
    switch (gameType) {
      case 'sort-categories-egg':
      case 'sort-categories-egg-reveal':
        // Max score = number of eggs × 10 points per egg
        const eggQty = gameConfig?.eggQty || 6; // Default to 6 eggs
        return eggQty * 10;
      
      case 'whack-a-mole':
        // Max score depends on game speed/difficulty
        const speed = gameConfig?.speed || gameConfig?.difficulty || 'medium';
        let maxScore;
        
        switch (speed.toLowerCase()) {
          case 'low':
          case 'easy':
            maxScore = 60; // Fewer moles, lower max score
            break;
          case 'high':
          case 'hard':
            maxScore = 120; // More moles, higher max score
            break;
          case 'medium':
          default:
            maxScore = 90; // Standard medium difficulty
            break;
        }
        
        // If config has targetScore, use that instead
        if (gameConfig?.targetScore) {
          maxScore = gameConfig.targetScore;
        }
        
        return maxScore;
      
      case 'spinner-wheel':
        // Usually completion-based, typically 100 points
        const spinnerMax = gameConfig?.maxScore || 100;
        return spinnerMax;
      
      case 'place-value-showdown':
        // Max score is based on winning score × maximum possible value
        const winningScore = gameConfig?.winningScore || 5;
        return winningScore * 20; // Approximate max points per round
        
      default:
        return 100; // Fallback
    }
  };

  // Enhanced star rating system based on percentage achievement
  const renderStars = (score: number, gameType?: string, gameConfig?: any, maxScore?: number) => {
    // Determine the actual maximum score for this game
    const actualMaxScore = maxScore || getMaxScoreForGame(gameType || '', gameConfig);
    
    // Calculate percentage achievement
    const percentage = Math.min(100, Math.max(0, (score / actualMaxScore) * 100));
    
    // Determine star count and achievement level based on percentage
    let starCount: number;
    let achievementLevel: string;
    let levelColor: string;
    
    if (percentage >= 96) {
      starCount = 5;
      achievementLevel = "MASTER";
      levelColor = "#FFD700"; // Gold
    } else if (percentage >= 85) {
      starCount = 4;
      achievementLevel = "EXPERT";
      levelColor = "#FF6B6B"; // Red
    } else if (percentage >= 70) {
      starCount = 3;
      achievementLevel = "SKILLED";
      levelColor = "#4ECDC4"; // Teal
    } else if (percentage >= 50) {
      starCount = 2;
      achievementLevel = "LEARNER";
      levelColor = "#45B7D1"; // Blue
    } else {
      starCount = 1;
      achievementLevel = "BEGINNER";
      levelColor = "#96CEB4"; // Green
    }
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4px' }}>
        {/* Stars */}
        <div style={{ display: 'flex', marginBottom: '4px' }}>
          {[...Array(5)].map((_, i) => (
            <div 
              key={i}
              style={{
                fontSize: '20px',
                color: i < starCount ? '#FFD700' : '#E2E8F0',
                marginRight: '2px',
                textShadow: i < starCount ? '0 1px 3px rgba(0,0,0,0.3)' : 'none'
              }}
            >
              ★
            </div>
          ))}
        </div>
        
        {/* Achievement level and percentage */}
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: levelColor,
          backgroundColor: `${levelColor}15`,
          padding: '2px 8px',
          borderRadius: '12px',
          textAlign: 'center',
          border: `1px solid ${levelColor}40`
        }}>
          {achievementLevel}
        </div>
        
        <div style={{
          fontSize: '10px',
          color: colors.textLight,
          marginTop: '2px'
        }}>
          {Math.round(percentage)}% ({score}/{actualMaxScore})
        </div>
      </div>
    );
  };
  
  // Render a badge based on completion count
  const renderBadge = (count: number) => {
    let badgeColor = colors.accent2; // Default
    let badgeText = 'Beginner';
    
    if (count >= 20) {
      badgeColor = colors.accent3;
      badgeText = 'Master';
    } else if (count >= 10) {
      badgeColor = colors.accent1;
      badgeText = 'Expert';
    } else if (count >= 5) {
      badgeColor = colors.secondary;
      badgeText = 'Skilled';
    }
    
    return (
      <div style={{
        backgroundColor: badgeColor,
        color: colors.text,
        borderRadius: '16px',
        padding: '4px 12px',
        fontSize: '14px',
        fontWeight: 'bold',
        display: 'inline-block'
      }}>
        {badgeText}
      </div>
    );
  };
  
  const renderTabButton = (tabName: string, label: string, emoji: string) => (
    <button
      onClick={() => setActiveTab(tabName)}
      style={{
        padding: '12px',
        backgroundColor: activeTab === tabName ? colors.primary : 'transparent',
        color: activeTab === tabName ? 'white' : colors.text,
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '16px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: activeTab === tabName ? '0 4px 6px rgba(66, 153, 225, 0.3)' : 'none',
        transition: 'all 0.2s ease'
      }}
    >
      <span style={{ marginRight: '8px', fontSize: '20px' }}>{emoji}</span>
      {label}
    </button>
  );
  
  const renderAssignmentsTab = () => {
    const today = new Date();
    
    // Categorize assignments
    const overdueAssignments = assignments.filter(assignment => {
      const deadline = assignment.deadline?.toDate();
      return deadline && deadline < today && 
             (assignment.status === 'assigned' || assignment.status === 'started');
    });
    
    const currentAssignments = assignments.filter(assignment => {
      const deadline = assignment.deadline?.toDate();
      return (assignment.status === 'assigned' || assignment.status === 'started') &&
             (!deadline || deadline >= today);
    });
    
    const completedAssignments = assignments.filter(assignment => 
      assignment.status === 'completed'
    );
    
    // Assignment card component with status-based styling
    const AssignmentCard = ({ assignment, sectionType }: { assignment: any, sectionType: 'overdue' | 'current' | 'completed' }) => {
      const getBorderColor = () => {
        switch(sectionType) {
          case 'overdue': return '#F56565'; // Red
          case 'current': return '#4299E1'; // Blue  
          case 'completed': return '#48BB78'; // Green
          default: return '#E2E8F0';
        }
      };
      
      const getBackgroundColor = () => {
        switch(sectionType) {
          case 'overdue': return '#FFF5F5'; // Light red
          case 'current': return colors.cardBg; // White
          case 'completed': return '#F0FFF4'; // Light green
          default: return colors.cardBg;
        }
      };
      
      // Get game config for thumbnail
      const gameConfig = gameConfigs[assignment.gameId];
      
      return (
        <div 
          key={assignment.id}
          style={{
            backgroundColor: getBackgroundColor(),
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            border: `2px solid ${getBorderColor()}`,
            cursor: sectionType !== 'completed' ? 'pointer' : 'default',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            opacity: sectionType === 'completed' ? 0.8 : 1
          }}
          onClick={() => sectionType !== 'completed' && handlePlayAssignment(assignment)}
        >
          {/* Game thumbnail */}
          <div style={{
            height: '120px',
            backgroundColor: '#EDF2F7',
            borderRadius: '12px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: `1px solid ${getBorderColor()}20` // 20% opacity of border color
          }}>
            {gameConfig?.thumbnail ? (
              <img 
                src={gameConfig.thumbnail} 
                alt={assignment.gameName}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  borderRadius: '12px'
                }}
              />
            ) : (
              <div style={{
                fontSize: '48px',
                color: getBorderColor(),
                opacity: 0.7
              }}>
                                {gameConfig?.type === 'whack-a-mole' ? '🔨' :
                 gameConfig?.type === 'sort-categories-egg' ? '🥚' :
                 gameConfig?.type === 'place-value-showdown' ? '🎯' : '🎮'}
              </div>
            )}
          </div>
          
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: colors.text }}>
            {assignment.gameName}
          </h3>
          
          <div style={{ marginBottom: '12px', color: colors.textLight, fontSize: '14px' }}>
            Due: {assignment.deadline?.toDate().toLocaleDateString() || 'No deadline'}
            {sectionType === 'overdue' && (
              <span style={{ 
                marginLeft: '8px',
                color: '#E53E3E', 
                fontSize: '12px', 
                fontWeight: 'bold',
                backgroundColor: '#FED7D7',
                padding: '2px 6px',
                borderRadius: '12px'
              }}>
                OVERDUE
              </span>
            )}
          </div>
          
          <div style={{ marginBottom: '8px', fontSize: '14px' }}>
            <span style={{ color: colors.textLight }}>Progress: </span>
            <span style={{ fontWeight: 'bold', color: colors.text }}>
              {assignment.completedCount || 0} / {assignment.timesRequired || 1}
            </span>
          </div>
          
          <div style={{ 
            height: '12px', 
            backgroundColor: '#E2E8F0', 
            borderRadius: '6px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              height: '100%', 
              width: `${getProgressPercentage(assignment)}%`,
              backgroundColor: getProgressPercentage(assignment) === 100 ? '#48BB78' : getBorderColor(),
              borderRadius: '6px'
            }} />
          </div>
          
          <div style={{ 
            marginTop: '16px',
            padding: '8px',
            backgroundColor: sectionType === 'completed' ? '#C6F6D5' : colors.background,
            borderRadius: '8px',
            textAlign: 'center',
            fontWeight: 'bold',
            color: sectionType === 'completed' ? '#2F855A' : getBorderColor()
          }}>
            {sectionType === 'completed' ? '✅ Completed!' : 
             sectionType === 'overdue' ? '🚨 Complete Now!' : '▶️ Play Now'}
          </div>
        </div>
      );
    };
    
    return (
      <div style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '24px', color: colors.text }}>
          My Assignments
        </h2>
        
        {assignments.length === 0 ? (
          <div style={{
            backgroundColor: colors.cardBg,
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>📚</span>
            <p style={{ color: colors.textLight, fontSize: '18px' }}>
              You don't have any assignments yet!
            </p>
          </div>
        ) : (
          <>
            {/* Not-Yet-Done Assignments Section */}
            {overdueAssignments.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '16px',
                  backgroundColor: '#FED7D7',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #F56565'
                }}>
                  <span style={{ fontSize: '24px', marginRight: '12px' }}>🚨</span>
                  <h3 style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: '#C53030',
                    margin: 0 
                  }}>
                    Not-Yet-Done Assignments ({overdueAssignments.length})
                  </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {overdueAssignments.map(assignment => (
                    <AssignmentCard key={assignment.id} assignment={assignment} sectionType="overdue" />
                  ))}
                </div>
              </div>
            )}
            
            {/* Current Assignments Section */}
            {currentAssignments.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '16px',
                  backgroundColor: '#EBF8FF',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #4299E1'
                }}>
                  <span style={{ fontSize: '24px', marginRight: '12px' }}>📋</span>
                  <h3 style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: '#2B6CB0',
                    margin: 0 
                  }}>
                    Current Assignments ({currentAssignments.length})
                  </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {currentAssignments.map(assignment => (
                    <AssignmentCard key={assignment.id} assignment={assignment} sectionType="current" />
                  ))}
                </div>
              </div>
            )}
            
            {/* Completed Assignments Section */}
            {completedAssignments.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '16px',
                  backgroundColor: '#F0FFF4',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #48BB78'
                }}>
                  <span style={{ fontSize: '24px', marginRight: '12px' }}>✅</span>
                  <h3 style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: '#2F855A',
                    margin: 0 
                  }}>
                    Completed Assignments ({completedAssignments.length})
                  </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {completedAssignments.map(assignment => (
                    <AssignmentCard key={assignment.id} assignment={assignment} sectionType="completed" />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };
  
  const renderProgressTab = () => (
    <div style={{ marginTop: '24px' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '16px', color: colors.text }}>
        My Progress
      </h2>
      
      {attempts.length === 0 ? (
        <div style={{
          backgroundColor: colors.cardBg,
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}>
          <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>🌱</span>
          <p style={{ color: colors.textLight, fontSize: '18px' }}>
            You haven't played any games yet. Try one to see your progress!
          </p>
        </div>
      ) : (
        <div>
          {/* Summary stats section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              backgroundColor: colors.cardBg,
              padding: '16px',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.primary }}>
                {attempts.length}
              </div>
              <div style={{ color: colors.textLight }}>Games Played</div>
              {renderBadge(attempts.length)}
            </div>
            
            <div style={{
              backgroundColor: colors.cardBg,
              padding: '16px',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.primary }}>
                {assignments.filter(a => a.status === 'completed').length}
              </div>
              <div style={{ color: colors.textLight }}>Assignments Completed</div>
            </div>
            
            <div style={{
              backgroundColor: colors.cardBg,
              padding: '16px',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.primary }}>
                {highScores.length}
              </div>
              <div style={{ color: colors.textLight }}>High Scores</div>
            </div>
          </div>
          
          {/* Recent activity */}
          <h3 style={{ fontSize: '18px', marginBottom: '12px', color: colors.text }}>
            Recent Activity
          </h3>
          
          <div style={{
            backgroundColor: colors.cardBg,
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            {attempts.slice(0, 5).map((attempt, index) => {
              // Find the assignment for this attempt to get game type
              const relatedAssignment = assignments.find(a => a.id === attempt.assignmentId);
              const gameConfig = relatedAssignment ? gameConfigs[relatedAssignment.gameId] : undefined;
              
              return (
                <div
                  key={attempt.id}
                  style={{
                    padding: '12px',
                    borderBottom: index < 4 ? '1px solid #E2E8F0' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: colors.text }}>
                      {attempt.assignmentId ? `Assignment #${attempt.assignmentId.substr(0, 5)}...` : 'Free Play'}
                    </div>
                    <div style={{ fontSize: '14px', color: colors.textLight }}>
                      {attempt.timestamp?.toDate().toLocaleString() || 'Unknown date'}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: colors.primary }}>
                      {attempt.score !== undefined ? `${attempt.score} points` : 'Completed'}
                    </div>
                    {attempt.score !== undefined && renderStars(
                      attempt.score,
                      relatedAssignment?.gameType || gameConfig?.type || 'unknown',
                      gameConfig
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
  
  const renderFreePlayTab = () => {
    // Get unique games from assignments for replay
    const assignedGames = assignments.reduce((acc, assignment) => {
      if (assignment.gameId && gameConfigs[assignment.gameId]) {
        const gameConfig = gameConfigs[assignment.gameId];
        // Use gameId as key to avoid duplicates
        acc[assignment.gameId] = {
          ...gameConfig,
          id: assignment.gameId,
          name: assignment.gameName,
          assignmentCount: (acc[assignment.gameId]?.assignmentCount || 0) + 1
        };
      }
      return acc;
    }, {} as {[key: string]: any});

    const assignedGamesList = Object.values(assignedGames);

    return (
      <div style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '24px', color: colors.text }}>
          Free Play
        </h2>
        
        {/* Previously Assigned Games Section */}
        {assignedGamesList.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '16px',
              backgroundColor: '#E6FFFA',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '2px solid #38B2AC'
            }}>
              <span style={{ fontSize: '24px', marginRight: '12px' }}>🎯</span>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: '#2C7A7B',
                margin: 0 
              }}>
                My Assigned Games ({assignedGamesList.length})
              </h3>
            </div>
            <p style={{ 
              color: colors.textLight, 
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              Practice with games you've been assigned. Perfect your skills anytime!
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {assignedGamesList.map(game => (
                <div 
                  key={game.id}
                  style={{
                    backgroundColor: colors.cardBg,
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                    border: '2px solid #38B2AC',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onClick={() => handlePlayGame(game.id)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  {/* Game thumbnail */}
                  <div style={{
                    height: '160px',
                    backgroundColor: '#E6FFFA',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: '1px solid #38B2AC30'
                  }}>
                    {game.thumbnail ? (
                      <img 
                        src={game.thumbnail} 
                        alt={game.name}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          borderRadius: '12px'
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '48px',
                        color: '#38B2AC'
                      }}>
                        {game.type === 'whack-a-mole' ? '🔨' : 
                         game.type === 'sort-categories-egg' ? '🥚' :
                         game.type === 'place-value-showdown' ? '🎯' : '🎮'}
                      </div>
                    )}
                  </div>
                  
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: colors.text }}>
                    {game.name || game.title}
                  </h3>
                  
                  <div style={{ fontSize: '14px', color: colors.textLight, marginBottom: '8px' }}>
                    Type: {game.type || game.gameType}
                  </div>
                  
                  <div style={{ fontSize: '14px', color: colors.textLight, marginBottom: '16px' }}>
                    Assigned {game.assignmentCount} time{game.assignmentCount > 1 ? 's' : ''}
                  </div>
                  
                  <div style={{ 
                    padding: '8px',
                    backgroundColor: '#38B2AC',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: 'white'
                  }}>
                    🎯 Practice Game
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Public Games Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '16px',
            backgroundColor: '#F0FFF4',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '2px solid #48BB78'
          }}>
            <span style={{ fontSize: '24px', marginRight: '12px' }}>🌟</span>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: '#2F855A',
              margin: 0 
            }}>
              Public Games ({freeGames.length})
            </h3>
          </div>
          
          {freeGames.length === 0 ? (
            <div style={{
              backgroundColor: colors.cardBg,
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}>
              <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>🎮</span>
              <p style={{ color: colors.textLight, fontSize: '18px' }}>
                No public games available right now. Check back later!
              </p>
            </div>
          ) : (
            <>
              <p style={{ 
                color: colors.textLight, 
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                Explore games shared by teachers for everyone to enjoy!
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {freeGames.map(game => (
                  <div 
                    key={game.id}
                    style={{
                      backgroundColor: colors.cardBg,
                      borderRadius: '16px',
                      padding: '16px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                      border: '2px solid #48BB78',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onClick={() => handlePlayGame(game.id)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                    }}
                  >
                    {/* Game thumbnail */}
                    <div style={{
                      height: '160px',
                      backgroundColor: '#F0FFF4',
                      borderRadius: '12px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: '1px solid #48BB7830'
                    }}>
                      {game.thumbnail ? (
                        <img 
                          src={game.thumbnail} 
                          alt={game.name || game.title}
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            borderRadius: '12px'
                          }}
                        />
                      ) : (
                        <div style={{
                          fontSize: '48px',
                          color: '#48BB78'
                        }}>
                          {game.type === 'whack-a-mole' ? '🔨' : 
                           game.type === 'sort-categories-egg' ? '🥚' :
                           game.type === 'place-value-showdown' ? '🎯' : '🎮'}
                        </div>
                      )}
                    </div>
                    
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: colors.text }}>
                      {game.name || game.title}
                    </h3>
                    
                    <div style={{ fontSize: '14px', color: colors.textLight, marginBottom: '16px' }}>
                      Type: {game.type || game.gameType}
                    </div>
                    
                    <div style={{ 
                      padding: '8px',
                      backgroundColor: '#48BB78',
                      borderRadius: '8px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: 'white'
                    }}>
                      🌟 Play Free Game
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Show message if no games available at all */}
        {assignedGamesList.length === 0 && freeGames.length === 0 && (
          <div style={{
            backgroundColor: colors.cardBg,
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            <span style={{ fontSize: '64px', marginBottom: '16px', display: 'block' }}>🎮</span>
            <h3 style={{ fontSize: '20px', marginBottom: '8px', color: colors.text }}>
              No Games Available
            </h3>
            <p style={{ color: colors.textLight, fontSize: '16px' }}>
              You don't have any assigned games yet, and there are no public games available. 
              Check back later or ask your teacher about assignments!
            </p>
          </div>
        )}
      </div>
    );
  };
  
  const renderHighScoresTab = () => {
    // Get achievement badge based on percentage performance (like star system)
    const getAchievementBadge = (score: number, gameType?: string, gameConfig?: any) => {
      // Calculate percentage using same logic as star system
      const actualMaxScore = getMaxScoreForGame(gameType || '', gameConfig);
      const percentage = Math.min(100, Math.max(0, (score / actualMaxScore) * 100));
      
      // Use percentage thresholds instead of raw scores
      if (percentage >= 96) return { emoji: '🏆', text: 'LEGEND', color: '#FFD700', bgColor: '#FFF8DC' };
      if (percentage >= 85) return { emoji: '🥇', text: 'CHAMPION', color: '#FFD700', bgColor: '#FFF8DC' };
      if (percentage >= 70) return { emoji: '🥈', text: 'EXPERT', color: '#C0C0C0', bgColor: '#F8F8FF' };
      if (percentage >= 50) return { emoji: '🥉', text: 'SKILLED', color: '#CD7F32', bgColor: '#FDF5E6' };
      if (percentage >= 25) return { emoji: '⭐', text: 'RISING STAR', color: '#32CD32', bgColor: '#F0FFF0' };
      return { emoji: '🌟', text: 'ACHIEVER', color: '#4169E1', bgColor: '#F0F8FF' };
    };
    
    // Create motivational message based on progress
    const getMotivationalMessage = () => {
      const totalScores = enhancedHighScores.length;
      const topScore = enhancedHighScores[0]?.score || 0;
      
      if (totalScores === 0) {
        return "🎮 Start playing games to unlock your first achievement!";
      } else if (totalScores === 1) {
        return "🌟 Great start! Keep playing to build your collection of achievements!";
      } else if (topScore >= 900) {
        return "🏆 Legendary performance! You're absolutely crushing it!";
      } else if (topScore >= 700) {
        return "🎯 Fantastic scores! You're becoming a true gaming expert!";
      } else {
        return "🚀 Keep it up! Every game makes you stronger!";
      }
    };
    
    // High Score Card Component
    const HighScoreCard = ({ score, index }: { score: HighScore, index: number }) => {
      const badge = getAchievementBadge(score.score, score.gameType, score.gameConfig);
      const gameConfig = score.gameConfig;
      const isTopScore = index === 0;
      
      return (
        <div 
          style={{
            backgroundColor: isTopScore ? '#FFF8DC' : colors.cardBg,
            borderRadius: '20px',
            padding: '20px',
            boxShadow: isTopScore 
              ? '0 8px 25px rgba(255, 215, 0, 0.3)' 
              : '0 4px 12px rgba(0, 0, 0, 0.08)',
            border: isTopScore ? '3px solid #FFD700' : '2px solid #E2E8F0',
            position: 'relative',
            transform: isTopScore ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.3s ease'
          }}
        >
          {/* Top Performer Crown */}
          {isTopScore && (
            <div style={{
              position: 'absolute',
              top: '-15px',
              right: '20px',
              backgroundColor: '#FFD700',
              color: '#8B4513',
              padding: '8px 16px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '14px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              alignItems: 'center'
            }}>
              👑 TOP SCORE
            </div>
          )}
          
          {/* Game Thumbnail */}
          <div style={{
            height: '140px',
            backgroundColor: badge.bgColor,
            borderRadius: '16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: `2px solid ${badge.color}30`
          }}>
            {gameConfig?.thumbnail ? (
              <img 
                src={gameConfig.thumbnail} 
                alt={gameConfig.title}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  borderRadius: '16px'
                }}
              />
            ) : (
              <div style={{
                fontSize: '56px',
                color: badge.color,
                opacity: 0.8
              }}>
                {score.gameType === 'whack-a-mole' ? '🔨' : 
                 score.gameType === 'sort-categories-egg' ? '🥚' : 
                 score.gameType === 'spinner-wheel' ? '🎡' :
                 score.gameType === 'place-value-showdown' ? '🎯' : '🎮'}
              </div>
            )}
          </div>
          
          {/* Game Title */}
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            marginBottom: '8px', 
            color: colors.text,
            textAlign: 'center'
          }}>
            {gameConfig?.title || 'Unknown Game'}
          </h3>
          
          {/* Achievement Badge */}
          <div style={{
            backgroundColor: badge.bgColor,
            color: badge.color,
            borderRadius: '25px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
            border: `2px solid ${badge.color}40`
          }}>
            <span style={{ marginRight: '6px', fontSize: '16px' }}>{badge.emoji}</span>
            {badge.text}
          </div>
          
          {/* Score Display */}
          <div style={{
            textAlign: 'center',
            marginBottom: '12px'
          }}>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: badge.color,
              marginBottom: '4px'
            }}>
              {score.score}
            </div>
            <div style={{ fontSize: '14px', color: colors.textLight }}>
              points
            </div>
            {renderStars(score.score, score.gameType, score.gameConfig)}
          </div>
          
          {/* Date */}
          <div style={{
            fontSize: '12px',
            color: colors.textLight,
            textAlign: 'center',
            marginTop: '8px'
          }}>
            🗓️ {score.createdAt?.toDate?.() 
              ? score.createdAt.toDate().toLocaleDateString() 
              : new Date(score.createdAt).toLocaleDateString()}
          </div>
          
          {/* Rank indicator */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: isTopScore ? '#FFD700' : colors.primary,
            color: isTopScore ? '#8B4513' : 'white',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
          }}>
            #{index + 1}
          </div>
        </div>
      );
    };
    
    return (
      <div style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: colors.text }}>
          🏆 My High Scores
        </h2>
        
        {/* Motivational Header */}
        <div style={{
          backgroundColor: '#4299E1',
          color: 'white',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(66, 153, 225, 0.3)'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
            {getMotivationalMessage()}
          </div>
          <div style={{ opacity: 0.9 }}>
            {enhancedHighScores.length > 0 && (
              `You've achieved ${enhancedHighScores.length} high score${enhancedHighScores.length > 1 ? 's' : ''}!`
            )}
          </div>
        </div>
        
        {enhancedHighScores.length === 0 ? (
          <div style={{
            backgroundColor: colors.cardBg,
            borderRadius: '20px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>🏆</div>
            <h3 style={{ fontSize: '24px', marginBottom: '12px', color: colors.text }}>
              Your Trophy Case Awaits!
            </h3>
            <p style={{ color: colors.textLight, fontSize: '18px', marginBottom: '20px' }}>
              Complete games to unlock achievements and build your high score collection!
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginTop: '24px'
            }}>
              {/* Preview achievement cards */}
              {[
                { emoji: '🌟', text: 'First Score', desc: 'Complete any game' },
                { emoji: '⭐', text: 'Rising Star', desc: 'Score 500+ points' },
                { emoji: '🥇', text: 'Champion', desc: 'Score 800+ points' },
                { emoji: '🏆', text: 'Legend', desc: 'Score 900+ points' }
              ].map((achievement, index) => (
                <div key={index} style={{
                  backgroundColor: '#F7FAFC',
                  borderRadius: '12px',
                  padding: '16px',
                  opacity: 0.6,
                  textAlign: 'center',
                  border: '2px dashed #E2E8F0'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{achievement.emoji}</div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', color: colors.text }}>
                    {achievement.text}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.textLight }}>
                    {achievement.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Statistics Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '32px'
            }}>
              <div style={{
                backgroundColor: colors.cardBg,
                padding: '20px',
                borderRadius: '16px',
                textAlign: 'center',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.primary }}>
                  {enhancedHighScores.length}
                </div>
                <div style={{ color: colors.textLight }}>Total Achievements</div>
              </div>
              
              <div style={{
                backgroundColor: colors.cardBg,
                padding: '20px',
                borderRadius: '16px',
                textAlign: 'center',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FFD700' }}>
                  {enhancedHighScores[0]?.score || 0}
                </div>
                <div style={{ color: colors.textLight }}>Best Score</div>
              </div>
              
              <div style={{
                backgroundColor: colors.cardBg,
                padding: '20px',
                borderRadius: '16px',
                textAlign: 'center',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#48BB78' }}>
                  {Math.round(enhancedHighScores.reduce((sum, score) => sum + (score.score || 0), 0) / enhancedHighScores.length) || 0}
                </div>
                <div style={{ color: colors.textLight }}>Average Score</div>
              </div>
            </div>
            
            {/* High Score Cards Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '20px' 
            }}>
              {enhancedHighScores.map((score, index) => (
                <HighScoreCard key={score.id} score={score} index={index} />
              ))}
            </div>
            
            {/* Encouragement Footer */}
            <div style={{
              backgroundColor: '#F0FFF4',
              borderRadius: '16px',
              padding: '20px',
              marginTop: '32px',
              textAlign: 'center',
              border: '2px solid #48BB78'
            }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>🎯</div>
              <div style={{ color: '#2F855A', fontWeight: 'bold' }}>
                Keep playing to beat your high scores and unlock new achievements!
              </div>
            </div>
          </>
        )}
      </div>
    );
  };
  
  // Enhanced high scores loading function
  const loadEnhancedHighScores = async () => {
    if (highScoresLoading) return;
    
    setHighScoresLoading(true);
    try {
      // Get the student's userId for querying high scores
      const studentUserId = isTeacherView ? studentId : currentUser?.uid;
      
      if (!studentUserId) {
        console.log('No student userId found for high scores query');
        setEnhancedHighScores([]);
        return;
      }
      
      console.log('Querying high scores for userId:', studentUserId);
      
      // Query the highScores collection for this student by userId
      const highScoresQuery = query(
        collection(db, 'highScores'),
        where('userId', '==', studentUserId),
        orderBy('score', 'desc') // Order by score descending to get highest first
      );
      
      const highScoresSnapshot = await getDocs(highScoresQuery);
      console.log('Found high scores:', highScoresSnapshot.docs.length);
      
      const scoresWithConfigs: HighScore[] = [];
      
      for (const scoreDoc of highScoresSnapshot.docs) {
        const scoreData = scoreDoc.data();
        console.log('Processing high score:', scoreData);
        
        // Create base high score object
        const highScore: HighScore = {
          id: scoreDoc.id,
          userId: scoreData.userId || studentUserId, // Use userId, fallback for backwards compatibility
          playerName: scoreData.playerName || 'Student', // Keep for display, fallback
          score: scoreData.score,
          configId: scoreData.configId,
          createdAt: scoreData.createdAt,
          gameType: scoreData.gameType || 'unknown',
          gameConfig: null
        };
        
        // Try to fetch the game configuration
        if (scoreData.configId) {
          try {
            const gameConfigRef = doc(db, 'userGameConfigs', scoreData.configId);
            const gameConfigDoc = await getDoc(gameConfigRef);
            
            if (gameConfigDoc.exists()) {
              const configData = gameConfigDoc.data();
              highScore.gameConfig = {
                id: gameConfigDoc.id,
                title: configData.title || configData.name,
                thumbnail: configData.thumbnail || configData.thumbnailUrl,
                type: configData.type || configData.gameType,
                ...configData
              };
              console.log('Found game config for score:', highScore.gameConfig.title);
            } else {
              console.log('Game config not found for configId:', scoreData.configId);
            }
          } catch (error) {
            console.error('Error fetching game config:', error);
          }
        }
        
        scoresWithConfigs.push(highScore);
      }
      
      console.log('Enhanced high scores loaded:', scoresWithConfigs.length);
      setEnhancedHighScores(scoresWithConfigs);
      
    } catch (error) {
      console.error('Error loading enhanced high scores:', error);
      setEnhancedHighScores([]);
    } finally {
      setHighScoresLoading(false);
    }
  };
  
  // Handle back button for teacher view
  const handleBackToTeacherDashboard = () => {
    navigate('/teacher', { state: { activeTab: 'students' } });
  };
  
  // Load enhanced high scores when switching to the high scores tab
  useEffect(() => {
    if (activeTab === 'highscores' && !highScoresLoading && enhancedHighScores.length === 0) {
      loadEnhancedHighScores();
    }
  }, [activeTab]);
  
  // Enhanced email link access detection (must run BEFORE fetchData)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for email link access indicators
    const emailAccess = urlParams.get('emailAccess') === 'true';
    const fromEmail = urlParams.get('from') === 'email';
    const pwaParam = urlParams.get('pwa') === 'true';
    const studentEmailParam = urlParams.get('studentEmail');
    const sourceParam = urlParams.get('source') === 'email';
    
    // Additional email link detection
    const currentUrl = window.location.href;
    const referrer = document.referrer;
    const hasOobCodeInReferrer = referrer.includes('oobCode=');
    const hasOobCodeInUrl = currentUrl.includes('oobCode=');
    
    console.log('[StudentDashboard] Email link access detection (EARLY):', {
      emailAccess,
      fromEmail,
      pwaParam,
      studentEmailParam,
      sourceParam,
      hasOobCodeInReferrer,
      hasOobCodeInUrl,
      currentUrl
    });
    
    // Enhanced condition checking for email link access
    if (emailAccess || 
        (fromEmail && pwaParam) || 
        (fromEmail && studentEmailParam) ||
        sourceParam ||
        hasOobCodeInReferrer || 
        hasOobCodeInUrl ||
        sessionStorage.getItem('direct_token_access') === 'true') {
      
      console.log('[StudentDashboard] ✅ EARLY: Email link access detected - setting bypass flag');
      setIsEmailLinkAccess(true);
      
      // Store flag in session storage to persist across page reloads
      sessionStorage.setItem('direct_token_access', 'true');
      
      // Store the student email for future Dashboard navigation
      if (studentEmailParam) {
        sessionStorage.setItem('student_email', studentEmailParam);
        console.log('[StudentDashboard] ✅ EARLY: Stored student email for Dashboard navigation:', studentEmailParam);
      }
    }
  }, []); // Run only once on component mount
  
  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '32px 16px',
      backgroundColor: colors.background,
      minHeight: '100vh'
    }}>
      {/* Teacher view back button */}
      {isTeacherView && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleBackToTeacherDashboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 16px',
              backgroundColor: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            <span style={{ marginRight: '8px', fontSize: '18px' }}>←</span>
            Back to Teacher Dashboard
          </button>
        </div>
      )}
      
      {/* Header with welcome message */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div style={{ marginRight: '16px', fontSize: '40px' }}>👋</div>
        <div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            marginBottom: '4px',
            color: colors.text
          }}>
            {isTeacherView 
              ? `Student: ${studentData?.name || 'Unknown Student'}`
              : `Hello, ${currentUserData?.name || currentUser?.displayName || 'Student'}!`
            }
          </h1>
          <p style={{ color: colors.textLight }}>
            {isTeacherView 
              ? `Teacher view of student dashboard${studentData?.grade ? ` - Grade ${studentData.grade}` : ''}`
              : ''
            }
          </p>
        </div>
      </div>
      
      {/* PWA Install Banner - Only show for actual students, not teacher view */}
              {/* Brief install prompt for simplified single-link system */}
        {!isTeacherView && showBriefInstallPrompt && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
            zIndex: 1000,
            maxWidth: '320px',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '1.5rem' }}>📱</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  Install Our App?
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                  Get faster access to assignments
                </div>
              </div>
              <button
                onClick={installPWA}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  marginRight: '8px'
                }}
              >
                Install
              </button>
              <button
                onClick={dismissBriefInstallPrompt}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '4px',
                  opacity: 0.7
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        {!isTeacherView && <PWAInstallBanner />}
      
      {/* PWA Installation Modal - Show when triggered from email */}
      {showPWAPrompt && !isTeacherView && (
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
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            position: 'relative'
          }}>
            {/* Header with gradient background */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              margin: '-30px -30px 20px -30px',
              padding: '25px 30px',
              borderRadius: '16px 16px 0 0'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>📱</div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                Install LuminateLearn App
              </h2>
            </div>
            
            <div style={{ marginBottom: '25px' }}>
              <p style={{ 
                fontSize: '18px', 
                color: colors.text, 
                marginBottom: '15px',
                lineHeight: 1.6
              }}>
                🚀 <strong>Get the best learning experience!</strong>
              </p>
              <p style={{ 
                fontSize: '16px', 
                color: colors.textLight,
                lineHeight: 1.6
              }}>
                Install LuminateLearn as an app for faster access, 
                offline capabilities, and a native app experience!
              </p>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={handlePWAInstall}
                style={{
                  backgroundColor: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '15px 25px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(66, 153, 225, 0.3)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#3182CE';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = colors.primary;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                📱 Install App
              </button>
              
              <button
                onClick={() => {
                  setShowPWAPrompt(false);
                  // Clean up URL parameter
                  const newUrl = new URL(window.location.href);
                  newUrl.searchParams.delete('pwa');
                  window.history.replaceState({}, '', newUrl.toString());
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: colors.textLight,
                  border: `2px solid ${colors.textLight}`,
                  borderRadius: '12px',
                  padding: '13px 25px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = colors.textLight;
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = colors.textLight;
                }}
              >
                Maybe Later
              </button>
            </div>
            
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#F0FFF4',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#2F855A'
            }}>
              ✨ <strong>Benefits:</strong> Faster loading, works offline, and feels like a native app!
            </div>
          </div>
        </div>
      )}
      
      {/* Tab navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '12px',
        overflowX: 'auto',
        padding: '8px 0'
      }}>
        {renderTabButton('assignments', 'My Assignments', '📚')}
        {renderTabButton('freeplay', 'Free Play', '🎮')}
        {renderTabButton('highscores', 'High Scores', '🏆')}
      </div>
      
      {/* Loading state */}
      {loading ? (
        <LoadingSpinner 
          size="large"
        />
      ) : (
        <>
          {activeTab === 'assignments' && renderAssignmentsTab()}
          {activeTab === 'freeplay' && renderFreePlayTab()}
          {activeTab === 'highscores' && renderHighScoresTab()}
        </>
      )}
      
      {/* Toast Component - Custom positioned at top */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#FFD700',
            color: 'black',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 2000,
            maxWidth: '90%',
            textAlign: 'center',
            animation: 'slideDown 0.3s ease-out',
            fontFamily: "'Comic Neue', 'Comic Sans MS', 'Trebuchet MS', cursive, sans-serif"
          }}
        >
          <style>
            {`
              @keyframes slideDown {
                from {
                  transform: translateX(-50%) translateY(-20px);
                  opacity: 0;
                }
                to {
                  transform: translateX(-50%) translateY(0);
                  opacity: 1;
                }
              }
            `}
          </style>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
            {toastMessage.title}
          </h3>
          {toastMessage.description && (
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
              {toastMessage.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard; 