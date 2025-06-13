export interface Word {
  id: string;
  text: string;
  syllables: number;
}

export interface Egg {
  id: string;
  word: Word;
  isCracked: boolean;
  position: { x: number; y: number };
}

export interface Basket {
  id: string;
  syllableCount: number;
  words: Word[];
}

export interface GameConfig {
  totalEggs: number;
  minSyllables: number;
  maxSyllables: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SyllableEggHuntProps {
  playerName: string;
  onGameComplete: (score: number) => void;
}

export interface GameStats {
  score: number;
  crackedEggs: number;
  totalEggs: number;
  correctPlacements: number;
  incorrectPlacements: number;
} 