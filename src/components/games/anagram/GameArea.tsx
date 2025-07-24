import React, { useState } from 'react';
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
import { speakWord, speakDefinition, stopSpeech, isTTSAvailable } from '../../../utils/soundUtils';

interface GameAreaProps {
  gameState: GameState;
  config: AnagramConfig;
  onLetterClick: (letter: string, index: number, fromType: 'scrambled' | 'answer') => void;
  onUseHint: () => void;
  onToggleDefinition: () => void;
}

// Simple HTML renderer component for rich text definitions
const RichTextRenderer: React.FC<{ html: string }> = ({ html }) => {
  return (
    <Box
      dangerouslySetInnerHTML={{ __html: html }}
      sx={{
        '& strong': { fontWeight: 'bold' },
        '& em': { fontStyle: 'italic' },
        '& u': { textDecoration: 'underline' },
        '& sub': { fontSize: '0.8em', verticalAlign: 'sub' },
        '& sup': { fontSize: '0.8em', verticalAlign: 'super' },
        fontFamily: "'Comic Neue', sans-serif"
      }}
    />
  );
};

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

  const handleSpeakWord = () => {
    if (currentAnagram) {
      speakWord(currentAnagram.original);
    }
  };

  const handleSpeakDefinition = () => {
    if (currentAnagram?.definition) {
      speakDefinition(currentAnagram.definition);
    }
  };

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
              fontFamily="'Comic Neue', sans-serif"
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
              fontFamily="'Comic Neue', sans-serif"
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
              <Heading size="sm" color="gray.600" fontFamily="'Comic Neue', sans-serif">Scrambled Letters</Heading>
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
                w="100%"
                maxW="100%"
              >
                {currentAnagram.scrambled.map((letter, index) => (
                  <Box
                    key={index}
                    w={{ base: "40px", sm: "45px", md: "50px" }} // Responsive width to match answer section
                    h={{ base: "40px", sm: "45px", md: "50px" }} // Responsive height to match answer section
                    minW={{ base: "40px", sm: "45px", md: "50px" }} // Prevent shrinking below minimum
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
                    fontSize={{ base: "lg", sm: "xl", md: "xl" }} // Responsive font size to match answer section
                    fontWeight="bold"
                    fontFamily="'Comic Neue', sans-serif"
                    color={letter ? "blue.600" : "gray.400"}
                    flexShrink={0} // Prevent boxes from shrinking
                  >
                    {letter}
                  </Box>
                ))}
              </Flex>
            </VStack>

            {/* Answer Slots */}
            <VStack spacing={3} w="full">
              <Heading size="sm" color="gray.600" fontFamily="'Comic Neue', sans-serif">Your Answer</Heading>
              <Flex 
                wrap="nowrap" // Changed from "wrap" to "nowrap" to prevent multiple rows
                gap={2} 
                justify="center" 
                minH="60px" 
                p={4} 
                bg={answerBg} 
                border="2px dashed" 
                borderColor={answerBorder} 
                borderRadius="md"
                overflowX="auto" // Allow horizontal scrolling if needed on very small screens
                w="100%"
                maxW="100%"
              >
                {currentAnagram.currentAnswer.map((letter, index) => (
                  <Box
                    key={index}
                    w={{ base: "40px", sm: "45px", md: "50px" }} // Responsive width
                    h={{ base: "40px", sm: "45px", md: "50px" }} // Responsive height
                    minW={{ base: "40px", sm: "45px", md: "50px" }} // Prevent shrinking below minimum
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
                    fontSize={{ base: "lg", sm: "xl", md: "xl" }} // Responsive font size
                    fontWeight="bold"
                    fontFamily="'Comic Neue', sans-serif"
                    color={letter ? "green.600" : "gray.400"}
                    flexShrink={0} // Prevent boxes from shrinking
                  >
                    {letter}
                  </Box>
                ))}
              </Flex>
            </VStack>

            {/* Hint and Definition Section */}
            <VStack spacing={3} w="full">
              <HStack spacing={4} wrap="wrap" justify="center">
                {config.enableHints && (
                  <Button
                    onClick={onUseHint}
                    colorScheme="cyan"
                    variant="outline"
                    size="sm"
                    fontFamily="'Comic Neue', sans-serif"
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
                    fontFamily="'Comic Neue', sans-serif"
                    leftIcon={gameState.showDefinition ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  >
                    Definition
                  </Button>
                )}

                {/* Text-to-Speech Controls */}
                {config.enableTextToSpeech && isTTSAvailable() && (
                  <>
                    <Button
                      onClick={handleSpeakWord}
                      colorScheme="purple"
                      variant="outline"
                      size="sm"
                      fontFamily="'Comic Neue', sans-serif"
                    >
                      🗣️ Speak Word
                    </Button>
                    
                    {config.showDefinitions && currentAnagram.definition && (
                      <Button
                        onClick={handleSpeakDefinition}
                        colorScheme="orange"
                        variant="outline"
                        size="sm"
                        fontFamily="'Comic Neue', sans-serif"
                      >
                        📚 Speak Definition
                      </Button>
                    )}
                  </>
                )}
              </HStack>

              {/* Hint Display */}
              {config.enableHints && (
                <Collapse in={gameState.showHint}>
                  <Alert status="info" borderRadius="md" fontFamily="'Comic Neue', sans-serif">
                    <AlertIcon />
                    <Text fontSize="sm">
                      💡 First letter: <strong>{currentAnagram.original[0]}</strong>
                    </Text>
                  </Alert>
                </Collapse>
              )}

              {/* Definition Display with Rich Text Support */}
              {config.showDefinitions && currentAnagram.definition && (
                <Collapse in={gameState.showDefinition}>
                  <Alert status="info" borderRadius="md" fontFamily="'Comic Neue', sans-serif">
                    <AlertIcon />
                    <Box fontSize="sm">
                      <Text as="span" fontWeight="bold">📚 Definition:</Text>{' '}
                      <RichTextRenderer html={currentAnagram.definition} />
                    </Box>
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