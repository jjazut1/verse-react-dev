import { Timestamp } from 'firebase/firestore';

// Game-specific interfaces
export interface SentenceSenseProps {
  playerName: string;
  onGameComplete: (score: number) => void;
  config: any; // Will use SentenceSenseConfig from main types
}

export interface GameSentenceItem {
  id: string;
  original: string;
  definition?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  currentAnswer: string[];
  isCompleted: boolean;
}

export interface GameStats {
  totalMisses: number;
  correctAnswers: number;
  timeElapsed: number;
  hintsUsed: number;
} 