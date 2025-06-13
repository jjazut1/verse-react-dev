import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
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
  Box,
  Heading,
  Text,
  Badge,
  Button
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { HighScore, GameStats } from './types';

interface HighScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  isNewHighScore: boolean;
  score: number;
  timeElapsed: number;
  gameStats: GameStats;
  totalSentences: number;
  highScores: HighScore[];
  formatTime: (seconds: number) => string;
  onPlayAgain: () => void;
}

export const HighScoreModal: React.FC<HighScoreModalProps> = ({
  isOpen,
  onClose,
  isNewHighScore,
  score,
  timeElapsed,
  gameStats,
  totalSentences,
  highScores,
  formatTime,
  onPlayAgain
}) => {
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
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center">
          {isNewHighScore ? '🏆 New High Score!' : '🎉 Game Complete!'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6}>
            {/* High Scores */}
            <Box w="full">
              <Heading size="sm" mb={3} textAlign="center">Best Scores (Fewest Misses):</Heading>
              <VStack spacing={2}>
                {highScores.slice(0, 5).map((highScore, index) => (
                  <HStack key={highScore.id} w="full" justify="space-between" p={2} bg="gray.50" borderRadius="md">
                    <Text fontWeight="bold">#{index + 1}</Text>
                    <Text>{highScore.playerName}</Text>
                    <Badge colorScheme="blue">{highScore.score} misses</Badge>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3}>
            <Button 
              colorScheme="blue" 
              onClick={onPlayAgain}
              leftIcon={<RepeatIcon />}
            >
              Play Again
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 