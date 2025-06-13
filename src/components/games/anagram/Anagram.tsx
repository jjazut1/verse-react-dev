import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Progress,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Flex,
  Grid,
  GridItem,
  useColorModeValue,
  IconButton,
  Collapse,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Center,
  Spinner,
  useToast
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronRightIcon, RepeatIcon } from '@chakra-ui/icons';
import { AnagramConfig } from '../../../types/game';
import { Timestamp } from 'firebase/firestore';
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';

interface AnagramProps {
  playerName: string;
  onGameComplete: (score: number) => void;
  config: AnagramConfig;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
}

interface HighScore {
  id?: string;
  userId?: string;
  playerName: string;
  score: number;
  configId: string;
  createdAt: Timestamp | Date;
  gameType?: string;
}

interface AnagramItem {
  id: string;
  original: string;
  definition?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  scrambled: string[];
  currentAnswer: string[];
  isCompleted: boolean;
}

interface GameStats {
  totalMisses: number;
  correctAnswers: number;
  timeElapsed: number;
  hintsUsed: number;
}

const Anagram: React.FC<AnagramProps> = ({
  playerName,
  onGameComplete,
  config,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
}) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [currentAnagramIndex, setCurrentAnagramIndex] = useState(0);
  const [anagrams, setAnagrams] = useState<AnagramItem[]>([]);
  const [score, setScore] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [gameStats, setGameStats] = useState<GameStats>({
    totalMisses: 0,
    correctAnswers: 0,
    timeElapsed: 0,
    hintsUsed: 0
  });
  const [showHint, setShowHint] = useState(false);
  const [showDefinition, setShowDefinition] = useState(false);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [showHighScoreModal, setShowHighScoreModal] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | 'info'>('info');
  const [showIncorrectFeedback, setShowIncorrectFeedback] = useState<boolean>(false);

  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const incorrectFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Chakra UI hooks
  const toast = useToast();
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const scrambledBg = useColorModeValue('blue.50', 'blue.900');
  const scrambledBorder = useColorModeValue('blue.200', 'blue.600');
  const answerBg = useColorModeValue('green.50', 'green.900');
  const answerBorder = useColorModeValue('green.200', 'green.600');

  // Initialize game on mount
  useEffect(() => {
    initializeGame();
    loadHighScores();

    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      if (incorrectFeedbackTimeoutRef.current) {
        clearTimeout(incorrectFeedbackTimeoutRef.current);
      }
    };
  }, [config]);

  // Game timer
  useEffect(() => {
    if (gameStarted && !gameCompleted) {
      gameTimerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    }

    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    };
  }, [gameStarted, gameCompleted]);

  const initializeGame = () => {
    const initializedAnagrams = config.anagrams.map((anagram, index) => {
      const scrambled = scrambleText(anagram.original, config.shuffleIntensity);
      return {
        id: anagram.id || index.toString(),
        original: anagram.original, // Preserve original case from database
        definition: anagram.definition,
        difficulty: anagram.difficulty,
        scrambled: scrambled,
        currentAnswer: new Array(anagram.original.length).fill(''),
        isCompleted: false
      };
    });
    setAnagrams(initializedAnagrams);
  };

  const scrambleText = (text: string, intensity: 'low' | 'medium' | 'high'): string[] => {
    // Only handle letters-to-word mode (clean text and scramble letters)
    const cleanText = text.replace(/[^\w]/g, '');
    const letters = cleanText.split('');
    return shuffleArray([...letters], intensity);
  };

  const shuffleArray = (array: string[], intensity: 'low' | 'medium' | 'high'): string[] => {
    const result = [...array];
    const shuffleCount = intensity === 'low' ? 3 : intensity === 'medium' ? 5 : 8;
    
    for (let i = 0; i < shuffleCount; i++) {
      for (let j = result.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [result[j], result[k]] = [result[k], result[j]];
      }
    }
    
    return result;
  };

  const handleLetterClick = (letter: string, index: number, fromType: 'scrambled' | 'answer') => {
    if (gameCompleted) return;

    const currentAnagram = anagrams[currentAnagramIndex];
    if (currentAnagram.isCompleted) return;

    // Implement sequential correct placement for letters-to-word mode
    if (fromType === 'scrambled' && letter) {
      // Find the next empty position from left to right
      const nextEmptyIndex = currentAnagram.currentAnswer.findIndex(slot => slot === '');
      
      if (nextEmptyIndex === -1) {
        // All slots filled, don't allow more placements
        return;
      }

      // Check if this is the correct letter for the next position
      const correctLetter = currentAnagram.original[nextEmptyIndex];
      
      if (letter.toLowerCase() === correctLetter.toLowerCase()) {
        // Correct letter! Place it in the next position
        const updatedAnagrams = [...anagrams];
        updatedAnagrams[currentAnagramIndex].currentAnswer[nextEmptyIndex] = letter;
        updatedAnagrams[currentAnagramIndex].scrambled[index] = '';
        setAnagrams(updatedAnagrams);

        // Check if word is now complete
        const isWordComplete = updatedAnagrams[currentAnagramIndex].currentAnswer.every(slot => slot !== '');
        if (isWordComplete) {
          // Auto-check the completed word
          setTimeout(() => {
            checkAnswer();
          }, 500);
        }
      } else {
        // Incorrect letter! Show X feedback and count as miss
        setShowIncorrectFeedback(true);
        
        // Increment miss counter
        setGameStats(prev => ({
          ...prev,
          totalMisses: prev.totalMisses + 1
        }));
        
        // Clear the feedback after 250ms
        if (incorrectFeedbackTimeoutRef.current) {
          clearTimeout(incorrectFeedbackTimeoutRef.current);
        }
        incorrectFeedbackTimeoutRef.current = setTimeout(() => {
          setShowIncorrectFeedback(false);
        }, 250);
      }
      return;
    }

    // Allow removing letters from answer back to scrambled
    if (fromType === 'answer' && letter) {
      // Find an empty slot in scrambled area
      const emptyScrambledIndex = currentAnagram.scrambled.findIndex(slot => slot === '');
      if (emptyScrambledIndex !== -1) {
        const updatedAnagrams = [...anagrams];
        updatedAnagrams[currentAnagramIndex].scrambled[emptyScrambledIndex] = letter;
        updatedAnagrams[currentAnagramIndex].currentAnswer[index] = '';
        setAnagrams(updatedAnagrams);
      }
      return;
    }
  };

  const checkAnswer = () => {
    const currentAnagram = anagrams[currentAnagramIndex];
    const playerAnswer = currentAnagram.currentAnswer.filter(item => item !== '').join('');
    const correctAnswer = currentAnagram.original;

    const updatedAnagrams = [...anagrams];

    // Normalize answers for comparison (case insensitive)
    const normalizeAnswer = (answer: string): string => {
      return answer.toLowerCase().replace(/[^\w]/g, '');
    };

    const normalizedPlayerAnswer = normalizeAnswer(playerAnswer);
    const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);

    if (normalizedPlayerAnswer === normalizedCorrectAnswer) {
      // Correct answer
      updatedAnagrams[currentAnagramIndex].isCompleted = true;
      
      setFeedback(`Correct! The word is "${correctAnswer}"`);
      setFeedbackType('success');
      
      setGameStats(prev => ({
        ...prev,
        correctAnswers: prev.correctAnswers + 1
      }));

      // Check if game is complete
      if (currentAnagramIndex === anagrams.length - 1) {
        // Game complete
        setTimeout(() => {
          completeGame();
        }, 2000);
      } else {
        // Move to next anagram
        setTimeout(() => {
          setCurrentAnagramIndex(prev => prev + 1);
          setShowHint(false);
          setShowDefinition(false);
        }, 2000);
      }
    } else {
      // Incorrect answer - count as miss
      setFeedback(`Try again!`);
      setFeedbackType('error');
      
      setGameStats(prev => ({
        ...prev,
        totalMisses: prev.totalMisses + 1
      }));
    }

    setAnagrams(updatedAnagrams);

    // Clear feedback after 3 seconds
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback('');
      setFeedbackType('info');
    }, 3000);
  };

  const useHint = () => {
    if (showHint) return;
    
    setShowHint(true);
    setGameStats(prev => ({
      ...prev,
      hintsUsed: prev.hintsUsed + 1
    }));
  };

  const toggleDefinition = () => {
    setShowDefinition(!showDefinition);
  };

  const completeGame = async () => {
    setGameCompleted(true);
    const totalMisses = gameStats.totalMisses;
    
    // Update final stats
    setGameStats(prev => ({
      ...prev,
      timeElapsed: timeElapsed
    }));

    // Set the final score to be the total misses (lower is better)
    setScore(totalMisses);

    // Check for high score (lower misses = better score)
    const isHighScore = checkHighScore(totalMisses);
    if (isHighScore && onHighScoreProcessStart) {
      onHighScoreProcessStart();
    }

    if (isHighScore) {
      await saveHighScore(totalMisses);
    }

    if (onHighScoreProcessComplete) {
      onHighScoreProcessComplete();
    }

    // Complete the game with total misses as the score
    onGameComplete(totalMisses);
  };

  const loadHighScores = async () => {
    try {
      const scoresQuery = query(
        collection(db, 'highScores'),
        where('configId', '==', config.id || 'demo'),
        orderBy('score', 'asc'), // Ascending order for miss-based scoring (lower is better)
        limit(10)
      );
      const querySnapshot = await getDocs(scoresQuery);
      const scores = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HighScore[];
      setHighScores(scores);
    } catch (error) {
      console.error('Error loading high scores:', error);
    }
  };

  const checkHighScore = (newScore: number): boolean => {
    // For miss-based scoring, lower is better
    if (highScores.length < 10) return true;
    return newScore < (highScores[highScores.length - 1]?.score || Infinity);
  };

  const saveHighScore = async (finalScore: number) => {
    try {
      const newHighScore = {
        playerName: playerName,
        score: finalScore,
        configId: config.id || 'demo',
        createdAt: new Date(),
        gameType: 'anagram'
      };

      await addDoc(collection(db, 'highScores'), newHighScore);
      setIsNewHighScore(true);
      await loadHighScores();
      setShowHighScoreModal(true);
    } catch (error) {
      console.error('Error saving high score:', error);
    }
  };

  const startGame = () => {
    setGameStarted(true);
    setTimeElapsed(0);
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameCompleted(false);
    setCurrentAnagramIndex(0);
    setScore(0);
    setTimeElapsed(0);
    setGameStats({
      totalMisses: 0,
      correctAnswers: 0,
      timeElapsed: 0,
      hintsUsed: 0
    });
    initializeGame();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentAnagram = anagrams[currentAnagramIndex];

  if (!gameStarted) {
    return (
      <Box minH="100vh" bg={bgColor} p={6}>
        <Center>
          <Card maxW="md" w="full" bg={cardBg}>
            <CardHeader textAlign="center">
              <Heading size="lg" color="purple.500" mb={2}>
                🧩 Anagram
              </Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4}>
                <Grid templateColumns="1fr 1fr" gap={4} w="full">
                  <Stat textAlign="center">
                    <StatLabel fontSize="sm">Words</StatLabel>
                    <StatNumber color="purple.500">{anagrams.length}</StatNumber>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel fontSize="sm">Mode</StatLabel>
                    <StatNumber fontSize="md" color="green.500">
                      Letter Scramble
                    </StatNumber>
                  </Stat>
                </Grid>

                <VStack spacing={2} w="full">
                  <Text fontSize="sm" color="gray.600" textAlign="center" px={2}>
                    Score based on fewest misses. Time is tracked for reference.
                  </Text>
                  <HStack spacing={2}>
                    <Badge colorScheme="orange" variant="outline">
                      🎯 Fewer misses is better
                    </Badge>
                  </HStack>
                  {config.enableHints && (
                    <Badge colorScheme="cyan" variant="outline">
                      🔍 Hints available
                    </Badge>
                  )}
                  {config.showDefinitions && (
                    <Badge colorScheme="blue" variant="outline">
                      📚 Definitions included
                    </Badge>
                  )}
                </VStack>

                <Button
                  onClick={startGame}
                  colorScheme="purple"
                  size="lg"
                  w="full"
                  mt={4}
                  leftIcon={<span>🚀</span>}
                >
                  Start Game
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </Center>
      </Box>
    );
  }

  if (gameCompleted) {
    return (
      <Box minH="100vh" bg={bgColor} p={6}>
        <Center>
          <Card maxW="lg" w="full" bg={cardBg}>
            <CardHeader textAlign="center">
              <Heading size="xl" color="green.500" mb={2}>
                🎉 Game Complete!
              </Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={6}>
                <Grid templateColumns="1fr 1fr" gap={6} w="full">
                  <Stat textAlign="center">
                    <StatLabel>Total Misses</StatLabel>
                    <StatNumber color="purple.500" fontSize="3xl">{score}</StatNumber>
                    <StatHelpText>Fewer misses = better score!</StatHelpText>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel>Time</StatLabel>
                    <StatNumber color="orange.500" fontSize="3xl">{formatTime(timeElapsed)}</StatNumber>
                    <StatHelpText>Total time</StatHelpText>
                  </Stat>
                </Grid>

                <Grid templateColumns="1fr 1fr" gap={6} w="full">
                  <Stat textAlign="center">
                    <StatLabel>Correct</StatLabel>
                    <StatNumber color="green.500" fontSize="2xl">
                      {gameStats.correctAnswers} / {anagrams.length}
                    </StatNumber>
                    <StatHelpText>Words solved</StatHelpText>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel>Accuracy</StatLabel>
                    <StatNumber color="blue.500" fontSize="2xl">
                      {gameStats.totalMisses + gameStats.correctAnswers > 0 ? Math.round((gameStats.correctAnswers / (gameStats.totalMisses + gameStats.correctAnswers)) * 100) : 100}%
                    </StatNumber>
                    <StatHelpText>Success rate</StatHelpText>
                  </Stat>
                </Grid>

                <HStack spacing={4} w="full" justify="center">
                  <Button
                    onClick={resetGame}
                    colorScheme="purple"
                    size="lg"
                    leftIcon={<RepeatIcon />}
                  >
                    Play Again
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </Center>
      </Box>
    );
  }

  if (!currentAnagram) {
    return (
      <Box minH="100vh" bg={bgColor}>
        <Center h="100vh">
          <VStack spacing={4}>
            <Spinner size="xl" color="purple.500" thickness="4px" />
            <Text color="gray.600">Loading word...</Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={bgColor} p={4} onClick={() => {}}>
      <VStack spacing={6} maxW="4xl" mx="auto">
        {/* Game Header */}
        <Card w="full" bg={cardBg}>
          <CardBody p={4}>
            <VStack spacing={3}>
              <HStack w="full" justify="space-between">
                <Badge colorScheme="purple" variant="outline">
                  Word {currentAnagramIndex + 1} of {anagrams.length}
                </Badge>
                <Badge colorScheme="green" variant="outline">
                  Misses: {gameStats.totalMisses}
                </Badge>
                <Badge colorScheme="orange" variant="outline">
                  Time: {formatTime(timeElapsed)}
                </Badge>
              </HStack>
              
              <Box w="full">
                <Text fontSize="sm" mb={1} color="gray.600">Progress</Text>
                <Progress 
                  value={(currentAnagramIndex / anagrams.length) * 100} 
                  colorScheme="purple" 
                  size="md"
                  borderRadius="full"
                />
              </Box>
            </VStack>
          </CardBody>
        </Card>

        {/* Feedback Display */}
        {(feedback || showIncorrectFeedback) && (
          <Alert status={showIncorrectFeedback ? 'error' : feedbackType} borderRadius="md" w="auto">
            <AlertIcon />
            {showIncorrectFeedback ? '❌ Try the next letter in order!' : feedback}
          </Alert>
        )}

        {/* Main Anagram Area */}
        <Card w="full" bg={cardBg}>
          <CardBody p={6}>
            <VStack spacing={8}>
              {/* Scrambled Letters */}
              <VStack spacing={3} w="full">
                <Heading size="sm" color="gray.600">Scrambled Letters</Heading>
                <Flex wrap="wrap" gap={2} justify="center" minH="60px" p={4} bg={scrambledBg} border="2px dashed" borderColor={scrambledBorder} borderRadius="md">
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
                      onClick={() => handleLetterClick(letter, index, 'scrambled')}
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
                <Flex wrap="wrap" gap={2} justify="center" minH="60px" p={4} bg={answerBg} border="2px dashed" borderColor={answerBorder} borderRadius="md">
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
                      onClick={() => handleLetterClick(letter, index, 'answer')}
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
                      onClick={useHint}
                      colorScheme="cyan"
                      variant="outline"
                      size="sm"
                      isDisabled={showHint}
                    >
                      {showHint ? '🔍 Hint Shown' : '🔍 Show Hint'}
                    </Button>
                  )}
                  
                  {config.showDefinitions && currentAnagram.definition && (
                    <Button
                      onClick={toggleDefinition}
                      colorScheme="blue"
                      variant="outline"
                      size="sm"
                      leftIcon={showDefinition ? <ChevronDownIcon /> : <ChevronRightIcon />}
                    >
                      Definition
                    </Button>
                  )}
                </HStack>

                {/* Hint Display */}
                {config.enableHints && (
                  <Collapse in={showHint}>
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
                  <Collapse in={showDefinition}>
                    <Alert status="info" borderRadius="md">
                      <AlertIcon />
                      <Text fontSize="sm">
                        📚 <strong>Definition:</strong> {currentAnagram.definition}
                      </Text>
                    </Alert>
                  </Collapse>
                )}
              </VStack>

              {/* Manual Check Button (for testing) */}
              <Button
                onClick={checkAnswer}
                colorScheme="green"
                size="lg"
                isDisabled={currentAnagram.currentAnswer.every(slot => slot === '')}
                leftIcon={<span>✓</span>}
              >
                Check Answer
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </VStack>

      {/* High Score Modal */}
      <Modal isOpen={showHighScoreModal} onClose={() => setShowHighScoreModal(false)} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader textAlign="center">
            {isNewHighScore ? '🏆 New High Score!' : '🎉 Game Complete!'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text fontSize="lg">Your Misses: <strong>{score}</strong></Text>
              
              <Box w="full">
                <Heading size="sm" mb={3}>Best Scores (Fewest Misses):</Heading>
                <VStack spacing={2}>
                  {highScores.slice(0, 5).map((highScore, index) => (
                    <HStack key={highScore.id} w="full" justify="space-between" p={2} bg="gray.50" borderRadius="md">
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
            <Button colorScheme="purple" onClick={() => setShowHighScoreModal(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Anagram; 