import React, { useState } from 'react';
import {
  HStack,
  VStack,
  Button,
  IconButton,
  Tooltip,
  Badge,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  Box,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Divider
} from '@chakra-ui/react';
import { 
  TriangleUpIcon, 
  RepeatIcon, 
  UnlockIcon,
  CopyIcon,
  LinkIcon,
  SettingsIcon
} from '@chakra-ui/icons';
import { GameState } from './types';

interface GameControlsProps {
  gameState: GameState;
  isGameActive: boolean;
  isMultiplayerEnabled: boolean;
  connectionStatus: string;
  roomId: string | null;
  isGuestSession?: boolean;
  
  // Game controls
  onStartGame: () => void;
  onResetGame: () => void;
  onPauseGame: () => void;
  onResumeGame: () => void;
  
  // Multiplayer controls
  onEnableMultiplayer: () => void;
  onDisableMultiplayer: () => void;
  onCreateRoom: () => Promise<string>;
  onJoinRoom: (roomId: string) => Promise<void>;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gameState,
  isGameActive,
  isMultiplayerEnabled,
  connectionStatus,
  roomId,
  isGuestSession = false,
  onStartGame,
  onResetGame,
  onPauseGame,
  onResumeGame,
  onEnableMultiplayer,
  onDisableMultiplayer,
  onCreateRoom,
  onJoinRoom
}) => {
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const handleStartGame = () => {
    console.log('🎮 START: Button clicked');
    onStartGame();
  };

  const handleResetGame = () => {
    console.log('🔄 RESET: Button clicked');
    onResetGame();
  };

  const handlePauseToggle = () => {
    console.log('⏸️ PAUSE/RESUME: Button clicked, current paused state:', gameState.gamePaused);
    if (gameState.gamePaused) {
      onResumeGame();
    } else {
      onPauseGame();
    }
  };

  const handleCreateRoom = async () => {
    setIsCreatingRoom(true);
    try {
      const newRoomId = await onCreateRoom();
      
      // Copy room ID to clipboard
      navigator.clipboard.writeText(newRoomId);
      
      toast({
        title: 'Room Created!',
        description: `Room ID copied to clipboard: ${newRoomId}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      onClose();
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: 'Error',
        description: 'Failed to create room. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinRoomId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a room ID',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsJoiningRoom(true);
    try {
      await onJoinRoom(joinRoomId.trim());
      
      toast({
        title: 'Joined Room!',
        description: `Connected to room: ${joinRoomId}`,
        status: 'success',
        duration: 3000,
      });
      
      setJoinRoomId('');
      onClose();
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: 'Error',
        description: 'Failed to join room. Please check the room ID.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      toast({
        title: 'Copied!',
        description: 'Room ID copied to clipboard',
        status: 'success',
        duration: 2000,
      });
    }
  };

  const buildInviteLink = () => {
    if (!roomId) return '';
    const origin = window.location.origin;
    const path = window.location.pathname;
    return `${origin}${path}?guest=1&room=${roomId}`;
  };

  const copyInviteLink = () => {
    const link = buildInviteLink();
    if (link) {
      navigator.clipboard.writeText(link);
      toast({
        title: 'Invite link copied!',
        description: 'Share this link with your guest player',
        status: 'success',
        duration: 3000,
      });
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'green';
      case 'connecting': return 'yellow';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'failed': return 'Connection Failed';
      default: return 'Disconnected';
    }
  };

  return (
    <>
      <VStack spacing={4} width="100%" maxWidth="600px" margin="0 auto">
        {/* Game Controls */}
        <HStack spacing={4} justify="center" wrap="wrap">
          {!gameState.gameStarted ? (
            <Button
              leftIcon={<TriangleUpIcon />}
              colorScheme="green"
              size="lg"
              onClick={handleStartGame}
              isDisabled={isMultiplayerEnabled && connectionStatus !== 'connected' && gameState.players.length < 2}
            >
              Start Game
            </Button>
          ) : (
            <Button
              leftIcon={<TriangleUpIcon />}
              colorScheme={gameState.gamePaused ? 'green' : 'yellow'}
              onClick={handlePauseToggle}
              isDisabled={gameState.gameCompleted}
            >
              {gameState.gamePaused ? 'Resume' : 'Pause'}
            </Button>
          )}

          <Button
            leftIcon={<RepeatIcon />}
            colorScheme="blue"
            variant="outline"
            onClick={handleResetGame}
          >
            Reset Game
          </Button>

          <Tooltip label="Multiplayer Settings">
            <IconButton
              icon={<SettingsIcon />}
              aria-label="Multiplayer Settings"
              variant="outline"
              onClick={onOpen}
            />
          </Tooltip>
        </HStack>

        {/* Multiplayer Status */}
            {isMultiplayerEnabled && (
          <VStack spacing={2}>
            <HStack spacing={2}>
              <Badge colorScheme={getConnectionStatusColor()}>
                {getConnectionStatusText()}
              </Badge>
              {roomId && (
                <HStack spacing={1}>
                  <Text fontSize="sm" color="gray.600">
                    Room: {roomId}
                  </Text>
                  <Tooltip label="Copy Room ID">
                    <IconButton
                      icon={<CopyIcon />}
                      size="xs"
                      variant="ghost"
                      aria-label="Copy Room ID"
                      onClick={copyRoomId}
                    />
                  </Tooltip>
                      <Tooltip label="Copy Invite Link (guest)">
                        <IconButton
                          icon={<LinkIcon />}
                          size="xs"
                          variant="ghost"
                          aria-label="Copy Invite Link"
                          onClick={copyInviteLink}
                        />
                      </Tooltip>
                </HStack>
              )}
            </HStack>
            
            {gameState.players.length > 1 && (
              <Text fontSize="sm" color="gray.600">
                {gameState.players.length} players connected
              </Text>
            )}
          </VStack>
        )}

        {/* Game Instructions */}
        {!gameState.gameStarted && (
          <Box
            textAlign="center"
            padding={4}
            backgroundColor="blue.50"
            borderRadius="md"
            border="1px solid"
            borderColor="blue.200"
          >
            <Text fontSize="sm" color="blue.700" fontWeight="medium">
              🎯 How to Play
            </Text>
            <Text fontSize="xs" color="blue.600" mt={1}>
              Find the matching symbol between your card and the center card. Click on it quickly to score points!
            </Text>
            {isMultiplayerEnabled && (
              <Text fontSize="xs" color="blue.600" mt={1}>
                🌐 Multiplayer mode: First to find the match wins the round!
              </Text>
            )}
          </Box>
        )}
      </VStack>

      {/* Multiplayer Setup Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>🌐 Multiplayer Settings</ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Enable/Disable Multiplayer */}
              <Box>
                <HStack justify="space-between" mb={3}>
                  <Text fontWeight="medium">Multiplayer Mode</Text>
                  <Button
                    size="sm"
                    colorScheme={isMultiplayerEnabled ? 'red' : 'green'}
                    variant="outline"
                    onClick={isMultiplayerEnabled ? onDisableMultiplayer : onEnableMultiplayer}
                    isDisabled={isGuestSession}
                  >
                    {isMultiplayerEnabled ? 'Disable' : 'Enable'}
                  </Button>
                </HStack>
                <Text fontSize="sm" color="gray.600">
                  {isGuestSession
                    ? 'Guest session: you can join a room shared by Host. Creating rooms is disabled.'
                    : isMultiplayerEnabled 
                      ? 'Multiplayer is enabled. You can create or join rooms.'
                      : 'Enable multiplayer to play with friends in real-time.'}
                </Text>
              </Box>

              {isMultiplayerEnabled && (
                <>
                  <Divider />
                  
                  {/* Create Room */}
                  <Box>
                    <Text fontWeight="medium" mb={2}>Create New Room</Text>
                    <Button
                      leftIcon={<LinkIcon />}
                      colorScheme="blue"
                      width="100%"
                      onClick={handleCreateRoom}
                      isLoading={isCreatingRoom}
                      loadingText="Creating..."
                      isDisabled={isGuestSession}
                    >
                      Create Room & Copy ID
                    </Button>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {isGuestSession
                        ? 'Guests cannot create rooms. Ask the Host to share a room ID.'
                        : 'Creates a new room and copies the ID to your clipboard'}
                    </Text>
                  </Box>

                  <Divider />

                  {/* Join Room */}
                  <Box>
                    <Text fontWeight="medium" mb={2}>Join Existing Room</Text>
                    <InputGroup>
                      <Input
                        placeholder="Enter Room ID"
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                      />
                      <InputRightElement width="4rem">
                        <Button
                          h="1.75rem"
                          size="sm"
                          onClick={handleJoinRoom}
                          isLoading={isJoiningRoom}
                          isDisabled={!joinRoomId.trim()}
                        >
                          Join
                        </Button>
                      </InputRightElement>
                    </InputGroup>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Paste the room ID shared by your friend
                    </Text>
                  </Box>

                  {roomId && (
                    <>
                      <Divider />
                      
                      {/* Current Room */}
                      <Box>
                        <Text fontWeight="medium" mb={2}>Current Room</Text>
                        <HStack>
                          <Input value={roomId} isReadOnly />
                          <Button size="sm" onClick={copyRoomId}>
                            Copy
                          </Button>
                        </HStack>
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          Share this ID with friends to play together
                        </Text>
                        <HStack mt={3}>
                          <Input value={buildInviteLink()} isReadOnly />
                          <Button size="sm" leftIcon={<LinkIcon />} onClick={copyInviteLink}>
                            Copy Invite Link
                          </Button>
                        </HStack>
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          Invite link opens guest mode and auto-fills the room
                        </Text>
                      </Box>
                    </>
                  )}
                </>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default GameControls; 