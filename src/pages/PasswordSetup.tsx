import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  Alert,
  AlertIcon,
  useToast,
  Spinner,
  Card,
  CardBody,
  Heading,
  FormHelperText,
  InputGroup,
  InputRightElement,
  IconButton
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { signInWithEmailLink, updatePassword, isSignInWithEmailLink } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const PasswordSetup: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState('');
  const [isValidLink, setIsValidLink] = useState(false);

  useEffect(() => {
    const verifyEmailLink = async () => {
      try {
        const emailParam = searchParams.get('email');
        const mode = searchParams.get('mode');
        
        if (!emailParam || mode !== 'passwordSetup') {
          setError('Invalid password setup link');
          setIsVerifying(false);
          return;
        }

        setEmail(emailParam);
        
        // Check if this is a valid email link
        const currentUrl = window.location.href;
        
        if (isSignInWithEmailLink(auth, currentUrl)) {
          setIsValidLink(true);
          setError('');
        } else {
          setError('Invalid or expired password setup link');
        }
        
      } catch (error) {
        console.error('Error verifying email link:', error);
        setError('Failed to verify password setup link');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmailLink();
  }, [searchParams]);

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const currentUrl = window.location.href;
      
      // Sign in with email link
      const userCredential = await signInWithEmailLink(auth, email, currentUrl);
      
      // Update the user's password
      await updatePassword(userCredential.user, password);
      
      toast({
        title: 'Password Set Successfully!',
        description: 'You can now sign in with your email and password.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Redirect to student dashboard
      navigate('/student');
      
    } catch (error: any) {
      console.error('Error setting password:', error);
      
      let errorMessage = 'Failed to set password';
      if (error.code === 'auth/invalid-action-code') {
        errorMessage = 'This password setup link has expired or is invalid';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Verifying password setup link...</Text>
        </VStack>
      </Box>
    );
  }

  if (!isValidLink) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={4}>
        <Card maxW="md" w="full">
          <CardBody>
            <VStack spacing={4}>
              <Heading size="lg" textAlign="center">Invalid Link</Heading>
              <Alert status="error">
                <AlertIcon />
                {error || 'This password setup link is invalid or has expired.'}
              </Alert>
              <Text textAlign="center">
                Please contact your teacher for a new password setup link.
              </Text>
              <Button onClick={() => navigate('/login')} colorScheme="blue">
                Go to Login
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={4}>
      <Card maxW="md" w="full">
        <CardBody>
          <VStack spacing={6}>
            <Heading size="lg" textAlign="center">Set Your Password</Heading>
            
            <Text textAlign="center" color="gray.600">
              Welcome to LuminateLearn! Please set a password for your account.
            </Text>

            <Box w="full" p={3} bg="blue.50" borderRadius="md">
              <Text fontSize="sm" color="blue.800">
                <strong>Email:</strong> {email}
              </Text>
            </Box>

            {error && (
              <Alert status="error">
                <AlertIcon />
                {error}
              </Alert>
            )}

            <form onSubmit={handlePasswordSetup} style={{ width: '100%' }}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>New Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your new password"
                      minLength={6}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                        onClick={() => setShowPassword(!showPassword)}
                        variant="ghost"
                        size="sm"
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormHelperText>Password must be at least 6 characters long</FormHelperText>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Confirm Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      minLength={6}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        icon={showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        variant="ghost"
                        size="sm"
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  width="full"
                  isLoading={isLoading}
                  loadingText="Setting Password..."
                >
                  Set Password
                </Button>
              </VStack>
            </form>

            <Text fontSize="sm" color="gray.500" textAlign="center">
              After setting your password, you'll be able to sign in with your email and password.
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default PasswordSetup; 