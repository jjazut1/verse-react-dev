import { Timestamp, FieldValue } from 'firebase/firestore';

// Enhanced Folder-related interfaces for 4-level hierarchy
export interface GameFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  userId: string;
  order: number;
  parentId?: string | null; // null means root folder
  depth?: number; // 0 = root, 1 = level 1, 2 = level 2, 3 = level 3 (max 4 levels)
  children?: GameFolder[]; // Populated when building tree structure
  createdAt: Date;
  updatedAt: Date;
}

// Tree node type for recursive rendering
export interface FolderTreeNode extends GameFolder {
  children: FolderTreeNode[];
  level: number; // Computed level for rendering
  isExpanded?: boolean; // For collapsible folders
  gameCount?: number; // Total games in this folder and subfolders
}

export interface GameWithFolder {
  folderId?: string;
  folderName?: string;
  folderColor?: string;
}

export interface GameWithFolderAndId extends GameWithFolder {
  id: string;
  title?: string;
  gameType?: string;
}

export interface GameFolderAssignment {
  id: string;
  gameId: string;
  folderId: string;
  userId: string;
  assignedAt: Date;
}

// Drag and drop types
export interface DragItem {
  id: string;
  type: 'folder' | 'game';
  data: GameFolder | GameWithFolderAndId;
}

export interface DropResult {
  draggedItem: DragItem;
  targetFolderId: string | null;
  newParentId?: string | null; // For folder reparenting
}

// Folder operation types
export interface FolderOperation {
  type: 'create' | 'update' | 'delete' | 'move';
  folderId: string;
  parentId?: string | null;
  data?: Partial<GameFolder>;
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
  enableTextToSpeech: boolean;
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
  showHints: boolean;
  enableTextToSpeech: boolean;
  maxAttempts: number;
  sentences: Array<{
    id: string;
    original: string; // The correct sentence
    definition?: string; // Optional context/hint
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
}

export interface PlaceValueShowdownConfig extends BaseGameConfig {
  type: 'place-value-showdown';
  numberOfCards: 1 | 2 | 3 | 4 | 5; // Number of digit cards per round (1-5 for max ##,###.###)
  objective: 'largest' | 'smallest'; // What number to create
  winningScore: number; // Points needed to win (default 5)
  aiDifficulty: 'easy' | 'medium' | 'hard'; // How smart the teacher AI is
  playerName: string; // Student's name
  teacherName: string; // Teacher's name (for display)
  enableHints: boolean; // Show place value hints
  gameMode: 'student-vs-teacher' | 'practice'; // Competition vs practice mode
  includeDecimal: boolean; // Whether to include decimal places (default: false)
  decimalPlaces: 1 | 2 | 3; // Number of decimal places when enabled (default: 3)
}

export interface WordVolleyConfig extends BaseGameConfig {
  type: 'word-volley';
  gameSpeed: number; // 1-5 speed levels
  paddleSize: number; // 1-10 paddle size
  theme: 'classic' | 'space' | 'neon' | 'ocean' | 'forest';
  targetCategory: {
    id: string;
    name: string;
    words: string[];
  };
  nonTargetCategory: {
    id: string;
    name: string;
    words: string[];
  };
  gameTime: number; // Game duration in seconds
  winningScore: number; // Score needed to win
}

export type GameConfig = WhackAMoleConfig | SortCategoriesConfig | SpinnerWheelConfig | AnagramConfig | SentenceSenseConfig | PlaceValueShowdownConfig | WordVolleyConfig;

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