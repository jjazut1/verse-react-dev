import { useState, useEffect, useRef, useCallback } from 'react';
import { AnagramConfig } from '../../../types/game';
import { GameState, AnagramItem, GameStats } from './types';
import { 
  initializeAnagrams, 
  checkAnswerCorrectness, 
  calculateScore,
  formatTime 
} from './utils';
import { useHighScore } from '../../../hooks/useHighScore';

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
    highScores: [], // This will be managed by the new hook
    showHighScoreModal: false,
    isNewHighScore: false,
    feedback: '',
    feedbackType: 'info',
    showIncorrectFeedback: false
  });

  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const incorrectFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use the new unified high score system
  const highScoreSystem = useHighScore({
    gameType: 'anagram',
    configId: config.id || 'demo',
    scoringSystem: 'miss-based', // Lower misses = better score
    enableRateLimit: true,
    onHighScoreProcessStart,
    onHighScoreProcessComplete,
  });

  // Initialize game on mount
  useEffect(() => {
    initializeGame();

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
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    }

    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    };
  }, [gameState.gameStarted, gameState.gameCompleted]);

  const initializeGame = useCallback(() => {
    const anagrams = initializeAnagrams(config);
    setGameState(prev => ({
      ...prev,
      anagrams,
      currentAnagramIndex: 0,
      showHint: false,
      showDefinition: false
    }));
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
      },
      // Update with the unified high score data
      highScores: highScoreSystem.highScores,
      isNewHighScore: highScoreSystem.isNewHighScore,
      showHighScoreModal: true // We'll handle this differently now
    }));

    // Use the new unified high score system
    await highScoreSystem.saveHighScore(totalMisses, playerName);

    onGameComplete(totalMisses);
  }, [gameState.gameStats.totalMisses, gameState.timeElapsed, highScoreSystem, playerName, onGameComplete]);

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
      highScores: highScoreSystem.highScores, // Keep current high scores
      showHighScoreModal: false,
      isNewHighScore: false,
      feedback: '',
      feedbackType: 'info',
      showIncorrectFeedback: false
    });
    initializeGame();
  }, [highScoreSystem.highScores, initializeGame]);

  const closeHighScoreModal = useCallback(() => {
    setGameState(prev => ({ ...prev, showHighScoreModal: false }));
    highScoreSystem.setShowHighScoreModal(false);
  }, [highScoreSystem]);

  return {
    gameState: {
      ...gameState,
      // Merge in the high score system state
      highScores: highScoreSystem.highScores,
      showHighScoreModal: highScoreSystem.showHighScoreModal,
      isNewHighScore: highScoreSystem.isNewHighScore,
    },
    // High score system functions and state
    highScoreSystem,
    // Game functions
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