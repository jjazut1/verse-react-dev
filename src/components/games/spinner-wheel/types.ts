import { GameConfig } from '../../../types/game';

export interface SpinnerWheelProps {
  onGameComplete: (score: number) => void;
  config: GameConfig;
}

export interface SpinnerWheelItem {
  id: string;
  text: string;
  color: string;
  content?: string; // Add content field for rich text
}

export interface ZoomTarget {
  x: number;
  y: number;
  segmentIndex: number;
}

export interface ParsedTextNode {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  superscript?: boolean;
  subscript?: boolean;
}

export interface ColorTheme {
  primaryColors: string[];
  pastel: string[];
  bright: string[];
  patriotic: string[];
  greenShades: string[];
  desert: string[];
  ocean: string[];
  sunset: string[];
  custom: string[];
}

export interface GameState {
  items: SpinnerWheelItem[];
  selected: string | null;
  spinning: boolean;
  rotation: number;
  spinCount: number;
  gameComplete: boolean;
  selectionHistory: string[];
  isZoomed: boolean;
  zoomTarget: ZoomTarget;
} 