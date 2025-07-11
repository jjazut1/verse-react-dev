import { PlaceValueShowdownConfig } from '../../../types/game';

export interface Card {
  id: string;
  digit: number;
  position: 'deck' | 'slot';
  slotIndex?: number;
}

export interface GameState {
  phase: 'dealing' | 'arranging' | 'revealing' | 'gameComplete';
  round: number;
  studentScore: number;
  teacherScore: number;
  studentCards: Card[];
  teacherCards: Card[];
  studentNumber: number | null;
  teacherNumber: number | null;
  roundWinner: 'student' | 'teacher' | 'tie' | null;
  message: string;
  isStudentReady: boolean;
  isTeacherReady: boolean;
}

export interface SelectionState {
  selectedCard: Card | null;
  isCardSelected: boolean;
  ghostPosition: { x: number; y: number };
}

export interface PlaceValueShowdownProps {
  playerName: string;
  onGameComplete: (score: number) => void;
  config: PlaceValueShowdownConfig;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
}

export interface GameHeaderProps {
  config: PlaceValueShowdownConfig;
  gameState: GameState;
  showPlaceValueLabels: boolean;
  setShowPlaceValueLabels: (value: boolean) => void;
  showExpandedNumbers: boolean;
  setShowExpandedNumbers: (value: boolean) => void;
  showExpandedWords: boolean;
  setShowExpandedWords: (value: boolean) => void;
  onAdvanceToNextRound: () => void;
}

export interface SlotContainerProps {
  children: React.ReactNode;
  showPlaceValueLabels: boolean;
  slotIndex: number;
  totalSlots: number;
  hasComma?: boolean;
  config: PlaceValueShowdownConfig;
}

export interface PlayerAreaProps {
  isTeacher: boolean;
  config: PlaceValueShowdownConfig;
  gameState: GameState;
  showPlaceValueLabels: boolean;
  showExpandedNumbers: boolean;
  showExpandedWords: boolean;
  onSlotClick?: (slotIndex: number) => void;
  onCardClick?: (card: Card, e: React.MouseEvent) => void;
  onReturnToDeck?: (card: Card) => void;
  selectionState?: SelectionState;
}

export interface GameSettings {
  showPlaceValueLabels: boolean;
  showExpandedNumbers: boolean;
  showExpandedWords: boolean;
} 