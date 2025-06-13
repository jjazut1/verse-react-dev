import { Timestamp } from 'firebase/firestore';

export interface SentenceItem {
  id: string;
  original: string;
  definition?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ConfigFormData {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  targetScore: number;
  share: boolean;
  enableHints: boolean;
  maxAttempts: number;
  correctFeedbackDuration: 'always' | 'momentary';
  sentences: SentenceItem[];
}

export interface ConfigSectionProps {
  config: ConfigFormData;
  onUpdate: (updates: Partial<ConfigFormData>) => void;
}

export interface SentenceEditorProps extends ConfigSectionProps {
  onAddSentence: () => void;
  onUpdateSentence: (index: number, updates: Partial<SentenceItem>) => void;
  onRemoveSentence: (index: number) => void;
}



// Game-specific interfaces
export interface SentenceSenseProps {
  playerName: string;
  onGameComplete: (score: number) => void;
  config: any; // Will use SentenceSenseConfig from main types
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