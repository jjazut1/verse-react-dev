import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Heading,
  Spinner,
  Alert,
  AlertIcon,
  AlertDescription,
  Divider,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { HighScore, ScoringSystem } from '../../services/highScoreService';

// Props interface
export interface HighScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Score information
  score: number;
  isNewHighScore: boolean;
  highScores: HighScore[];
  scoringSystem: ScoringSystem;
  
  // Game information
  gameTitle: string;
  
  // Optional stats
  timeElapsed?: number;
  additionalStats?: Array<{
    label: string;
    value: string | number;
    colorScheme?: string;
  }>;
  
  // Loading states
  isLoading?: boolean;
  isSubmittingScore?: boolean;
  
  // Error handling
  error?: string | null;
  onClearError?: () => void;
  
  // Actions
  onPlayAgain?: () => void;
  customActions?: Array<{
    label: string;
    onClick: () => void;
    colorScheme?: string;
    variant?: string;
  }>;
  
  // Display options
  maxScoresToShow?: number;
  showNavigation?: boolean;
}

/**
 * Unified High Score Modal component for all games
 */
export const HighScoreModal: React.FC<HighScoreModalProps> = ({
  isOpen,
  onClose,
  score,
  isNewHighScore,
  highScores,
  scoringSystem,
  gameTitle,
  timeElapsed,
  additionalStats,
  isLoading = false,
  isSubmittingScore = false,
  error,
  onClearError,
  onPlayAgain,
  customActions,
  maxScoresToShow = 5,
  showNavigation = true,
}) => {
  const navigate = useNavigate();
  const { isTeacher, isStudent } = useAuth();
  
  // Format time helper
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Get score display text based on scoring system
  const getScoreDisplayText = (scoreValue: number): string => {
    if (scoringSystem === 'miss-based') {
      return scoreValue === 1 ? '1 miss' : `${scoreValue} misses`;
    } else {
      return `${scoreValue} points`;
    }
  };
  
  // Get score color scheme based on scoring system and performance
  const getScoreColorScheme = (scoreValue: number, index: number): string => {
    if (index === 0) return 'gold'; // First place
    if (index === 1) return 'gray'; // Second place  
    if (index === 2) return 'orange'; // Third place
    return 'blue'; // Other places
  };
  
  // Handle navigation based on user role
  const handleNavigateAway = () => {
    onClose();
    
    if (isTeacher) {
      navigate('/teacher');
    } else if (isStudent) {
      navigate('/student');
    } else {
      navigate('/');
    }
  };
  
  // Handle modal close with error clearing
  const handleClose = () => {
    if (onClearError) {
      onClearError();
    }
    onClose();
  };
  
  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center">
          {isSubmittingScore ? (
            <>
              <Spinner size="sm" mr={2} />
              Saving Score...
            </>
          ) : isNewHighScore ? (
            '🏆 New High Score!'
          ) : (
            '🎉 Game Complete!'
          )}
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={6}>
            {/* Error Display */}
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Your Score */}
            <Box textAlign="center">
              <Text fontSize="lg" mb={2}>
                Your Score:
              </Text>
              <Badge 
                fontSize="xl" 
                px={4} 
                py={2} 
                borderRadius="lg"
                colorScheme={isNewHighScore ? 'gold' : 'blue'}
              >
                {getScoreDisplayText(score)}
              </Badge>
            </Box>
            
            {/* Additional Stats */}
            {(timeElapsed || additionalStats) && (
              <>
                <Divider />
                <Box w="full">
                  <Heading size="sm" mb={3} textAlign="center">
                    Game Stats
                  </Heading>
                  <VStack spacing={2}>
                    {timeElapsed && (
                      <HStack w="full" justify="space-between">
                        <Text>Time Elapsed:</Text>
                        <Badge colorScheme="green">{formatTime(timeElapsed)}</Badge>
                      </HStack>
                    )}
                    {additionalStats?.map((stat, index) => (
                      <HStack key={index} w="full" justify="space-between">
                        <Text>{stat.label}:</Text>
                        <Badge colorScheme={stat.colorScheme || 'blue'}>
                          {stat.value}
                        </Badge>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              </>
            )}
            
            {/* High Scores */}
            {!isLoading && highScores.length > 0 && (
              <>
                <Divider />
                <Box w="full">
                  <Heading size="sm" mb={3} textAlign="center">
                    {scoringSystem === 'miss-based' 
                      ? 'Best Scores (Fewest Misses)' 
                      : 'High Scores'
                    }
                  </Heading>
                  <VStack spacing={2}>
                    {highScores.slice(0, maxScoresToShow).map((highScore, index) => (
                      <HStack 
                        key={highScore.id} 
                        w="full" 
                        justify="space-between" 
                        p={3} 
                        bg={index % 2 === 0 ? "gray.50" : "white"}
                        borderRadius="md"
                        border={highScore.userId && highScore.score === score ? "2px solid" : "1px solid"}
                        borderColor={highScore.userId && highScore.score === score ? "gold.300" : "gray.200"}
                      >
                        <HStack>
                          <Text fontWeight="bold" minW="30px">
                            #{index + 1}
                          </Text>
                          <Text>{highScore.playerName}</Text>
                        </HStack>
                        <Badge colorScheme={getScoreColorScheme(highScore.score, index)}>
                          {getScoreDisplayText(highScore.score)}
                        </Badge>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              </>
            )}
            
            {/* Loading State */}
            {isLoading && (
              <Box textAlign="center">
                <Spinner size="lg" />
                <Text mt={2}>Loading high scores...</Text>
              </Box>
            )}
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <VStack w="full" spacing={3}>
            {/* Primary Actions */}
            <HStack spacing={3} w="full" justify="center">
              {onPlayAgain && (
                <Button 
                  colorScheme="blue" 
                  onClick={onPlayAgain}
                  leftIcon={<RepeatIcon />}
                  isDisabled={isSubmittingScore}
                >
                  Play Again
                </Button>
              )}
              
              {/* Custom Actions */}
              {customActions?.map((action, index) => (
                <Button
                  key={index}
                  colorScheme={action.colorScheme || 'gray'}
                  variant={action.variant || 'solid'}
                  onClick={action.onClick}
                  isDisabled={isSubmittingScore}
                >
                  {action.label}
                </Button>
              ))}
            </HStack>
            
            {/* Navigation Actions */}
            {showNavigation && (
              <HStack spacing={3}>
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  isDisabled={isSubmittingScore}
                >
                  Close
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={handleNavigateAway}
                  isDisabled={isSubmittingScore}
                >
                  {isTeacher ? 'Back to Teacher Dashboard' : 
                   isStudent ? 'Back to Student Dashboard' : 
                   'Back to Home'}
                </Button>
              </HStack>
            )}
          </VStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 