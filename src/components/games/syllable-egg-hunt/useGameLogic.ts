import { useState, useEffect } from 'react';
import { Word, Egg, Basket, GameConfig, GameStats } from './types';
import { sampleWords, generateRandomPosition, calculateFinalScore } from './utils';
import { useCustomToast } from '../../../hooks/useCustomToast';

export const useGameLogic = (
  playerName: string,
  onGameComplete: (score: number) => void
) => {
  // Game state
  const [score, setScore] = useState(0);
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [crackedEggs, setCrackedEggs] = useState<string[]>([]);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [baskets, setBaskets] = useState<Basket[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [correctPlacements, setCorrectPlacements] = useState(0);
  const [incorrectPlacements, setIncorrectPlacements] = useState(0);

  const { showToast } = useCustomToast();

  // Initialize game when started
  const initializeGame = (config: GameConfig) => {
    // Create baskets based on syllable range
    const newBaskets: Basket[] = [];
    for (let i = config.minSyllables; i <= config.maxSyllables; i++) {
      newBaskets.push({
        id: `basket-${i}`,
        syllableCount: i,
        words: [],
      });
    }
    setBaskets(newBaskets);

    // Select random words for eggs
    const selectedWords = [...sampleWords]
      .sort(() => 0.5 - Math.random())
      .slice(0, config.totalEggs)
      .filter(word => 
        word.syllables >= config.minSyllables && 
        word.syllables <= config.maxSyllables
      );

    // Create eggs with random positions
    const newEggs: Egg[] = selectedWords.map((word, index) => ({
      id: `egg-${index}`,
      word,
      isCracked: false,
      position: generateRandomPosition(),
    }));

    setEggs(newEggs);
    setCrackedEggs([]);
    setSelectedWord(null);
    setScore(0);
    setCorrectPlacements(0);
    setIncorrectPlacements(0);
  };

  // Handle egg click
  const handleEggClick = (eggId: string) => {
    if (crackedEggs.includes(eggId)) return;

    const egg = eggs.find(e => e.id === eggId);
    if (!egg) return;

    setSelectedWord(egg.word);
    setCrackedEggs([...crackedEggs, eggId]);
    
    showToast({
      title: 'Egg Cracked!',
      description: `You found the word: ${egg.word.text}`,
      status: 'info',
      duration: 3000,
    });
  };

  // Handle basket click
  const handleBasketClick = (basketId: string) => {
    if (!selectedWord) return;

    const basket = baskets.find(b => b.id === basketId);
    if (!basket) return;

    if (basket.syllableCount === selectedWord.syllables) {
      // Correct basket
      const updatedBaskets = baskets.map(b => {
        if (b.id === basketId) {
          return {
            ...b,
            words: [...b.words, selectedWord],
          };
        }
        return b;
      });
      setBaskets(updatedBaskets);
      setSelectedWord(null);
      setScore(score + 10);
      setCorrectPlacements(prev => prev + 1);
      
      showToast({
        title: 'Correct!',
        description: `${selectedWord.text} has ${selectedWord.syllables} syllable(s)!`,
        status: 'success',
        duration: 2000,
      });
    } else {
      // Incorrect basket
      setScore(Math.max(0, score - 5));
      setIncorrectPlacements(prev => prev + 1);
      
      showToast({
        title: 'Incorrect!',
        description: `${selectedWord.text} does not have ${basket.syllableCount} syllable(s).`,
        status: 'error',
        duration: 2000,
      });
    }
  };

  // Start game
  const startGame = (config: GameConfig) => {
    setGameStarted(true);
    setGameCompleted(false);
    initializeGame(config);
  };

  // Reset game
  const resetGame = () => {
    setGameStarted(false);
    setGameCompleted(false);
    setEggs([]);
    setCrackedEggs([]);
    setBaskets([]);
    setSelectedWord(null);
    setScore(0);
    setCorrectPlacements(0);
    setIncorrectPlacements(0);
  };

  // Check if game is complete
  useEffect(() => {
    if (gameStarted && crackedEggs.length === eggs.length && eggs.length > 0) {
      const allWordsSorted = baskets.every(basket => 
        basket.words.length === eggs.filter(egg => egg.word.syllables === basket.syllableCount).length
      );
      
      if (allWordsSorted) {
        setGameCompleted(true);
        const finalScore = calculateFinalScore(score);
        onGameComplete(finalScore);
        showToast({
          title: 'Congratulations!',
          description: `You completed the game with a score of ${finalScore}!`,
          status: 'success',
          duration: 5000,
        });
      }
    }
  }, [crackedEggs, baskets, eggs, gameStarted, score, onGameComplete, showToast]);

  // Calculate game stats
  const gameStats: GameStats = {
    score,
    crackedEggs: crackedEggs.length,
    totalEggs: eggs.length,
    correctPlacements,
    incorrectPlacements,
  };

  return {
    // State
    score,
    eggs,
    crackedEggs,
    selectedWord,
    baskets,
    gameStarted,
    gameCompleted,
    gameStats,
    
    // Actions
    handleEggClick,
    handleBasketClick,
    startGame,
    resetGame,
  };
}; 