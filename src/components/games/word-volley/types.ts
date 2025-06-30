// Game state types
export type GameState = 'idle' | 'playing' | 'paused' | 'gameOver';

// Theme types
export type ThemeType = 'classic' | 'space' | 'neon' | 'ocean' | 'forest';

export interface GameTheme {
  name: string;
  background: {
    type: 'solid' | 'gradient';
    primary: string;
    secondary?: string;
  };
  paddles: {
    player: string;
    ai: string;
  };
  ball: {
    target: string;
    nonTarget: string;
  };
  text: {
    primary: string;
    secondary: string;
    target: string;
    nonTarget: string;
    background: string;
    fontFamily: string;
  };
  ui: {
    centerLine: string;
    buttons: string;
    accent: string;
  };
  effects: {
    targetGlow: string;
    correctHit: string;
    wrongHit: string;
  };
}

// Game objects
export interface Position {
  x: number;
  y: number;
}

export interface GameWord {
  text: string;
  isTarget: boolean;
}

export interface Ball extends Position {
  vx: number; // velocity x
  vy: number; // velocity y
  radius: number;
  word: GameWord;
}

export interface Paddle extends Position {
  width: number;
  height: number;
}

// Game settings
export interface GameSettings {
  targetWords: string[];
  nonTargetWords: string[];
  categoryName: string;
  theme: ThemeType;
  initialSpeed: number;
  paddleSize: number;
  maxLives: number;
  speedIncrement: number;
  wordsPerLevel: number;
  enableSound: boolean;
  enableTextToSpeech?: boolean; // Optional text-to-speech setting
  gameTime?: number; // in seconds, optional time limit
}

// Hit result for feedback
export interface HitResult {
  type: 'correct' | 'wrong' | 'bounce' | 'miss' | 'levelUp' | 'gameOver' | 'aiCorrect' | 'aiWrong' | 'aiMiss';
  points?: number;
  word?: GameWord;
}

// Game statistics
export interface GameStats {
  score: number;
  timeElapsed: number;
  wordsProcessed: number;
  correctHits: number;
  wrongHits: number;
  missedTargets: number;
  level: number;
  lives: number;
  averageReactionTime?: number;
}

// High score entry
export interface HighScoreEntry {
  id?: string;
  playerName: string;
  score: number;
  level: number;
  timeElapsed: number;
  wordsProcessed: number;
  date: Date;
  gameSettings: {
    categoryName: string;
    difficulty: 'easy' | 'medium' | 'hard';
    theme: ThemeType;
  };
}

// Configuration for game creation (teacher setup)
export interface WordVolleyConfig {
  id?: string;
  title: string;
  description?: string;
  categoryName: string;
  targetWords: string[];
  nonTargetWords: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  theme: ThemeType;
  gameTime?: number;
  maxLives: number;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Audio types
export interface GameAudio {
  correctHit: string;
  wrongHit: string;
  bounce: string;
  levelUp: string;
  gameOver: string;
  backgroundMusic?: string;
} 