import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import WordSentenceMode from './WordSentenceMode';
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
  type: 'word' | 'sentence';
  difficulty: 'easy' | 'medium' | 'hard';
  scrambled: string[];
  currentAnswer: string[];
  isCompleted: boolean;
}

interface DraggedLetter {
  letter: string;
  fromIndex: number;
  fromType: 'scrambled' | 'answer';
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
  const [draggedLetter, setDraggedLetter] = useState<DraggedLetter | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showDefinition, setShowDefinition] = useState(false);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [showHighScoreModal, setShowHighScoreModal] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | ''>('');
  const [showIncorrectFeedback, setShowIncorrectFeedback] = useState<boolean>(false);

  // Click-move-click state
  const [selectedItem, setSelectedItem] = useState<{
    item: string;
    index: number;
    fromType: 'scrambled' | 'answer';
  } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const incorrectFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Global mouse move handler
  useEffect(() => {
    if (selectedItem) {
      const handleGlobalMouseMove = (event: MouseEvent) => {
        setMousePosition({ x: event.clientX, y: event.clientY });
      };
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      return () => document.removeEventListener('mousemove', handleGlobalMouseMove);
    }
  }, [selectedItem]);

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
        type: anagram.type,
        difficulty: anagram.difficulty,
        scrambled: scrambled,
        currentAnswer: new Array(getTargetLength(anagram.original, anagram.type)).fill(''),
        isCompleted: false
      };
    });
    setAnagrams(initializedAnagrams);
  };

  const getTargetLength = (text: string, type: 'word' | 'sentence'): number => {
    if (type === 'sentence') {
      return text.split(' ').length;
    }
    return text.length;
  };

  const scrambleText = (text: string, intensity: 'low' | 'medium' | 'high'): string[] => {
    if (config.gameMode === 'words-to-sentence') {
      // For words-to-sentence mode, preserve original case and punctuation
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      return shuffleArray([...words], intensity);
    } else {
      // For other modes, clean but preserve original case
      const cleanText = text.replace(/[^\w\s]/g, '');
      
      if (text.includes(' ')) {
        // Sentence mode - scramble words
        const words = cleanText.split(' ').filter(word => word.length > 0);
        return shuffleArray([...words], intensity);
      } else {
        // Word mode - scramble letters
        const letters = cleanText.split('');
        return shuffleArray([...letters], intensity);
      }
    }
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

  const handleLetterClick = (letter: string, index: number, fromType: 'scrambled' | 'answer', event?: React.MouseEvent) => {
    if (gameCompleted) return;

    const currentAnagram = anagrams[currentAnagramIndex];
    if (currentAnagram.isCompleted) return;

    // For letters-to-word mode, implement sequential correct placement
    if (currentAnagram.type === 'word') {
      if (fromType === 'scrambled' && letter) {
        // Find the next empty position from left to right
        const nextEmptyIndex = currentAnagram.currentAnswer.findIndex(slot => slot === '');
        
        if (nextEmptyIndex === -1) {
          // All slots filled, don't allow more placements
          return;
        }

        // Check if this is the correct letter for the next position
        const correctLetter = currentAnagram.original[nextEmptyIndex];
        
        if (letter === correctLetter) {
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
    } else {
      // For sentence mode, keep the original logic
      // If no item is currently selected and this slot has content, select it
      if (!selectedItem && letter) {
        setSelectedItem({ item: letter, index, fromType });
        if (event) {
          setMousePosition({ x: event.clientX, y: event.clientY });
        }
        return;
      }

      // If clicking on the same item that's selected, deselect it
      if (selectedItem && selectedItem.index === index && selectedItem.fromType === fromType) {
        setSelectedItem(null);
        return;
      }

      // If an item is selected and we're clicking on a valid target
      if (selectedItem) {
        const targetFromType = fromType;
        const selectedFromType = selectedItem.fromType;

        // Move from scrambled to answer
        if (selectedFromType === 'scrambled' && targetFromType === 'answer') {
          if (!letter) { // Only allow dropping in empty slots
            const updatedAnagrams = [...anagrams];
            updatedAnagrams[currentAnagramIndex].currentAnswer[index] = selectedItem.item;
            updatedAnagrams[currentAnagramIndex].scrambled[selectedItem.index] = '';
            setAnagrams(updatedAnagrams);
          }
        }
        // Move from answer back to scrambled
        else if (selectedFromType === 'answer' && targetFromType === 'scrambled') {
          if (!letter) { // Only allow dropping in empty slots
            const updatedAnagrams = [...anagrams];
            updatedAnagrams[currentAnagramIndex].scrambled[index] = selectedItem.item;
            updatedAnagrams[currentAnagramIndex].currentAnswer[selectedItem.index] = '';
            setAnagrams(updatedAnagrams);
          }
        }
        // Swap items within the same area or between different areas with content
        else if (letter) {
          const updatedAnagrams = [...anagrams];
          
          if (selectedFromType === 'scrambled' && targetFromType === 'scrambled') {
            // Swap within scrambled area
            updatedAnagrams[currentAnagramIndex].scrambled[selectedItem.index] = letter;
            updatedAnagrams[currentAnagramIndex].scrambled[index] = selectedItem.item;
          } else if (selectedFromType === 'answer' && targetFromType === 'answer') {
            // Swap within answer area
            updatedAnagrams[currentAnagramIndex].currentAnswer[selectedItem.index] = letter;
            updatedAnagrams[currentAnagramIndex].currentAnswer[index] = selectedItem.item;
          } else if (selectedFromType === 'scrambled' && targetFromType === 'answer') {
            // Swap between scrambled and answer
            updatedAnagrams[currentAnagramIndex].scrambled[selectedItem.index] = letter;
            updatedAnagrams[currentAnagramIndex].currentAnswer[index] = selectedItem.item;
          } else if (selectedFromType === 'answer' && targetFromType === 'scrambled') {
            // Swap between answer and scrambled
            updatedAnagrams[currentAnagramIndex].currentAnswer[selectedItem.index] = letter;
            updatedAnagrams[currentAnagramIndex].scrambled[index] = selectedItem.item;
          }
          
          setAnagrams(updatedAnagrams);
        }

        // Clear selection after any action
        setSelectedItem(null);
      }
    }
  };

  // Handle clicking outside to cancel selection
  const handleContainerClick = () => {
    if (selectedItem) {
      setSelectedItem(null);
    }
  };

  // Helper function to check if an item is currently selected
  const isItemSelected = (index: number, fromType: 'scrambled' | 'answer'): boolean => {
    return selectedItem?.index === index && selectedItem?.fromType === fromType;
  };

  const checkAnswer = () => {
    const currentAnagram = anagrams[currentAnagramIndex];
    // For word type, join letters without spaces. For sentence type, join words with spaces.
    const joinCharacter = currentAnagram.type === 'word' ? '' : ' ';
    const playerAnswer = currentAnagram.currentAnswer.filter(item => item !== '').join(joinCharacter);
    const correctAnswer = currentAnagram.original;

    const updatedAnagrams = [...anagrams];

    // Normalize answers for comparison
    const normalizeAnswer = (answer: string): string => {
      return answer
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[^\w\s]/g, ''); // Remove punctuation for comparison
    };

    const normalizedPlayerAnswer = normalizeAnswer(playerAnswer);
    const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);

    if (normalizedPlayerAnswer === normalizedCorrectAnswer) {
      // Correct answer
      updatedAnagrams[currentAnagramIndex].isCompleted = true;
      
      setFeedback(`Correct!`);
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
      setFeedbackType('');
    }, 3000);
  };

  const calculatePoints = (anagram: AnagramItem): number => {
    // For move-based scoring, we don't calculate points per anagram
    // Instead, we track total moves across all anagrams
    // This function is kept for compatibility but returns 0
    return 0;
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
    const totalMisses = gameStats.totalMisses; // Use total misses instead of moves
    
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
    setShowHint(false);
    setShowDefinition(false);
    setFeedback('');
    setFeedbackType('');
    initializeGame();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentAnagram = anagrams[currentAnagramIndex];

  // Memoize the anagram object to prevent unnecessary re-renders
  const memoizedAnagram = useMemo(() => {
    if (!currentAnagram) return null;
    return {
      id: currentAnagram.id,
      original: currentAnagram.original,
      definition: currentAnagram.definition
    };
  }, [currentAnagram?.id, currentAnagram?.original, currentAnagram?.definition]);

  if (!gameStarted) {
    return (
      <Box minH="100vh" bg={bgColor} p={6}>
        <Center>
          <Card maxW="md" w="full" bg={cardBg}>
            <CardHeader textAlign="center">
              <Heading size="lg" color="blue.500" mb={2}>
                🧩 Meaning in Motion
              </Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4}>
                <Grid templateColumns="1fr 1fr" gap={4} w="full">
                  <Stat textAlign="center">
                    <StatLabel fontSize="sm">Puzzles</StatLabel>
                    <StatNumber color="blue.500">{anagrams.length}</StatNumber>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel fontSize="sm">Mode</StatLabel>
                    <StatNumber fontSize="md" color="green.500">
                      {config.gameMode.replace('-', ' to ')}
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
                  {config.showDefinitions && (
                    <Badge colorScheme="purple" variant="outline">
                      💡 Definitions available
                    </Badge>
                  )}
                  {config.enableHints && (
                    <Badge colorScheme="cyan" variant="outline">
                      🔍 Hints available
                    </Badge>
                  )}
                </VStack>

                <Button
                  onClick={startGame}
                  colorScheme="blue"
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
                    <StatNumber color="blue.500" fontSize="3xl">{score}</StatNumber>
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
                    <StatHelpText>Puzzles solved</StatHelpText>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel>Accuracy</StatLabel>
                    <StatNumber color="purple.500" fontSize="2xl">
                      {gameStats.totalMisses + gameStats.correctAnswers > 0 ? Math.round((gameStats.correctAnswers / (gameStats.totalMisses + gameStats.correctAnswers)) * 100) : 100}%
                    </StatNumber>
                    <StatHelpText>Success rate</StatHelpText>
                  </Stat>
                </Grid>

                <HStack spacing={4} w="full" justify="center">
                  <Button
                    onClick={resetGame}
                    colorScheme="blue"
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
            <Spinner size="xl" color="blue.500" thickness="4px" />
            <Text color="gray.600">Loading puzzle...</Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={bgColor} p={4} onClick={handleContainerClick}>
      <VStack spacing={6} maxW="4xl" mx="auto">
        {/* Game Header */}
        <Card w="full" bg={cardBg}>
          <CardBody p={4}>
            <VStack spacing={3}>
              <HStack w="full" justify="space-between">
                <Badge colorScheme="blue" variant="outline">
                  Puzzle {currentAnagramIndex + 1} of {anagrams.length}
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
                  colorScheme="blue" 
                  size="md"
                  borderRadius="full"
                />
              </Box>
            </VStack>
          </CardBody>
        </Card>

        {/* Main Puzzle */}
        {config.gameMode === 'words-to-sentence' ? (
          // Use the new WordSentenceMode component for sentence arrangement
          <Box w="full">
            <WordSentenceMode
              anagram={memoizedAnagram!}
              onComplete={(isCorrect, misses) => {
                // Update the current anagram
                const updatedAnagrams = [...anagrams];
                
                if (isCorrect) {
                  updatedAnagrams[currentAnagramIndex].isCompleted = true;
                  
                  setGameStats(prev => ({
                    ...prev,
                    correctAnswers: prev.correctAnswers + 1,
                    totalMisses: prev.totalMisses + misses
                  }));

                  // Check if game is complete
                  if (currentAnagramIndex === anagrams.length - 1) {
                    setTimeout(() => completeGame(), 2000);
                  } else {
                    setTimeout(() => {
                      setCurrentAnagramIndex(prev => prev + 1);
                      setShowHint(false);
                      setShowDefinition(false);
                    }, 2000);
                  }
                } else {
                  setGameStats(prev => ({
                    ...prev,
                    totalMisses: prev.totalMisses + misses
                  }));
                }
                
                setAnagrams(updatedAnagrams);
              }}
              onHintUsed={() => {
                setGameStats(prev => ({
                  ...prev,
                  hintsUsed: prev.hintsUsed + 1
                }));
              }}
              showDefinition={showDefinition}
              enableHints={config.enableHints}
              correctFeedbackDuration={config.correctFeedbackDuration}
            />
          </Box>
        ) : (
          // Original letter/word scramble interface
          <Card w="full" bg={cardBg}>
            <CardHeader textAlign="center">
              <Heading size="md" color="gray.700">
                {currentAnagram.type === 'word' ? '🔤 Unscramble the letters:' : '📝 Arrange the words:'}
              </Heading>
            </CardHeader>
            <CardBody onClick={(e) => e.stopPropagation()}>
              <VStack spacing={6}>
                {/* Scrambled Items */}
                <Box>
                  {currentAnagram.type === 'word' ? (
                    <Text fontSize="sm" color="gray.600" mb={3} textAlign="center">
                      Click letters in the correct order to spell the word
                    </Text>
                  ) : (
                    <Text fontSize="sm" color="gray.600" mb={3} textAlign="center">
                      Click to select, then click another position to move words
                    </Text>
                  )}
                  <Flex wrap="wrap" justify="center" gap={2}>
                    {currentAnagram.scrambled.map((item, index) => (
                      <Button
                        key={index}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleLetterClick(item, index, 'scrambled', event);
                        }}
                        bg={isItemSelected(index, 'scrambled') ? 'blue.200' : item ? scrambledBg : 'gray.100'}
                        border="2px solid"
                        borderColor={isItemSelected(index, 'scrambled') ? 'blue.500' : item ? scrambledBorder : 'gray.300'}
                        color={item ? 'blue.700' : 'gray.400'}
                        minW="50px"
                        h="50px"
                        fontSize="lg"
                        fontWeight="bold"
                        isDisabled={!item}
                        opacity={isItemSelected(index, 'scrambled') ? 0.6 : 1}
                        transform={isItemSelected(index, 'scrambled') ? 'scale(0.95)' : 'scale(1)'}
                        _hover={item ? { transform: isItemSelected(index, 'scrambled') ? 'scale(0.95)' : 'translateY(-2px)', shadow: 'md' } : {}}
                        transition="all 0.2s"
                      >
                        {item || '·'}
                      </Button>
                    ))}
                  </Flex>
                </Box>

                {/* Arrow */}
                <Text fontSize="2xl">⬇️</Text>

                {/* Answer Area */}
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={3} textAlign="center">
                    Your answer
                  </Text>
                  <Flex wrap="wrap" justify="center" gap={2}>
                    {currentAnagram.currentAnswer.map((item, index) => (
                      <Button
                        key={index}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleLetterClick(item, index, 'answer', event);
                        }}
                        bg={isItemSelected(index, 'answer') ? 'green.200' : item ? answerBg : 'gray.50'}
                        border="2px solid"
                        borderColor={isItemSelected(index, 'answer') ? 'green.500' : item ? answerBorder : 'gray.300'}
                        color={item ? 'green.700' : 'gray.400'}
                        minW="50px"
                        h="50px"
                        fontSize="lg"
                        fontWeight="bold"
                        opacity={isItemSelected(index, 'answer') ? 0.6 : 1}
                        transform={isItemSelected(index, 'answer') ? 'scale(0.95)' : 'scale(1)'}
                        _hover={item ? { transform: isItemSelected(index, 'answer') ? 'scale(0.95)' : 'translateY(-2px)', shadow: 'md' } : {}}
                        transition="all 0.2s"
                      >
                        {item || '_'}
                      </Button>
                    ))}
                  </Flex>
                </Box>

                {/* Game Controls */}
                <VStack spacing={4}>
                  <HStack spacing={4}>
                    {currentAnagram.type !== 'word' && (
                      <Button
                        onClick={checkAnswer}
                        colorScheme="blue"
                        size="lg"
                        isDisabled={currentAnagram.currentAnswer.every(slot => slot === '')}
                        leftIcon={<span>✓</span>}
                      >
                        Check Answer
                      </Button>
                    )}

                    {config.enableHints && !showHint && (
                      <Button 
                        onClick={useHint} 
                        colorScheme="yellow" 
                        variant="outline"
                        leftIcon={<span>💡</span>}
                      >
                        Use Hint
                      </Button>
                    )}

                    {currentAnagram.type === 'word' && (
                      <Text fontSize="sm" color="gray.600" fontStyle="italic">
                        Word will be checked automatically when complete
                      </Text>
                    )}
                  </HStack>

                  {/* Hint Display */}
                  {showHint && (
                    <Alert status="info" borderRadius="md">
                      <AlertIcon />
                      💡 First {currentAnagram.type === 'word' ? 'letter' : 'word'}: "{currentAnagram.original.split(currentAnagram.type === 'word' ? '' : ' ')[0]}"
                    </Alert>
                  )}

                  {/* Incorrect Letter Feedback */}
                  {showIncorrectFeedback && (
                    <Box 
                      position="fixed"
                      top="50%"
                      left="50%"
                      transform="translate(-50%, -50%)"
                      zIndex={1001}
                      fontSize="6xl"
                      color="red.500"
                      fontWeight="bold"
                      pointerEvents="none"
                      sx={{
                        '@keyframes incorrectPulse': {
                          '0%': { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0 },
                          '50%': { transform: 'translate(-50%, -50%) scale(1.2)', opacity: 1 },
                          '100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.8 }
                        },
                        animation: 'incorrectPulse 0.25s ease-out'
                      }}
                    >
                      ❌
                    </Box>
                  )}

                  {/* Feedback */}
                  {feedback && (
                    <Alert 
                      status={feedbackType === 'success' ? 'success' : 'error'} 
                      borderRadius="md"
                    >
                      <AlertIcon />
                      {feedback}
                    </Alert>
                  )}
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Ghost item that follows mouse */}
        {selectedItem && (
          <Box
            position="fixed"
            left={`${mousePosition.x - 25}px`}
            top={`${mousePosition.y - 25}px`}
            bg="rgba(255, 255, 255, 0.95)"
            border="2px solid #007bff"
            borderRadius="md"
            padding="8px 12px"
            fontSize="lg"
            fontWeight="bold"
            color="#007bff"
            pointerEvents="none"
            zIndex={1000}
            boxShadow="0 4px 12px rgba(0, 0, 0, 0.3)"
            transform="rotate(-2deg)"
            whiteSpace="nowrap"
          >
            {selectedItem.item}
          </Box>
        )}
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
                      <Badge colorScheme="blue">{highScore.score} misses</Badge>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={() => setShowHighScoreModal(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Anagram; 