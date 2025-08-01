// Word Volley Session Sync Types
// Consolidates 20+ useState calls into efficient, sync-ready state structure

import { GameSettings } from './types';

// === CORE SESSION STATE ===
export interface WordVolleySessionState {
  // Core game state (sync immediately)
  game: {
    state: 'idle' | 'playing' | 'paused' | 'gameOver';
    phase: 'serving' | 'playing' | 'scoring' | 'completed';
    serveToAI: boolean;
    ballMoving: boolean;
    lastCollisionFrame: number;
  };

  // Scores & progress (sync immediately)
  scores: {
    player: number;
    ai: number;
    level: number;
    lives: number;
    timeElapsed: number;
    timeRemaining: number;
  };

  // Hit tracking (sync immediately)
  hits: {
    wordsProcessed: number;
    correctHits: number;
    wrongHits: number;
    missedTargets: number;
    aiCorrectHits: number;
    aiWrongHits: number;
  };

  // Game objects (sync with throttling)
  gameObjects: {
    ball: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      word: string;
    };
    playerPaddle: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    aiPaddle: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };

  // Settings (sync once at start)
  settings: GameSettings;

  // Session metadata
  session: {
    id: string;
    teacherId: string;
    studentId: string;
    teacherConnected: boolean;
    studentConnected: boolean;
    isTeacherControlled: boolean;
    lastUpdateTimestamp: number;
    currentController: 'teacher' | 'student' | 'both';
  };
}

// === SYNC OPTIMIZATION ===
export type SyncCategory = 
  | 'immediate'     // Scores, game state changes
  | 'throttled'     // Ball/paddle positions (10fps max)
  | 'rare'          // Settings, session metadata
  | 'student-only'  // Student paddle (teacher sees, but doesn't control)
  | 'teacher-only'; // AI paddle, ball physics (teacher controls)

export interface StateUpdate {
  category: SyncCategory;
  path: string;
  value: any;
  timestamp: number;
  userId: string;
  priority: 'high' | 'medium' | 'low';
}

// Optimized throttle rates for 60fps game
export const SYNC_THROTTLE_MS = {
  'immediate': 0,        // Score changes, game state
  'throttled': 100,      // Ball/paddle positions (10fps)
  'rare': 0,             // Settings changes
  'student-only': 50,    // Student paddle movement (20fps)
  'teacher-only': 100,   // AI and ball physics (10fps)
};

// === CONNECTION MANAGEMENT ===
export interface ConnectionStatus {
  userId: string;
  role: 'teacher' | 'student';
  isConnected: boolean;
  lastSeen: number;
  latency: number;
  quality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

export interface SessionConfig {
  sessionId: string;
  gameType: 'word-volley';
  teacherId: string;
  studentId: string;
  maxLatency: number;
  syncInterval: number;
  connectionTimeout: number;
}

// === HELPER FUNCTIONS ===

// Determine sync category based on state path and user role
export function getSyncCategory(path: string, userRole: 'teacher' | 'student'): SyncCategory {
  // Immediate sync for critical game events
  if (path.startsWith('game.') || path.startsWith('scores.') || path.startsWith('hits.')) {
    return 'immediate';
  }
  
  // Student paddle - only student controls, teacher observes
  if (path === 'gameObjects.playerPaddle' && userRole === 'student') {
    return 'student-only';
  }
  
  // Ball and AI paddle - teacher controls game physics
  if ((path.startsWith('gameObjects.ball') || path === 'gameObjects.aiPaddle') && userRole === 'teacher') {
    return 'teacher-only';
  }
  
  // Settings and session metadata
  if (path.startsWith('settings.') || path.startsWith('session.')) {
    return 'rare';
  }
  
  // Default to throttled for other game objects
  return 'throttled';
}

// Generate readable session IDs
export function generateSessionId(): string {
  const adjectives = ['Fast', 'Smart', 'Quick', 'Bright', 'Swift', 'Sharp', 'Bold', 'Cool'];
  const nouns = ['Pong', 'Game', 'Ball', 'Match', 'Play', 'Rally', 'Volley', 'Court'];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${adjective}-${noun}-${number}`;
}

// Create initial state from game settings
export function createInitialState(config: GameSettings, sessionId: string = ''): WordVolleySessionState {
  return {
    game: {
      state: 'idle',
      phase: 'serving',
      serveToAI: true,
      ballMoving: false,
      lastCollisionFrame: 0
    },
    scores: {
      player: 0,
      ai: 0,
      level: 1,
      lives: config.maxLives,
      timeElapsed: 0,
      timeRemaining: config.gameTime || 180
    },
    hits: {
      wordsProcessed: 0,
      correctHits: 0,
      wrongHits: 0,
      missedTargets: 0,
      aiCorrectHits: 0,
      aiWrongHits: 0
    },
    gameObjects: {
      ball: {
        x: 400, // CANVAS_WIDTH / 2
        y: 300, // CANVAS_HEIGHT / 2
        vx: 0,
        vy: 0,
        radius: 10,
        word: 'START'
      },
      playerPaddle: {
        x: 780, // CANVAS_WIDTH - PADDLE_WIDTH
        y: 290, // CANVAS_HEIGHT / 2 - paddleSize / 2
        width: 20,
        height: config.paddleSize
      },
      aiPaddle: {
        x: 0,
        y: 275, // CANVAS_HEIGHT / 2 - AI_PADDLE_HEIGHT / 2
        width: 20,
        height: 50
      }
    },
    settings: config,
    session: {
      id: sessionId,
      teacherId: '',
      studentId: '',
      teacherConnected: false,
      studentConnected: false,
      isTeacherControlled: true,
      lastUpdateTimestamp: Date.now(),
      currentController: 'teacher'
    }
  };
} 