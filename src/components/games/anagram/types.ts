import { AnagramConfig } from '../../../types/game';
import { Timestamp } from 'firebase/firestore';

export interface AnagramProps {
  playerName: string;
  onGameComplete: (score: number) => void;
  config: AnagramConfig;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
}

export interface HighScore {
  id?: string;
  userId?: string;
  playerName: string;
  score: number;
  configId: string;
  createdAt: Timestamp | Date;
  gameType?: string;
}

export interface AnagramItem {
  id: string;
  original: string;
  definition?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  scrambled: string[];
  currentAnswer: string[];
  isCompleted: boolean;
}

export interface GameStats {
  totalMisses: number;
  correctAnswers: number;
  timeElapsed: number;
  hintsUsed: number;
}

export interface GameState {
  gameStarted: boolean;
  gameCompleted: boolean;
  currentAnagramIndex: number;
  anagrams: AnagramItem[];
  score: number;
  timeElapsed: number;
  gameStats: GameStats;
  showHint: boolean;
  showDefinition: boolean;
  highScores: HighScore[];
  showHighScoreModal: boolean;
  isNewHighScore: boolean;
  feedback: string;
  feedbackType: 'success' | 'error' | 'info';
  showIncorrectFeedback: boolean;
} 