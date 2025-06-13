import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  Heading,
  Flex,
  Alert,
  AlertIcon,
  Collapse,
  useColorModeValue
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { GameState } from './types';
import { AnagramConfig } from '../../../types/game';

interface GameAreaProps {
  gameState: GameState;
  config: AnagramConfig;
  onLetterClick: (letter: string, index: number, fromType: 'scrambled' | 'answer') => void;
  onUseHint: () => void;
  onToggleDefinition: () => void;
}

const GameArea: React.FC<GameAreaProps> = ({
  gameState,
  config,
  onLetterClick,
  onUseHint,
  onToggleDefinition
}) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const scrambledBg = useColorModeValue('blue.50', 'blue.900');
  const scrambledBorder = useColorModeValue('blue.200', 'blue.600');
  const answerBg = useColorModeValue('green.50', 'green.900');
  const answerBorder = useColorModeValue('green.200', 'green.600');

  const currentAnagram = gameState.anagrams[gameState.currentAnagramIndex];

  if (!currentAnagram) {
    return null;
  }

  return (
    <Box position="relative" w="full">
      {/* Overlay Feedback Display */}
      {(gameState.feedback || gameState.showIncorrectFeedback) && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={1000}
          pointerEvents="none"
        >
          {gameState.showIncorrectFeedback ? (
            <Box
              bg="red.500"
              color="white"
              borderRadius="full"
              w="80px"
              h="80px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="3xl"
              fontWeight="bold"
              boxShadow="lg"
              animation="pulse 0.25s ease-in-out"
            >
              ✕
            </Box>
          ) : (
            <Alert 
              status={gameState.feedbackType} 
              borderRadius="md" 
              w="auto"
              boxShadow="lg"
            >
              <AlertIcon />
              {gameState.feedback}
            </Alert>
          )}
        </Box>
      )}

      <VStack spacing={6} w="full">
        {/* Main Anagram Area */}
      <Card w="full" bg={cardBg}>
        <CardBody p={6}>
          <VStack spacing={8}>
            {/* Scrambled Letters */}
            <VStack spacing={3} w="full">
              <Heading size="sm" color="gray.600">Scrambled Letters</Heading>
              <Flex 
                wrap="wrap" 
                gap={2} 
                justify="center" 
                minH="60px" 
                p={4} 
                bg={scrambledBg} 
                border="2px dashed" 
                borderColor={scrambledBorder} 
                borderRadius="md"
              >
                {currentAnagram.scrambled.map((letter, index) => (
                  <Box
                    key={index}
                    w="50px"
                    h="50px"
                    border="2px solid"
                    borderColor={letter ? "blue.300" : "gray.300"}
                    borderRadius="md"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bg={letter ? "white" : "gray.100"}
                    cursor={letter ? "pointer" : "default"}
                    onClick={() => onLetterClick(letter, index, 'scrambled')}
                    _hover={letter ? { transform: "translateY(-2px)", boxShadow: "md" } : {}}
                    transition="all 0.2s"
                    fontSize="xl"
                    fontWeight="bold"
                    color={letter ? "blue.600" : "gray.400"}
                  >
                    {letter}
                  </Box>
                ))}
              </Flex>
            </VStack>

            {/* Answer Slots */}
            <VStack spacing={3} w="full">
              <Heading size="sm" color="gray.600">Your Answer</Heading>
              <Flex 
                wrap="wrap" 
                gap={2} 
                justify="center" 
                minH="60px" 
                p={4} 
                bg={answerBg} 
                border="2px dashed" 
                borderColor={answerBorder} 
                borderRadius="md"
              >
                {currentAnagram.currentAnswer.map((letter, index) => (
                  <Box
                    key={index}
                    w="50px"
                    h="50px"
                    border="2px solid"
                    borderColor={letter ? "green.300" : "gray.300"}
                    borderRadius="md"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bg={letter ? "white" : "gray.100"}
                    cursor={letter ? "pointer" : "default"}
                    onClick={() => onLetterClick(letter, index, 'answer')}
                    _hover={letter ? { transform: "translateY(-2px)", boxShadow: "md" } : {}}
                    transition="all 0.2s"
                    fontSize="xl"
                    fontWeight="bold"
                    color={letter ? "green.600" : "gray.400"}
                  >
                    {letter}
                  </Box>
                ))}
              </Flex>
            </VStack>

            {/* Hint and Definition Section */}
            <VStack spacing={3} w="full">
              <HStack spacing={4}>
                {config.enableHints && (
                  <Button
                    onClick={onUseHint}
                    colorScheme="cyan"
                    variant="outline"
                    size="sm"
                    isDisabled={gameState.showHint}
                  >
                    {gameState.showHint ? '🔍 Hint Shown' : '🔍 Show Hint'}
                  </Button>
                )}
                
                {config.showDefinitions && currentAnagram.definition && (
                  <Button
                    onClick={onToggleDefinition}
                    colorScheme="blue"
                    variant="outline"
                    size="sm"
                    leftIcon={gameState.showDefinition ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  >
                    Definition
                  </Button>
                )}
              </HStack>

              {/* Hint Display */}
              {config.enableHints && (
                <Collapse in={gameState.showHint}>
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">
                      💡 First letter: <strong>{currentAnagram.original[0]}</strong>
                    </Text>
                  </Alert>
                </Collapse>
              )}

              {/* Definition Display */}
              {config.showDefinitions && currentAnagram.definition && (
                <Collapse in={gameState.showDefinition}>
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">
                      📚 <strong>Definition:</strong> {currentAnagram.definition}
                    </Text>
                  </Alert>
                </Collapse>
              )}
            </VStack>
          </VStack>
        </CardBody>
      </Card>
      </VStack>
    </Box>
  );
};

export default GameArea; 