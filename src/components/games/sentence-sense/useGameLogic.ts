import { useState, useEffect, useRef } from 'react';
import { GameSentenceItem, GameStats } from './types';
import { SentenceSenseConfig } from '../../../types/game';

export const useGameLogic = (
  config: SentenceSenseConfig,
  playerName: string,
  onGameComplete: (score: number) => void
) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState<GameSentenceItem[]>([]);
  const [score, setScore] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [gameStats, setGameStats] = useState<GameStats>({
    totalMisses: 0,
    correctAnswers: 0,
    timeElapsed: 0,
    hintsUsed: 0
  });

  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize game on mount
  useEffect(() => {
    initializeGame();
    setGameStarted(true);
    setTimeElapsed(0);

    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
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
    const initializedSentences = config.sentences.map((sentence, index) => ({
      id: sentence.id || index.toString(),
      original: sentence.original,
      definition: sentence.definition,
      difficulty: sentence.difficulty,
      currentAnswer: [],
      isCompleted: false
    }));
    setSentences(initializedSentences);
  };

  const completeGame = async () => {
    setGameCompleted(true);
    const totalMisses = gameStats.totalMisses;
    
    setGameStats(prev => ({
      ...prev,
      timeElapsed: timeElapsed
    }));

    setScore(totalMisses);

    onGameComplete(totalMisses);
  };

  const resetGame = () => {
    setGameStarted(true);
    setGameCompleted(false);
    setCurrentSentenceIndex(0);
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

  const handleSentenceComplete = (isCorrect: boolean, misses: number) => {
    const updatedSentences = [...sentences];
    
    if (isCorrect) {
      updatedSentences[currentSentenceIndex].isCompleted = true;
      
      setGameStats(prev => ({
        ...prev,
        correctAnswers: prev.correctAnswers + 1,
        totalMisses: prev.totalMisses + misses
      }));

      if (currentSentenceIndex === sentences.length - 1) {
        setTimeout(() => completeGame(), 2000);
      } else {
        setTimeout(() => {
          setCurrentSentenceIndex(prev => prev + 1);
        }, 2000);
      }
    } else {
      setGameStats(prev => ({
        ...prev,
        totalMisses: prev.totalMisses + misses
      }));
    }
    
    setSentences(updatedSentences);
  };

  const handleHintUsed = () => {
    setGameStats(prev => ({
      ...prev,
      hintsUsed: prev.hintsUsed + 1
    }));
  };

  return {
    // State
    gameStarted,
    gameCompleted,
    currentSentenceIndex,
    sentences,
    score,
    timeElapsed,
    gameStats,
    
    // Actions
    resetGame,
    handleSentenceComplete,
    handleHintUsed,
    
    // Current sentence
    currentSentence: sentences[currentSentenceIndex]
  };
}; 