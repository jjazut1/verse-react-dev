import { useState, useEffect, useRef } from 'react';
import { GameSentenceItem, GameStats, HighScore } from './types';
import { SentenceSenseConfig } from '../../../types/game';
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export const useGameLogic = (
  config: SentenceSenseConfig,
  playerName: string,
  onGameComplete: (score: number) => void,
  onHighScoreProcessStart?: () => void,
  onHighScoreProcessComplete?: () => void
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
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [showHighScoreModal, setShowHighScoreModal] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize game on mount
  useEffect(() => {
    initializeGame();
    loadHighScores();
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

  const loadHighScores = async () => {
    try {
      const scoresQuery = query(
        collection(db, 'highScores'),
        where('configId', '==', config.id || 'demo'),
        orderBy('score', 'asc'),
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
        gameType: 'sentence-sense'
      };

      await addDoc(collection(db, 'highScores'), newHighScore);
      await loadHighScores();
      setShowHighScoreModal(true);
    } catch (error) {
      console.error('Error saving high score:', error);
    }
  };

  const completeGame = async () => {
    setGameCompleted(true);
    const totalMisses = gameStats.totalMisses;
    
    setGameStats(prev => ({
      ...prev,
      timeElapsed: timeElapsed
    }));

    setScore(totalMisses);

    const isHighScore = checkHighScore(totalMisses);
    setIsNewHighScore(isHighScore);
    
    if (isHighScore && onHighScoreProcessStart) {
      onHighScoreProcessStart();
    }

    if (isHighScore) {
      await saveHighScore(totalMisses);
    } else {
      await loadHighScores();
      setShowHighScoreModal(true);
    }

    if (onHighScoreProcessComplete) {
      onHighScoreProcessComplete();
    }

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
    highScores,
    showHighScoreModal,
    isNewHighScore,
    
    // Actions
    resetGame,
    handleSentenceComplete,
    handleHintUsed,
    setShowHighScoreModal,
    
    // Current sentence
    currentSentence: sentences[currentSentenceIndex]
  };
}; 