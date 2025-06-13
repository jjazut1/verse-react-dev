import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { AnagramConfig } from '../../../types/game';
import { GameState, AnagramItem, HighScore, GameStats } from './types';
import { 
  initializeAnagrams, 
  checkAnswerCorrectness, 
  calculateScore, 
  checkHighScore as checkHighScoreUtil,
  formatTime 
} from './utils';

export const useGameLogic = (
  config: AnagramConfig,
  playerName: string,
  onGameComplete: (score: number) => void,
  onHighScoreProcessStart?: () => void,
  onHighScoreProcessComplete?: () => void
) => {
  const [gameState, setGameState] = useState<GameState>({
    gameStarted: false,
    gameCompleted: false,
    currentAnagramIndex: 0,
    anagrams: [],
    score: 0,
    timeElapsed: 0,
    gameStats: {
      totalMisses: 0,
      correctAnswers: 0,
      timeElapsed: 0,
      hintsUsed: 0
    },
    showHint: false,
    showDefinition: false,
    highScores: [],
    showHighScoreModal: false,
    isNewHighScore: false,
    feedback: '',
    feedbackType: 'info',
    showIncorrectFeedback: false
  });

  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const incorrectFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize game on mount
  useEffect(() => {
    initializeGame();
    loadHighScores();

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (incorrectFeedbackTimeoutRef.current) clearTimeout(incorrectFeedbackTimeoutRef.current);
    };
  }, [config]);

  // Game timer
  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameCompleted) {
      gameTimerRef.current = setInterval(() => {
        setGameState(prev => ({ ...prev, timeElapsed: prev.timeElapsed + 1 }));
      }, 1000);
    } else {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    }

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [gameState.gameStarted, gameState.gameCompleted]);

  const initializeGame = useCallback(() => {
    const initializedAnagrams = initializeAnagrams(config);
    setGameState(prev => ({ ...prev, anagrams: initializedAnagrams }));
  }, [config]);

  const handleLetterClick = useCallback((letter: string, index: number, fromType: 'scrambled' | 'answer') => {
    if (gameState.gameCompleted) return;

    const currentAnagram = gameState.anagrams[gameState.currentAnagramIndex];
    if (currentAnagram.isCompleted) return;

    // Implement sequential correct placement for letters-to-word mode
    if (fromType === 'scrambled' && letter) {
      // Find the next empty position from left to right
      const nextEmptyIndex = currentAnagram.currentAnswer.findIndex(slot => slot === '');
      
      if (nextEmptyIndex === -1) return; // All slots filled

      // Check if this is the correct letter for the next position
      const correctLetter = currentAnagram.original[nextEmptyIndex];
      
      if (letter.toLowerCase() === correctLetter.toLowerCase()) {
        // Correct letter! Place it in the next position
        setGameState(prev => {
          const updatedAnagrams = [...prev.anagrams];
          updatedAnagrams[prev.currentAnagramIndex].currentAnswer[nextEmptyIndex] = letter;
          updatedAnagrams[prev.currentAnagramIndex].scrambled[index] = '';
          
          return { ...prev, anagrams: updatedAnagrams };
        });

        // Check if word is now complete
        const updatedAnswer = [...currentAnagram.currentAnswer];
        updatedAnswer[nextEmptyIndex] = letter;
        const isWordComplete = updatedAnswer.every(slot => slot !== '');
        
        if (isWordComplete) {
          setTimeout(() => checkAnswer(), 500);
        }
      } else {
        // Incorrect letter! Show X feedback and count as miss
        setGameState(prev => ({
          ...prev,
          showIncorrectFeedback: true,
          gameStats: {
            ...prev.gameStats,
            totalMisses: prev.gameStats.totalMisses + 1
          }
        }));
        
        // Clear the feedback after 250ms
        if (incorrectFeedbackTimeoutRef.current) {
          clearTimeout(incorrectFeedbackTimeoutRef.current);
        }
        incorrectFeedbackTimeoutRef.current = setTimeout(() => {
          setGameState(prev => ({ ...prev, showIncorrectFeedback: false }));
        }, 250);
      }
      return;
    }

    // Allow removing letters from answer back to scrambled
    if (fromType === 'answer' && letter) {
      const emptyScrambledIndex = currentAnagram.scrambled.findIndex(slot => slot === '');
      if (emptyScrambledIndex !== -1) {
        setGameState(prev => {
          const updatedAnagrams = [...prev.anagrams];
          updatedAnagrams[prev.currentAnagramIndex].scrambled[emptyScrambledIndex] = letter;
          updatedAnagrams[prev.currentAnagramIndex].currentAnswer[index] = '';
          return { ...prev, anagrams: updatedAnagrams };
        });
      }
    }
  }, [gameState.gameCompleted, gameState.anagrams, gameState.currentAnagramIndex]);

  const checkAnswer = useCallback(() => {
    const currentAnagram = gameState.anagrams[gameState.currentAnagramIndex];
    const isCorrect = checkAnswerCorrectness(currentAnagram.currentAnswer, currentAnagram.original);

    if (isCorrect) {
      // Correct answer
      setGameState(prev => {
        const updatedAnagrams = [...prev.anagrams];
        updatedAnagrams[prev.currentAnagramIndex].isCompleted = true;
        
        return {
          ...prev,
          anagrams: updatedAnagrams,
          feedback: `Correct! The word is "${currentAnagram.original}"`,
          feedbackType: 'success' as const,
          gameStats: {
            ...prev.gameStats,
            correctAnswers: prev.gameStats.correctAnswers + 1
          }
        };
      });

      // Check if game is complete
      if (gameState.currentAnagramIndex === gameState.anagrams.length - 1) {
        setTimeout(() => completeGame(), 2000);
      } else {
        // Move to next anagram
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            currentAnagramIndex: prev.currentAnagramIndex + 1,
            showHint: false,
            showDefinition: false
          }));
        }, 2000);
      }
    } else {
      // Incorrect answer - count as miss
      setGameState(prev => ({
        ...prev,
        feedback: 'Try again!',
        feedbackType: 'error' as const,
        gameStats: {
          ...prev.gameStats,
          totalMisses: prev.gameStats.totalMisses + 1
        }
      }));
    }

    // Clear feedback after 3 seconds
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        feedback: '',
        feedbackType: 'info' as const
      }));
    }, 3000);
  }, [gameState.anagrams, gameState.currentAnagramIndex]);

  const useHint = useCallback(() => {
    if (gameState.showHint) return;
    
    setGameState(prev => ({
      ...prev,
      showHint: true,
      gameStats: {
        ...prev.gameStats,
        hintsUsed: prev.gameStats.hintsUsed + 1
      }
    }));
  }, [gameState.showHint]);

  const toggleDefinition = useCallback(() => {
    setGameState(prev => ({ ...prev, showDefinition: !prev.showDefinition }));
  }, []);

  const completeGame = useCallback(async () => {
    const totalMisses = gameState.gameStats.totalMisses;
    
    setGameState(prev => ({
      ...prev,
      gameCompleted: true,
      score: totalMisses,
      gameStats: {
        ...prev.gameStats,
        timeElapsed: prev.timeElapsed
      }
    }));

    // Check for high score (lower misses = better score)
    const isHighScore = checkHighScoreUtil(totalMisses, gameState.highScores);
    if (isHighScore && onHighScoreProcessStart) {
      onHighScoreProcessStart();
    }

    if (isHighScore) {
      await saveHighScore(totalMisses);
    }

    if (onHighScoreProcessComplete) {
      onHighScoreProcessComplete();
    }

    onGameComplete(totalMisses);
  }, [gameState.gameStats.totalMisses, gameState.timeElapsed, gameState.highScores, onHighScoreProcessStart, onHighScoreProcessComplete, onGameComplete]);

  const loadHighScores = useCallback(async () => {
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
      setGameState(prev => ({ ...prev, highScores: scores }));
    } catch (error) {
      console.error('Error loading high scores:', error);
    }
  }, [config.id]);

  const saveHighScore = useCallback(async (finalScore: number) => {
    try {
      const newHighScore = {
        playerName: playerName,
        score: finalScore,
        configId: config.id || 'demo',
        createdAt: new Date(),
        gameType: 'anagram'
      };

      await addDoc(collection(db, 'highScores'), newHighScore);
      setGameState(prev => ({
        ...prev,
        isNewHighScore: true,
        showHighScoreModal: true
      }));
      await loadHighScores();
    } catch (error) {
      console.error('Error saving high score:', error);
    }
  }, [playerName, config.id, loadHighScores]);

  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gameStarted: true,
      timeElapsed: 0
    }));
  }, []);

  const resetGame = useCallback(() => {
    setGameState({
      gameStarted: false,
      gameCompleted: false,
      currentAnagramIndex: 0,
      anagrams: [],
      score: 0,
      timeElapsed: 0,
      gameStats: {
        totalMisses: 0,
        correctAnswers: 0,
        timeElapsed: 0,
        hintsUsed: 0
      },
      showHint: false,
      showDefinition: false,
      highScores: gameState.highScores, // Keep existing high scores
      showHighScoreModal: false,
      isNewHighScore: false,
      feedback: '',
      feedbackType: 'info',
      showIncorrectFeedback: false
    });
    initializeGame();
  }, [gameState.highScores, initializeGame]);

  const closeHighScoreModal = useCallback(() => {
    setGameState(prev => ({ ...prev, showHighScoreModal: false }));
  }, []);

  return {
    gameState,
    handleLetterClick,
    checkAnswer,
    useHint,
    toggleDefinition,
    startGame,
    resetGame,
    closeHighScoreModal,
    formatTime
  };
}; 