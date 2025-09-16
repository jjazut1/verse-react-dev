import { GameConfig as GameConfigType, Word, Egg as EggType, Basket as BasketType, HighScore as HighScoreType } from '../../../types/game';

// Use the specific config type for this game
export type SortCategoriesConfig = Extract<GameConfigType, { type: 'sort-categories-egg' }> & {
  textToSpeechMode?: string; // Add textToSpeechMode for new TTS system
  containerType?: string; // Add containerType for different container graphics
};

export interface SortCategoriesEggRevealProps {
  playerName: string;
  onGameComplete: (score: number) => void;
  config: SortCategoriesConfig;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
}

export interface GameState {
  score: number;
  eggs: EggType[];
  crackedEggs: EggType[];
  selectedWord: Word | null;
  selectedEggId: string | null;
  isWordSelected: boolean;
  baskets: BasketType[];
  gameConfig: SortCategoriesConfig;
  gameStarted: boolean;
  savedConfigs: SortCategoriesConfig[];
  isConfigModalOpen: boolean;
  isLoading: boolean;
  ghostPosition: { x: number; y: number };
  targetBasket: BasketType | null;
  isGameComplete: boolean;
  highScores: HighScoreType[];
  isHighScore: boolean;
  showHighScoreDisplayModal: boolean;
  isSubmittingScore: boolean;
  placedEggIds: string[];
}

export interface RichTextProps {
  content: string;
  fontSize: any;
  noPadding?: boolean;
}

// Re-export types from game types
export type { Word, EggType, BasketType, HighScoreType }; 