import { Word, GameConfig } from './types';

// Sample words with syllable counts
export const sampleWords: Word[] = [
  { id: '1', text: 'cat', syllables: 1 },
  { id: '2', text: 'dog', syllables: 1 },
  { id: '3', text: 'rabbit', syllables: 2 },
  { id: '4', text: 'elephant', syllables: 3 },
  { id: '5', text: 'hippopotamus', syllables: 5 },
  { id: '6', text: 'butterfly', syllables: 3 },
  { id: '7', text: 'caterpillar', syllables: 4 },
  { id: '8', text: 'dinosaur', syllables: 3 },
  { id: '9', text: 'octopus', syllables: 3 },
  { id: '10', text: 'penguin', syllables: 2 },
  { id: '11', text: 'giraffe', syllables: 2 },
  { id: '12', text: 'zebra', syllables: 2 },
  { id: '13', text: 'kangaroo', syllables: 3 },
  { id: '14', text: 'koala', syllables: 3 },
  { id: '15', text: 'panda', syllables: 2 },
  { id: '16', text: 'tiger', syllables: 2 },
  { id: '17', text: 'lion', syllables: 2 },
  { id: '18', text: 'monkey', syllables: 2 },
  { id: '19', text: 'bear', syllables: 1 },
  { id: '20', text: 'wolf', syllables: 1 },
];

// Default game configuration
export const defaultConfig: GameConfig = {
  totalEggs: 10,
  minSyllables: 1,
  maxSyllables: 3,
  difficulty: 'medium',
};

/**
 * Generates random position for an egg within the game area
 */
export const generateRandomPosition = (): { x: number; y: number } => ({
  x: Math.random() * 80 + 10, // 10-90%
  y: Math.random() * 60 + 20, // 20-80%
});

/**
 * Calculates final score with time bonus
 */
export const calculateFinalScore = (baseScore: number): number => {
  const timeBonus = Math.floor(Math.random() * 50); // Simulated time bonus
  return baseScore + timeBonus;
};

/**
 * Validates game configuration
 */
export const validateGameConfig = (config: GameConfig): string[] => {
  const errors: string[] = [];
  
  if (config.totalEggs < 5 || config.totalEggs > 20) {
    errors.push('Total eggs must be between 5 and 20');
  }
  
  if (config.minSyllables < 1 || config.minSyllables > 5) {
    errors.push('Minimum syllables must be between 1 and 5');
  }
  
  if (config.maxSyllables < config.minSyllables || config.maxSyllables > 5) {
    errors.push('Maximum syllables must be greater than minimum and no more than 5');
  }
  
  return errors;
}; 