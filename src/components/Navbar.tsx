import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUnsavedChangesContext } from '../contexts/UnsavedChangesContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalCloseButton,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Text,
  Divider,
  HStack,
  useToast
} from '@chakra-ui/react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';

// Add responsive CSS for navbar
const navbarStyles = `
.navbar-responsive {
  background-color: var(--color-primary-500);
  padding: var(--spacing-3) var(--spacing-4);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
}

.navbar-left {
  display: flex;
  gap: var(--spacing-4);
  flex: 1;
  min-width: 0;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-shrink: 0;
}

.navbar-user-info {
  color: white;
  font-size: 0.9rem;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.navbar-button {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  padding: var(--spacing-2) var(--spacing-3);
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease-in-out;
  font-size: 0.9rem;
  white-space: nowrap;
}

.navbar-button:hover {
  opacity: 0.8;
  transform: translateY(-1px);
}

.navbar-button.teacher {
  background-color: rgba(255, 255, 255, 0.9);
  color: var(--color-primary-600);
  font-weight: bold;
}

.navbar-link {
  color: white;
  font-weight: bold;
  text-decoration: none;
  transition: opacity 0.2s ease-in-out;
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--border-radius-sm);
  white-space: nowrap;
}

.navbar-link:hover {
  opacity: 0.8;
}

.navbar-link.active {
  background-color: rgba(255, 255, 255, 0.2);
}

.admin-link {
  color: #FFD700 !important;
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .navbar-responsive {
    padding: var(--spacing-2) var(--spacing-3);
  }
  
  .navbar-container {
    gap: var(--spacing-1);
  }
  
  .navbar-left {
    gap: var(--spacing-2);
  }
  
  .navbar-right {
    gap: var(--spacing-1);
  }
  
  .navbar-user-info {
    max-width: 100px;
    font-size: 0.8rem;
  }
  
  .navbar-button {
    padding: var(--spacing-2);
    font-size: 0.8rem;
    min-width: 60px;
  }
  
  .navbar-button.teacher {
    font-size: 0.75rem;
    padding: var(--spacing-2) var(--spacing-3);
  }
  
  .navbar-link {
    padding: var(--spacing-2);
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .navbar-container {
    flex-wrap: nowrap;
    overflow-x: auto;
  }
  
  .navbar-user-info {
    display: none; /* Hide email on very small screens */
  }
  
  .navbar-button {
    padding: var(--spacing-1) var(--spacing-2);
    font-size: 0.75rem;
    min-width: 50px;
  }
  
  .navbar-button.teacher {
    font-size: 0.7rem;
    padding: var(--spacing-1) var(--spacing-2);
  }
  
  .navbar-link {
    padding: var(--spacing-1) var(--spacing-2);
    font-size: 0.85rem;
  }
}

@media (max-width: 360px) {
  .navbar-right {
    gap: 0;
  }
  
  .navbar-button {
    padding: var(--spacing-1);
    font-size: 0.7rem;
    min-width: 45px;
  }
  
  .navbar-button.teacher {
    font-size: 0.65rem;
    padding: var(--spacing-1);
  }
}
`;

// Teacher Signup Modal Component - defined outside to prevent recreation
const TeacherSignupModal = ({ 
  isOpen, 
  onClose, 
  teacherName, 
  setTeacherName,
  teacherEmail, 
  setTeacherEmail,
  teacherPassword, 
  setTeacherPassword,
  teacherConfirmPassword, 
  setTeacherConfirmPassword,
  isLoading,
  onEmailSignup,
  onGoogleSignup
}: {
  isOpen: boolean;
  onClose: () => void;
  teacherName: string;
  setTeacherName: (value: string) => void;
  teacherEmail: string;
  setTeacherEmail: (value: string) => void;
  teacherPassword: string;
  setTeacherPassword: (value: string) => void;
  teacherConfirmPassword: string;
  setTeacherConfirmPassword: (value: string) => void;
  isLoading: boolean;
  onEmailSignup: () => void;
  onGoogleSignup: () => void;
}) => (
  <Modal isOpen={isOpen} onClose={onClose} size="md">
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>
        <VStack spacing={2} align="center">
          <Text fontSize="2xl" fontWeight="bold" color="blue.600">
            🚀 Get Started as a Teacher
          </Text>
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Create your teacher account to start building amazing educational games
          </Text>
        </VStack>
      </ModalHeader>
      <ModalCloseButton />
      <ModalBody pb={6}>
        <VStack spacing={4}>
          <FormControl>
            <FormLabel>Full Name</FormLabel>
            <Input
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="Enter your full name"
              disabled={isLoading}
            />
          </FormControl>
          
          <FormControl>
            <FormLabel>Email Address</FormLabel>
            <Input
              type="email"
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </FormControl>
          
          <FormControl>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={teacherPassword}
              onChange={(e) => setTeacherPassword(e.target.value)}
              placeholder="Create a strong password"
              disabled={isLoading}
            />
          </FormControl>
          
          <FormControl>
            <FormLabel>Confirm Password</FormLabel>
            <Input
              type="password"
              value={teacherConfirmPassword}
              onChange={(e) => setTeacherConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={isLoading}
            />
          </FormControl>
          
          <Button
            colorScheme="blue"
            width="100%"
            onClick={onEmailSignup}
            isLoading={isLoading}
            loadingText="Creating Account..."
          >
            Create Teacher Account
          </Button>
          
          <HStack width="100%">
            <Divider />
            <Text fontSize="sm" color="gray.500">or</Text>
            <Divider />
          </HStack>
          
          <Button
            variant="outline"
            width="100%"
            onClick={onGoogleSignup}
            isLoading={isLoading}
            leftIcon={
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg>
            }
          >
            Sign up with Google
          </Button>
        </VStack>
      </ModalBody>
    </ModalContent>
  </Modal>
);

// Member Login Modal Component - defined outside to prevent recreation
const MemberLoginModal = ({ 
  isOpen, 
  onClose, 
  memberEmail, 
  setMemberEmail,
  memberPassword, 
  setMemberPassword,
  isLoading,
  onEmailLogin,
  onGoogleLogin
}: {
  isOpen: boolean;
  onClose: () => void;
  memberEmail: string;
  setMemberEmail: (value: string) => void;
  memberPassword: string;
  setMemberPassword: (value: string) => void;
  isLoading: boolean;
  onEmailLogin: () => void;
  onGoogleLogin: () => void;
}) => (
  <Modal isOpen={isOpen} onClose={onClose} size="md">
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>
        <VStack spacing={2} align="center">
          <Text fontSize="2xl" fontWeight="bold" color="blue.600">
            🔐 Members Login
          </Text>
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Sign in to access your dashboard and continue learning
          </Text>
        </VStack>
      </ModalHeader>
      <ModalCloseButton />
      <ModalBody pb={6}>
        <VStack spacing={4}>
          <FormControl>
            <FormLabel>Email Address</FormLabel>
            <Input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </FormControl>
          
          <FormControl>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={memberPassword}
              onChange={(e) => setMemberPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </FormControl>
          
          <Button
            colorScheme="blue"
            width="100%"
            onClick={onEmailLogin}
            isLoading={isLoading}
            loadingText="Signing In..."
          >
            Sign In
          </Button>
          
          <HStack width="100%">
            <Divider />
            <Text fontSize="sm" color="gray.500">or</Text>
            <Divider />
          </HStack>
          
          <Button
            variant="outline"
            width="100%"
            onClick={onGoogleLogin}
            isLoading={isLoading}
            leftIcon={
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg>
            }
          >
            Sign in with Google
          </Button>
        </VStack>
      </ModalBody>
    </ModalContent>
  </Modal>
);

const Navbar = () => {
  const { currentUser, isTeacher, isStudent, logout, loginWithGoogle } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { hasUnsavedChanges, promptBeforeLeaving } = useUnsavedChangesContext();
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Modal states
  const [isTeacherSignupOpen, setIsTeacherSignupOpen] = useState(false);
  const [isMemberLoginOpen, setIsMemberLoginOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Teacher Signup Form states
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherConfirmPassword, setTeacherConfirmPassword] = useState('');
  const [teacherName, setTeacherName] = useState('');
  
  // Member Login Form states
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  
  const toast = useToast();
  
  // Context-aware navigation detection
  const isStudentInActiveUse = () => {
    // Students using the platform are now properly authenticated
    if (currentUser && isStudent) {
      return true;
    }
    
    // Check for game access with assignment tokens (before authentication happens)
    const urlParams = new URLSearchParams(location.search);
    const isGameRoute = location.pathname === '/play';
    const assignmentToken = urlParams.get('token');
    const sessionFlag = sessionStorage.getItem('direct_token_access') === 'true';
    
    // Hide auth buttons for unauthenticated game access with assignment tokens
    return isGameRoute && (assignmentToken || sessionFlag);
  };

  // Should show auth buttons (Get Started as Teacher / Members Login)
  const studentInUse = isStudentInActiveUse();
  const shouldShowAuthButtons = !currentUser && !studentInUse;
  
  // Check if user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser) {
        setIsAdmin(false);
        return;
      }
      
      try {
        // Check if user has admin role in users collection
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, [currentUser]);
  
  // Handle navigation with unsaved changes check
  const handleNavClick = async (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    // Don't check if navigating to current page
    if (location.pathname === path) return;
    
    // Don't check if no unsaved changes
    if (!hasUnsavedChanges) return;
    
    e.preventDefault();
    
    const canProceed = await promptBeforeLeaving();
    
    if (canProceed) {
      navigate(path);
    }
  };
  
  // Handle logout with unsaved changes check
  const handleLogout = async () => {
    if (hasUnsavedChanges) {
      const canProceed = await promptBeforeLeaving('You have unsaved changes. Are you sure you want to log out?');
      if (!canProceed) return;
    }
    
    await logout();
    // Navigate to home page after successful logout
    navigate('/');
  };

  // Reset form states
  const resetForms = () => {
    setTeacherEmail('');
    setTeacherPassword('');
    setTeacherConfirmPassword('');
    setTeacherName('');
    setMemberEmail('');
    setMemberPassword('');
    setIsLoading(false);
  };

  // Close modals and reset forms
  const closeModals = () => {
    setIsTeacherSignupOpen(false);
    setIsMemberLoginOpen(false);
    resetForms();
  };

  // Handle teacher signup with email/password
  const handleTeacherEmailSignup = async () => {
    if (!teacherEmail || !teacherPassword || !teacherName) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (teacherPassword !== teacherConfirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (teacherPassword.length < 6) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 6 characters.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, teacherEmail, teacherPassword);
      const user = userCredential.user;
      
      // Update the user's display name in Firebase Auth
      await updateProfile(user, {
        displayName: teacherName
      });
      
      // Create user document in Firestore with teacher role
      await setDoc(doc(db, 'users', user.uid), {
        name: teacherName,
        email: teacherEmail,
        role: 'teacher',
        createdAt: new Date().toISOString(),
        createdBy: 'signup'
      });
      
      toast({
        title: 'Welcome to LuminateLearn!',
        description: 'Your teacher account has been created successfully.',
        status: 'success',
        duration: 3000,
      });
      closeModals();
      navigate('/teacher');
    } catch (error: any) {
      console.error('Teacher signup error:', error);
      
      // Handle specific Firebase Auth errors
      let errorTitle = 'Signup Error';
      let errorDescription = 'Failed to create account. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorTitle = 'Account Already Exists';
        errorDescription = 'This email already has an account. Please use "Members Login" to sign in instead, or use a different email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorDescription = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorDescription = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorDescription = 'Email/password accounts are not enabled. Please contact support.';
      } else if (error.code === 'auth/network-request-failed') {
        errorDescription = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorDescription = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google signup for teachers
  const handleTeacherGoogleSignup = async () => {
    setIsLoading(true);
    try {
      // Use AuthContext's native Google Sign-In
      const userCredential = await loginWithGoogle();
      if (!userCredential) return;
      const user = userCredential.user;
      
      // Check if user document already exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const newUserData = {
          name: user.displayName || 'Teacher',
          email: user.email || '',
          role: 'teacher',
          createdAt: new Date().toISOString(),
          createdBy: 'google-signup'
        };
        
        // Create user document in Firestore with teacher role
        await setDoc(userDocRef, newUserData);
      } else {
        // Update existing user to teacher role if not already set
        const userData = userDoc.data();
        
        if (userData.role !== 'teacher') {
          const updateData = {
            ...userData,
            role: 'teacher',
            updatedAt: new Date().toISOString()
          };
          
          await setDoc(userDocRef, updateData, { merge: true });
        }
      }
      
      toast({
        title: 'Welcome to LuminateLearn!',
        description: 'Successfully signed up with Google.',
        status: 'success',
        duration: 3000,
      });
      closeModals();
      navigate('/teacher');
    } catch (error: any) {
      console.error('🔴 NAVBAR: Teacher Google signup error:', error);
      
      // Handle specific error cases
      let errorTitle = 'Google Signup Error';
      let errorDescription = 'Failed to sign up with Google. Please try again.';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorTitle = 'Signup Cancelled';
        errorDescription = 'Google sign-up was cancelled.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorTitle = 'Account Already Exists';
        errorDescription = 'An account already exists with this email using a different sign-in method. Please use "Members Login" instead.';
      } else if (error.code === 'auth/popup-blocked') {
        errorDescription = 'Popup was blocked by your browser. Please allow popups and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        errorDescription = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorDescription = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        status: error.code === 'auth/popup-closed-by-user' ? 'info' : 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle member login with email/password
  const handleMemberLogin = async () => {
    if (!memberEmail || !memberPassword) {
      toast({
        title: 'Missing Information',
        description: 'Please enter your email and password.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, memberEmail, memberPassword);
      const user = userCredential.user;
      
      // Check if user exists in Firestore database
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // User doesn't exist in database - sign them out and show error
        await auth.signOut();
        toast({
          title: 'Account Not Found',
          description: 'Your account is not found in our system. Please contact your administrator or create a new account.',
          status: 'error',
          duration: 5000,
        });
        closeModals();
        return;
      }
      
      // User exists - check their role
      const userData = userDoc.data();
      if (!userData.role || (userData.role !== 'teacher' && userData.role !== 'student' && userData.role !== 'admin')) {
        // User has no role or invalid role - sign them out
        await auth.signOut();
        toast({
          title: 'Invalid Account',
          description: 'Your account is not properly configured. Please contact your administrator.',
          status: 'error',
          duration: 5000,
        });
        closeModals();
        return;
      }
      
      toast({
        title: 'Welcome Back!',
        description: 'Successfully logged in.',
        status: 'success',
        duration: 3000,
      });
      closeModals();
      // Navigation will be handled by auth state change
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Failed to log in. Please try again.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      }
      
      toast({
        title: 'Login Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google login for members
  const handleMemberGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // Use AuthContext's native Google Sign-In
      const userCredential = await loginWithGoogle();
      if (!userCredential) return;
      const user = userCredential.user;
      
      // Check if user exists in Firestore database
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // User doesn't exist in database - sign them out and show error
        await user.delete(); // This removes the user from Firebase Auth
        toast({
          title: 'Account Not Found',
          description: 'You need to create an account first. Please use "Get Started as a Teacher" to create your account.',
          status: 'error',
          duration: 5000,
        });
        closeModals();
        return;
      }
      
      // User exists - check their role
      const userData = userDoc.data();
      if (!userData.role || (userData.role !== 'teacher' && userData.role !== 'student' && userData.role !== 'admin')) {
        // User has no role or invalid role - sign them out
        await user.delete();
        toast({
          title: 'Invalid Account',
          description: 'Your account is not properly configured. Please contact your administrator.',
          status: 'error',
          duration: 5000,
        });
        closeModals();
        return;
      }
      
      toast({
        title: 'Welcome Back!',
        description: 'Successfully logged in with Google.',
        status: 'success',
        duration: 3000,
      });
      closeModals();
      // Navigation will be handled by auth state change
    } catch (error: any) {
      console.error('Google login error:', error);
      
      // Handle specific error cases
      if (error.code === 'auth/popup-closed-by-user') {
        toast({
          title: 'Login Cancelled',
          description: 'Google sign-in was cancelled.',
          status: 'info',
          duration: 3000,
        });
      } else {
        toast({
          title: 'Login Error',
          description: 'Failed to log in with Google. Please try again.',
          status: 'error',
          duration: 3000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{navbarStyles}</style>
      <nav className="navbar-responsive">
        <div className="navbar-container">
          <div className="navbar-left">
            {/* Only show Home for non-authenticated users who aren't students using the app */}
            {!currentUser && !studentInUse && (
              <RouterLink 
                to="/" 
                className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}
                onClick={(e) => handleNavClick(e, '/')}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                Home
              </RouterLink>
            )}
            {isTeacher && (
              <>
                <RouterLink 
                  to="/teacher" 
                  className={`navbar-link ${location.pathname === '/teacher' ? 'active' : ''}`}
                  onClick={(e) => handleNavClick(e, '/teacher')}
                  onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Create
                </RouterLink>
              </>
            )}
            {isStudent && (
                <RouterLink 
                to="/student" 
                className={`navbar-link ${location.pathname === '/student' ? 'active' : ''}`}
                onClick={(e) => handleNavClick(e, '/student')}
                  onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                Dashboard
                </RouterLink>
            )}
                {isAdmin && (
                  <RouterLink 
                    to="/admin" 
                    className={`navbar-link admin-link ${location.pathname === '/admin' ? 'active' : ''}`}
                    onClick={(e) => handleNavClick(e, '/admin')}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Admin
                  </RouterLink>
            )}
          </div>
          
          <div className="navbar-right">
            {currentUser ? (
              <>
                <div className="navbar-user-info">{currentUser.email}</div>
                <button
                  onClick={handleLogout}
                  className="navbar-button"
                  onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Logout
                </button>
              </>
            ) : shouldShowAuthButtons ? (
              <>
                <button
                  onClick={() => setIsTeacherSignupOpen(true)}
                  className="navbar-button teacher"
                  onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Get Started as a Teacher
                </button>
                <button
                  onClick={() => setIsMemberLoginOpen(true)}
                  className="navbar-button"
                  onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Members Login
                </button>
              </>
            ) : null}
          </div>
        </div>
      </nav>
      
      {/* Modals */}
      <TeacherSignupModal 
        isOpen={isTeacherSignupOpen}
        onClose={closeModals}
        teacherName={teacherName}
        setTeacherName={setTeacherName}
        teacherEmail={teacherEmail}
        setTeacherEmail={setTeacherEmail}
        teacherPassword={teacherPassword}
        setTeacherPassword={setTeacherPassword}
        teacherConfirmPassword={teacherConfirmPassword}
        setTeacherConfirmPassword={setTeacherConfirmPassword}
        isLoading={isLoading}
        onEmailSignup={handleTeacherEmailSignup}
        onGoogleSignup={handleTeacherGoogleSignup}
      />
      <MemberLoginModal 
        isOpen={isMemberLoginOpen}
        onClose={closeModals}
        memberEmail={memberEmail}
        setMemberEmail={setMemberEmail}
        memberPassword={memberPassword}
        setMemberPassword={setMemberPassword}
        isLoading={isLoading}
        onEmailLogin={handleMemberLogin}
        onGoogleLogin={handleMemberGoogleLogin}
      />
    </>
  );
};

export default Navbar; 