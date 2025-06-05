import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUnsavedChangesContext } from '../contexts/UnsavedChangesContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';

const Navbar = () => {
  const { currentUser, isTeacher, isStudent, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { hasUnsavedChanges, promptBeforeLeaving } = useUnsavedChangesContext();
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Modal states
  const [isTeacherSignupOpen, setIsTeacherSignupOpen] = useState(false);
  const [isMemberLoginOpen, setIsMemberLoginOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  
  const toast = useToast();
  
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
  
  const navLinkStyle = (path: string) => ({
    color: 'white',
    fontWeight: 'bold',
    textDecoration: 'none',
    transition: 'opacity 0.2s ease-in-out',
    padding: 'var(--spacing-2) var(--spacing-3)',
    borderRadius: 'var(--border-radius-sm)',
    backgroundColor: location.pathname === path ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
  });

  const buttonStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    padding: 'var(--spacing-2) var(--spacing-4)',
    border: 'none',
    borderRadius: 'var(--border-radius-md)',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'opacity 0.2s ease-in-out',
    marginLeft: 'var(--spacing-2)'
  };

  const teacherButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: 'var(--color-primary-600)',
    fontWeight: 'bold'
  };
  
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
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
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
    if (!email || !password || !name) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (password.length < 6) {
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update the user's display name in Firebase Auth
      await updateProfile(user, {
        displayName: name
      });
      
      // Create user document in Firestore with teacher role
      await setDoc(doc(db, 'users', user.uid), {
        name: name,
        email: email,
        role: 'teacher',
        createdAt: serverTimestamp(),
        createdBy: 'signup'
      });
      
      toast({
        title: 'Welcome to Lumino Learning!',
        description: 'Your teacher account has been created successfully.',
        status: 'success',
        duration: 3000,
      });
      closeModals();
      navigate('/teacher');
    } catch (error: any) {
      toast({
        title: 'Signup Error',
        description: error.message || 'Failed to create account.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google signup for teachers
  const handleTeacherGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Check if user document already exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create user document in Firestore with teacher role
        await setDoc(userDocRef, {
          name: user.displayName || 'Teacher',
          email: user.email || '',
          role: 'teacher',
          createdAt: serverTimestamp(),
          createdBy: 'google-signup'
        });
      } else {
        // Update existing user to teacher role if not already set
        const userData = userDoc.data();
        if (userData.role !== 'teacher') {
          await setDoc(userDocRef, {
            ...userData,
            role: 'teacher',
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }
      
      toast({
        title: 'Welcome to Lumino Learning!',
        description: 'Successfully signed up with Google.',
        status: 'success',
        duration: 3000,
      });
      closeModals();
      navigate('/teacher');
    } catch (error: any) {
      toast({
        title: 'Google Signup Error',
        description: error.message || 'Failed to sign up with Google.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle member login with email/password
  const handleMemberLogin = async () => {
    if (!email || !password) {
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
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Welcome Back!',
        description: 'Successfully logged in.',
        status: 'success',
        duration: 3000,
      });
      closeModals();
      // Navigation will be handled by auth state change
    } catch (error: any) {
      toast({
        title: 'Login Error',
        description: error.message || 'Failed to log in.',
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
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({
        title: 'Welcome Back!',
        description: 'Successfully logged in with Google.',
        status: 'success',
        duration: 3000,
      });
      closeModals();
      // Navigation will be handled by auth state change
    } catch (error: any) {
      toast({
        title: 'Google Login Error',
        description: error.message || 'Failed to log in with Google.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Teacher Signup Modal
  const TeacherSignupModal = () => (
    <Modal isOpen={isTeacherSignupOpen} onClose={closeModals} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <VStack spacing={2} align="center">
            <Text fontSize="2xl" fontWeight="bold" color="blue.600">
              👨‍🏫 Get Started as a Teacher
            </Text>
            <Text fontSize="sm" color="gray.600" textAlign="center">
              Create your educator account and start building custom learning games
            </Text>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Full Name</FormLabel>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                disabled={isLoading}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Email Address</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 6 characters)"
                disabled={isLoading}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Confirm Password</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                disabled={isLoading}
              />
            </FormControl>
            
            <Button
              colorScheme="blue"
              width="100%"
              onClick={handleTeacherEmailSignup}
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
              onClick={handleTeacherGoogleSignup}
              isLoading={isLoading}
              leftIcon={<Text>🚀</Text>}
            >
              Sign up with Google
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  // Member Login Modal
  const MemberLoginModal = () => (
    <Modal isOpen={isMemberLoginOpen} onClose={closeModals} size="md">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </FormControl>
            
            <Button
              colorScheme="blue"
              width="100%"
              onClick={handleMemberLogin}
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
              onClick={handleMemberGoogleLogin}
              isLoading={isLoading}
              leftIcon={<Text>🚀</Text>}
            >
              Sign in with Google
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  return (
    <>
      <nav style={{ backgroundColor: 'var(--color-primary-500)', padding: 'var(--spacing-4)' }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
            {/* Only show Home for non-authenticated users */}
            {!currentUser && (
              <RouterLink 
                to="/" 
                style={navLinkStyle('/')}
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
                  style={navLinkStyle('/teacher')}
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
                style={navLinkStyle('/student')}
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
                    style={{
                      ...navLinkStyle('/admin'),
                      color: '#FFD700' // Gold color for admin link
                    }}
                    onClick={(e) => handleNavClick(e, '/admin')}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Admin
                  </RouterLink>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
            {currentUser ? (
              <>
                <div style={{ color: 'white' }}>{currentUser.email}</div>
                <button
                  onClick={handleLogout}
                  style={buttonStyle}
                  onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsTeacherSignupOpen(true)}
                  style={teacherButtonStyle}
                  onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Get Started as a Teacher
                </button>
                <button
                  onClick={() => setIsMemberLoginOpen(true)}
                  style={buttonStyle}
                  onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Members Login
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
      
      {/* Modals */}
      <TeacherSignupModal />
      <MemberLoginModal />
    </>
  );
};

export default Navbar; 