import { Timestamp, FieldValue } from 'firebase/firestore';

// Folder-related interfaces
export interface GameFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  userId: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameWithFolder {
  folderId?: string;
  folderName?: string;
  folderColor?: string;
}

interface BaseGameConfig {
  id?: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  targetScore: number;
  share: boolean;
  email?: string;
  createdAt?: Timestamp | FieldValue;
  userId?: string;
}

export interface WhackAMoleConfig extends BaseGameConfig {
  type: 'whack-a-mole';
  gameTime: number;
  pointsPerHit: number;
  penaltyPoints: number;
  bonusPoints: number;
  bonusThreshold: number;
  speed?: 1 | 2 | 3; // Speed setting: 1=slow (10-12 moles), 2=medium (14-16 moles), 3=fast (17-19 moles)
  instructions?: string; // Custom instructions for the game
  categories: Array<{
    title: string;
    words: string[];
  }>;
}

interface SortCategoriesConfig extends BaseGameConfig {
  type: 'sort-categories-egg';
  eggQty: number;
  categories: Array<{
    name: string;
    items: string[] | Array<{ content: string; text: string; }>;
  }>;
  richCategories?: Array<{
    name: string;
    items: Array<{ content: string; text: string; }>;
  }>;
}

interface SpinnerWheelConfig extends BaseGameConfig {
  type: 'spinner-wheel';
  items: Array<{
    id: string;
    text: string;
    color?: string;
  }>;
  removeOnSelect: boolean;
  wheelTheme: 'primaryColors' | 'pastel' | 'bright' | 'patriotic' | 'greenShades' | 'desert' | 'ocean' | 'sunset' | 'custom';
  customColors: string[];
  soundEnabled: boolean;
  maxSpins?: number;
  instructions: string;
}

export interface AnagramConfig extends BaseGameConfig {
  type: 'anagram';
  showDefinitions: boolean;
  enableHints: boolean;
  maxAttempts: number;
  shuffleIntensity: 'low' | 'medium' | 'high';
  anagrams: Array<{
    id: string;
    original: string; // The correct word
    definition?: string; // Optional definition/hint
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
}

export interface SentenceSenseConfig extends BaseGameConfig {
  type: 'sentence-sense';
  enableHints: boolean;
  maxAttempts: number;
  correctFeedbackDuration: 'always' | 'momentary';
  sentences: Array<{
    id: string;
    original: string; // The correct sentence
    definition?: string; // Optional context/hint
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
}

export interface PlaceValueShowdownConfig extends BaseGameConfig {
  type: 'place-value-showdown';
  numberOfCards: 2 | 3 | 4 | 5; // Number of digit cards per round
  objective: 'largest' | 'smallest'; // What number to create
  winningScore: number; // Points needed to win (default 5)
  aiDifficulty: 'easy' | 'medium' | 'hard'; // How smart the teacher AI is
  playerName: string; // Student's name
  teacherName: string; // Teacher's name (for display)
  enableHints: boolean; // Show place value hints
  gameMode: 'student-vs-teacher' | 'practice'; // Competition vs practice mode
}

export type GameConfig = WhackAMoleConfig | SortCategoriesConfig | SpinnerWheelConfig | AnagramConfig | SentenceSenseConfig | PlaceValueShowdownConfig;

export interface Word {
  text: string;
  category: string;
}

export interface Egg {
  id: string;
  word: Word;
  cracked: boolean;
  position: {
    x: number;
    y: number;
  };
}

export interface Basket {
  id: string;
  name: string;
  items: Word[];
}

export interface HighScore {
  id?: string;
  playerName: string;
  score: number;
  configId: string;
  createdAt: Timestamp | FieldValue;
  userId: string;
} 