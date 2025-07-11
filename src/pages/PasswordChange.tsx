import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Card,
  CardBody,
  Heading,
  FormHelperText,
  InputGroup,
  InputRightElement,
  IconButton
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const PasswordChange: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userHasTemporaryPassword, setUserHasTemporaryPassword] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and has temporary password
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const checkTemporaryPassword = async () => {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && userDoc.data().hasTemporaryPassword) {
          setUserHasTemporaryPassword(true);
        } else {
          // User doesn't have temporary password, redirect to dashboard
          navigate('/student');
        }
      } catch (error) {
        console.error('Error checking temporary password:', error);
        setError('Failed to verify account status');
      }
    };

    checkTemporaryPassword();
  }, [currentUser, navigate]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from your current password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // First, re-authenticate the user with their current password
      const credential = EmailAuthProvider.credential(currentUser!.email!, currentPassword);
      await reauthenticateWithCredential(currentUser!, credential);
      
      // Now update the user's password
      await updatePassword(currentUser!, newPassword);
      
      // Update the user document to remove temporary password flag
      const userRef = doc(db, 'users', currentUser!.uid);
      await updateDoc(userRef, {
        hasTemporaryPassword: false,
        temporaryPasswordSet: false,
        passwordSetupComplete: true,
        passwordSetupCompletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      toast({
        title: 'Password Updated Successfully!',
        description: 'You can now use your new password to sign in, or use Google Sign-In.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Redirect to student dashboard
      navigate('/student');
      
    } catch (error: any) {
      console.error('Error updating password:', error);
      
      let errorMessage = 'Failed to update password';
      if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect. Please check your temporary password from the email.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please sign out and sign back in, then try changing your password again.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Current password is incorrect. Please check your temporary password from the email.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return null; // Will redirect to login
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={4}>
      <Card maxW="md" w="full">
        <CardBody>
          <VStack spacing={6}>
            <Heading size="lg" textAlign="center">Update Your Password</Heading>
            
            <Text textAlign="center" color="gray.600">
              Welcome to LuminateLearn! Please create a new password for your account.
            </Text>

            <Box w="full" p={3} bg="blue.50" borderRadius="md">
              <Text fontSize="sm" color="blue.800">
                <strong>Account:</strong> {currentUser.email}
              </Text>
            </Box>

            {error && (
              <Alert status="error">
                <AlertIcon />
                {error}
              </Alert>
            )}

            <form onSubmit={handlePasswordChange} style={{ width: '100%' }}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Current Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current (temporary) password"
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                        icon={showCurrentPassword ? <ViewOffIcon /> : <ViewIcon />}
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        variant="ghost"
                        size="sm"
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormHelperText>This is the temporary password from your email</FormHelperText>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>New Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      minLength={6}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        icon={showNewPassword ? <ViewOffIcon /> : <ViewIcon />}
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        variant="ghost"
                        size="sm"
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormHelperText>Password must be at least 6 characters long</FormHelperText>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Confirm New Password</FormLabel>
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
                  loadingText="Updating Password..."
                >
                  Update Password
                </Button>
              </VStack>
            </form>

            <Text fontSize="sm" color="gray.500" textAlign="center">
              After updating your password, you'll be able to sign in with your email and new password, 
              or you can use Google Sign-In.
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default PasswordChange; 