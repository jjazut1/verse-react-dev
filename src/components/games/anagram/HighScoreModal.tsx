import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Heading,
  Box
} from '@chakra-ui/react';
import { useAuth } from '../../../contexts/AuthContext';
import { GameState } from './types';

interface HighScoreModalProps {
  gameState: GameState;
  onClose: () => void;
}

const HighScoreModal: React.FC<HighScoreModalProps> = ({ gameState, onClose }) => {
  const navigate = useNavigate();
  const { isTeacher, isStudent } = useAuth();

  const handleClose = () => {
    onClose();
    
    // Navigate based on user role
    if (isTeacher) {
      navigate('/teacher');
    } else if (isStudent) {
      navigate('/student');
    } else {
      navigate('/');
    }
  };

  return (
    <Modal isOpen={gameState.showHighScoreModal} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center">
          {gameState.isNewHighScore ? '🏆 New High Score!' : '🎉 Game Complete!'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <Text fontSize="lg">
              Your Misses: <strong>{gameState.score}</strong>
            </Text>
            
            <Box w="full">
              <Heading size="sm" mb={3}>Best Scores (Fewest Misses):</Heading>
              <VStack spacing={2}>
                {gameState.highScores.slice(0, 5).map((highScore, index) => (
                  <HStack 
                    key={highScore.id} 
                    w="full" 
                    justify="space-between" 
                    p={2} 
                    bg="gray.50" 
                    borderRadius="md"
                  >
                    <Text fontWeight="bold">#{index + 1}</Text>
                    <Text>{highScore.playerName}</Text>
                    <Badge colorScheme="purple">{highScore.score} misses</Badge>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="purple" onClick={handleClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default HighScoreModal; 