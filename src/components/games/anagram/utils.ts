import { AnagramItem } from './types';
import { AnagramConfig } from '../../../types/game';

// Scramble text based on intensity
export const scrambleText = (text: string, intensity: 'low' | 'medium' | 'high'): string[] => {
  // Only handle letters-to-word mode (clean text and scramble letters)
  const cleanText = text.replace(/[^\w]/g, '');
  const letters = cleanText.split('');
  return shuffleArray([...letters], intensity);
};

// Shuffle array with different intensities
export const shuffleArray = (array: string[], intensity: 'low' | 'medium' | 'high'): string[] => {
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

// Initialize anagrams from config
export const initializeAnagrams = (config: AnagramConfig): AnagramItem[] => {
  return config.anagrams.map((anagram, index) => {
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
};

// Normalize answer for comparison
export const normalizeAnswer = (answer: string): string => {
  return answer.toLowerCase().replace(/[^\w]/g, '');
};

// Check if answer is correct
export const checkAnswerCorrectness = (currentAnswer: string[], original: string): boolean => {
  const userAnswer = currentAnswer.join('');
  const normalizedUserAnswer = normalizeAnswer(userAnswer);
  const normalizedOriginal = normalizeAnswer(original);
  return normalizedUserAnswer === normalizedOriginal;
};

// Format time in MM:SS format
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Calculate score based on difficulty and time
export const calculateScore = (difficulty: 'easy' | 'medium' | 'hard', timeElapsed: number): number => {
  const baseScore = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30;
  const timeBonus = Math.max(0, 60 - timeElapsed); // Bonus for completing quickly
  return baseScore + Math.floor(timeBonus / 10);
};

// Check if score qualifies as high score
export const checkHighScore = (newScore: number, highScores: any[]): boolean => {
  if (highScores.length < 10) return true;
  return newScore > Math.min(...highScores.map(hs => hs.score));
}; 