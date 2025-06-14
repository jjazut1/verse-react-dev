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
  Box,
  useBreakpointValue
} from '@chakra-ui/react';
import { useAuth } from '../../../contexts/AuthContext';
import { GameState } from './types';

interface HighScoreModalProps {
  gameState: GameState;
  onClose: () => void;
}

const HighScoreModal: React.FC<HighScoreModalProps> = ({ gameState, onClose }) => {
  const modalSize = useBreakpointValue({ base: "sm", md: "md", lg: "xl" });
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
    <Modal 
      isOpen={gameState.showHighScoreDisplayModal} 
      onClose={handleClose} 
      size={modalSize}
    >
      <ModalOverlay />
      <ModalContent fontFamily="'Comic Neue', sans-serif">
        <ModalHeader textAlign="center">
          {gameState.isHighScore ? '🏆 New High Score!' : '🎉 Game Complete!'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6}>
            <VStack spacing={2}>
              <Text fontSize="xl" fontWeight="bold" color="blue.600">
                Final Score: {gameState.score}
              </Text>
              <Text fontSize="md" color="gray.600">
                Great job sorting the categories!
              </Text>
            </VStack>
            
            {gameState.highScores.length > 0 && (
              <Box w="full">
                <Heading size="md" mb={4} textAlign="center" color="purple.600">
                  🏆 High Scores
                </Heading>
                <VStack spacing={2} w="full">
                  {gameState.highScores.slice(0, 10).map((score, index) => (
                    <HStack 
                      key={score.id} 
                      w="full" 
                      justify="space-between" 
                      p={3} 
                      bg={index === 0 ? "yellow.50" : "gray.50"}
                      borderRadius="md"
                      border={index === 0 ? "2px solid gold" : "1px solid gray.200"}
                    >
                      <HStack>
                        <Text fontWeight="bold" color="purple.600">
                          #{index + 1}
                        </Text>
                        <Text fontWeight="medium">
                          {score.playerName}
                        </Text>
                      </HStack>
                      <Badge 
                        colorScheme={index === 0 ? "yellow" : "blue"} 
                        fontSize="sm"
                        px={2}
                        py={1}
                      >
                        {score.score} pts
                      </Badge>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" onClick={handleClose} fontFamily="'Comic Neue', sans-serif">
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default HighScoreModal; 