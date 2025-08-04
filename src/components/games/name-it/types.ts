export interface GameIcon {
  id: string;
  html: string; // HTML entity or image HTML
  type: 'emoji' | 'image';
  dataIcon: string; // For comparison
}

export interface GameCard {
  id: string;
  icons: GameIcon[];
  position: 'center' | 'player1' | 'player2';
}

export interface Player {
  id: string;
  name: string;
  score: number;
  isLocal: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

export interface GameConfig {
  id?: string;
  title: string;
  description: string;
  gameTime: number; // in seconds
  iconSet: GameIcon[];
  maxPlayers: 2; // Spot It is typically 2 players
  enableSound: boolean;
  enableWebRTC: boolean;
  difficulty: 'debug' | 'easy' | 'medium' | 'hard';
}

export interface GameState {
  gameStarted: boolean;
  gameCompleted: boolean;
  gamePaused: boolean;
  timeLeft: number;
  currentRound: number;
  cards: GameCard[];
  players: Player[];
  currentPlayerId: string | null;
  winner: Player | null;
  showHighScoreModal: boolean;
  isNewHighScore: boolean;
  matchFound: { playerId: string; iconId: string } | null;
}

export interface WebRTCState {
  localConnection: RTCPeerConnection | null;
  remoteConnection: RTCPeerConnection | null;
  isHost: boolean;
  connectionId: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'failed';
  lastError: string | null;
}

export interface WebRTCMessage {
  type: 'game_state' | 'player_action' | 'icon_click' | 'game_start' | 'game_reset' | 'offer' | 'answer' | 'ice_candidate';
  data: any;
  timestamp: number;
  playerId: string;
  senderId?: string; // For Firebase signaling messages
}

export interface PlayerAction {
  type: 'icon_click' | 'start_game' | 'reset_game' | 'score_update' | 'new_cards' | 'player_join' | 'pause_game' | 'resume_game' | 'match_found';
  iconId?: string;
  playerId?: string;
  score?: number;
  cards?: GameCard[];
  playerInfo?: {
    id: string;
    name: string;
  };
  timestamp: number;
}

export interface NameItProps {
  gameConfig?: Partial<GameConfig>;
  onGameComplete?: (score: number, timeElapsed: number) => void;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
  onGameExit?: () => void;
  configId?: string;
  playerName?: string;
  enableWebRTC?: boolean;
}

export interface GameStats {
  totalMatches: number;
  averageResponseTime: number;
  correctMatches: number;
  incorrectMatches: number;
  timeElapsed: number;
  roundsPlayed: number;
}

// Configuration schema interfaces
export interface NameItConfigSchema {
  title: string;
  description: string;
  sections: ConfigSection[];
}

export interface ConfigSection {
  title: string;
  description?: string;
  fields: ConfigField[];
}

export interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'range';
  defaultValue?: any;
  options?: Array<{ value: any; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  description?: string;
} 