import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  Spinner,
  Divider,
  useToast,
  Card,
  CardBody,
  CardHeader,
  Heading,
  IconButton,
  Tooltip
} from '@chakra-ui/react';
import { CopyIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { ConnectionStatus, generateSessionId } from './sessionTypes';

interface SessionManagerProps {
  onSessionReady: (sessionId: string, role: 'teacher' | 'student') => void;
  connectionStatus?: ConnectionStatus;
  remoteConnectionStatus?: ConnectionStatus | null;
  isConnected?: boolean;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  onSessionReady,
  connectionStatus,
  remoteConnectionStatus,
  isConnected = false
}) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  
  const [sessionId, setSessionId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'creating' | 'waiting' | 'active'>('idle');

  // Create new session (teacher only)
  const createSession = async () => {
    if (!currentUser) return;
    
    setIsCreating(true);
    try {
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      setSessionStatus('creating');
      
      // Initialize session - the hook will handle Firestore creation
      onSessionReady(newSessionId, 'teacher');
      
      setSessionStatus('waiting');
      
      toast({
        title: '🎮 Session Created!',
        description: `Session "${newSessionId}" is ready. Share the ID with your student.`,
        status: 'success',
        duration: 6000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('Failed to create session:', error);
      toast({
        title: 'Session Creation Failed',
        description: 'Unable to create session. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setSessionStatus('idle');
    } finally {
      setIsCreating(false);
    }
  };

  // Join existing session (student)
  const joinSession = async () => {
    if (!currentUser || !sessionId.trim()) return;
    
    setIsJoining(true);
    try {
      setSessionStatus('creating');
      
      // Join session - the hook will handle Firestore updates
      onSessionReady(sessionId.trim().toUpperCase(), 'student');
      
      setSessionStatus('active');
      
      toast({
        title: '🎉 Joined Session!',
        description: `Connected to "${sessionId}". Get ready to play!`,
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('Failed to join session:', error);
      toast({
        title: 'Join Failed',
        description: 'Unable to join session. Check the session ID and try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setSessionStatus('idle');
    } finally {
      setIsJoining(false);
    }
  };

  // Copy session ID to clipboard
  const copySessionId = async () => {
    if (!sessionId) return;
    
    try {
      await navigator.clipboard.writeText(sessionId);
      toast({
        title: 'Copied!',
        description: 'Session ID copied to clipboard.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Copy Failed',
        description: 'Please copy the session ID manually.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Update session status based on connections
  useEffect(() => {
    if (isConnected && sessionStatus === 'waiting') {
      setSessionStatus('active');
      toast({
        title: '🚀 Both Players Connected!',
        description: 'The game is ready to start.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [isConnected, sessionStatus, toast]);

  // Connection status badge
  const getConnectionBadge = (status?: ConnectionStatus) => {
    if (!status) return null;
    
    const colorScheme = {
      'excellent': 'green',
      'good': 'green', 
      'poor': 'orange',
      'disconnected': 'red'
    }[status.quality] || 'gray';
    
    const label = status.quality === 'disconnected' ? 'Offline' : 'Online';
    
    return (
      <Badge colorScheme={colorScheme} variant="solid" fontSize="xs">
        {label}
      </Badge>
    );
  };

  // Session active view
  if (sessionStatus === 'active') {
    return (
      <Card maxW="600px" mx="auto">
        <CardHeader>
          <Heading size="md" textAlign="center">
            🎮 Word Volley Session Active
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <HStack spacing={4} w="full" justify="space-between" bg="gray.50" p={3} borderRadius="md">
              <Text fontSize="sm">
                <strong>Session ID:</strong> <Code fontSize="sm">{sessionId}</Code>
              </Text>
              {getConnectionBadge(connectionStatus)}
            </HStack>
            
            {remoteConnectionStatus && (
              <HStack spacing={4} w="full" justify="space-between" bg="blue.50" p={3} borderRadius="md">
                <Text fontSize="sm">
                  <strong>{remoteConnectionStatus.role === 'teacher' ? '👩‍🏫 Teacher' : '🎓 Student'}:</strong> 
                  {remoteConnectionStatus.isConnected ? ' Connected' : ' Disconnected'}
                </Text>
                {getConnectionBadge(remoteConnectionStatus)}
              </HStack>
            )}
            
            {isConnected ? (
              <Alert status="success" variant="subtle" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>🚀 Ready to Play!</AlertTitle>
                  <AlertDescription>
                    Both players are connected. The synchronized game should load automatically.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : (
              <Alert status="warning" variant="subtle" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>⏳ Waiting for Connection</AlertTitle>
                  <AlertDescription>
                    {connectionStatus?.role === 'teacher' 
                      ? 'Waiting for student to join the session...' 
                      : 'Connecting to teacher session...'}
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            <Box w="full" borderTop="1px" borderColor="gray.200" pt={4}>
              <Text fontSize="xs" color="gray.600" textAlign="center">
                Session will remain active while both players are connected
              </Text>
            </Box>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  // Session setup view
  return (
    <Card maxW="700px" mx="auto">
      <CardHeader>
        <VStack spacing={2}>
          <Heading size="md" textAlign="center">🏓 Word Volley Session Sync</Heading>
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Eliminate Zoom lag with real-time synchronized gameplay
          </Text>
        </VStack>
      </CardHeader>
      <CardBody>
        <VStack spacing={6}>
          
          {/* Teacher Section */}
          <Box w="full">
            <VStack spacing={4} align="stretch">
              <HStack spacing={2} align="center">
                <Text fontSize="lg" fontWeight="bold">👩‍🏫 Teachers</Text>
                <Badge colorScheme="blue" variant="outline">Host Game</Badge>
              </HStack>
              
              <Text fontSize="sm" color="gray.600">
                Create a new session and share the session ID with your student for lag-free gameplay.
              </Text>
              
              <Button
                colorScheme="blue"
                onClick={createSession}
                isLoading={isCreating || sessionStatus === 'creating'}
                loadingText="Creating Session..."
                size="lg"
                leftIcon={sessionStatus === 'creating' ? <Spinner size="sm" /> : undefined}
                isDisabled={sessionStatus !== 'idle'}
              >
                Create New Session
              </Button>
              
              {sessionId && sessionStatus === 'waiting' && (
                <Alert status="info" variant="left-accent" borderRadius="md">
                  <AlertIcon />
                  <Box flex="1">
                    <AlertTitle>Session Created! 🎉</AlertTitle>
                    <AlertDescription>
                      <VStack align="start" spacing={3} mt={2}>
                        <Text fontSize="sm">Share this Session ID with your student:</Text>
                        <HStack spacing={2} w="full">
                          <Code 
                            fontSize="lg" 
                            colorScheme="blue" 
                            px={4} 
                            py={2} 
                            flex="1" 
                            textAlign="center"
                            letterSpacing="1px"
                          >
                            {sessionId}
                          </Code>
                          <Tooltip label="Copy Session ID">
                            <IconButton
                              aria-label="Copy session ID"
                              icon={<CopyIcon />}
                              size="sm"
                              onClick={copySessionId}
                              colorScheme="blue"
                              variant="outline"
                            />
                          </Tooltip>
                        </HStack>
                        <HStack spacing={2} w="full">
                          <Spinner size="sm" />
                          <Text fontSize="sm" color="gray.600">
                            Waiting for student to join...
                          </Text>
                        </HStack>
                      </VStack>
                    </AlertDescription>
                  </Box>
                </Alert>
              )}
            </VStack>
          </Box>

          <Divider />

          {/* Student Section */}
          <Box w="full">
            <VStack spacing={4} align="stretch">
              <HStack spacing={2} align="center">
                <Text fontSize="lg" fontWeight="bold">🎓 Students</Text>
                <Badge colorScheme="green" variant="outline">Join Game</Badge>
              </HStack>
              
              <Text fontSize="sm" color="gray.600">
                Enter the Session ID provided by your teacher to join the synchronized game.
              </Text>
              
              <VStack spacing={3}>
                <Input
                  placeholder="Enter Session ID (e.g., Fast-Pong-123)"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value.toUpperCase())}
                  size="lg"
                  textAlign="center"
                  fontFamily="mono"
                  letterSpacing="1px"
                  bg="gray.50"
                  _focus={{ bg: "white", borderColor: "green.400" }}
                />
                <Button
                  colorScheme="green"
                  onClick={joinSession}
                  isLoading={isJoining || sessionStatus === 'creating'}
                  loadingText="Joining..."
                  isDisabled={!sessionId.trim() || sessionStatus !== 'idle'}
                  size="lg"
                  leftIcon={<ExternalLinkIcon />}
                  w="full"
                >
                  Join Session
                </Button>
              </VStack>
            </VStack>
          </Box>

          {/* Benefits Section */}
          <Box w="full">
            <Alert status="info" variant="top-accent" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle>🚀 Session Sync Benefits</AlertTitle>
                <AlertDescription>
                  <VStack align="start" spacing={1} mt={2} fontSize="sm">
                    <Text>• <strong>No more Zoom lag!</strong> Student controls their own paddle directly</Text>
                    <Text>• <strong>Real-time visibility</strong> - Teacher sees every student move instantly</Text>
                    <Text>• <strong>Better coaching</strong> - Provide feedback during actual gameplay</Text>
                    <Text>• <strong>Synchronized experience</strong> - Both players see the same game state</Text>
                  </VStack>
                </AlertDescription>
              </Box>
            </Alert>
          </Box>
          
        </VStack>
      </CardBody>
    </Card>
  );
}; 