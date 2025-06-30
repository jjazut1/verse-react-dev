import { GameTheme, GameSettings, ThemeType, GameWord } from './types';

// Canvas dimensions
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;

// Game constants
export const PADDLE_WIDTH = 15; // Reduced from 20
export const BALL_RADIUS = 35; // Increased from 25
export const AI_PADDLE_HEIGHT = 80; // Reduced from 120
export const INITIAL_PLAYER_PADDLE_HEIGHT = 80; // Reduced from 120
export const MIN_PADDLE_HEIGHT = 40; // Reduced from 60

// Physics constants
export const BOUNCE_RANDOMNESS = 0.1;
export const MAX_BALL_SPEED = 12;
export const MIN_BALL_SPEED = 3;

// Scoring
export const POINTS_CORRECT_HIT = 10;
export const POINTS_WRONG_HIT = -5;
export const POINTS_LEVEL_BONUS = 50;

// Game themes
export const THEMES: Record<ThemeType, GameTheme> = {
  classic: {
    name: 'Classic Pong',
    background: {
      type: 'solid',
      primary: '#000000',
    },
    paddles: {
      player: '#00FF00',
      ai: '#FF0000',
    },
    ball: {
      target: '#87CEEB',
      nonTarget: '#87CEEB',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#CCCCCC',
      target: '#000000',
      nonTarget: '#000000',
      background: 'rgba(255, 255, 255, 0.9)',
      fontFamily: 'Comic Neue, cursive',
    },
    ui: {
      centerLine: '#444444',
      buttons: '#00FF00',
      accent: '#FFFF00',
    },
    effects: {
      targetGlow: '#00FF00',
      correctHit: '#00FF00',
      wrongHit: '#FF0000',
    },
  },
  space: {
    name: 'Space Adventure',
    background: {
      type: 'gradient',
      primary: '#0B0C2A',
      secondary: '#1E1A78',
    },
    paddles: {
      player: '#00D4FF',
      ai: '#FF6B35',
    },
    ball: {
      target: '#87CEEB',
      nonTarget: '#87CEEB',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#A4B0BE',
      target: '#000000',
      nonTarget: '#000000',
      background: 'rgba(11, 12, 42, 0.8)',
      fontFamily: 'Comic Neue, cursive',
    },
    ui: {
      centerLine: '#3742FA',
      buttons: '#00D4FF',
      accent: '#FFA502',
    },
    effects: {
      targetGlow: '#00FF94',
      correctHit: '#00FF94',
      wrongHit: '#FF4757',
    },
  },
  neon: {
    name: 'Neon Cyber',
    background: {
      type: 'gradient',
      primary: '#0F0F23',
      secondary: '#2E0249',
    },
    paddles: {
      player: '#FF00FF',
      ai: '#00FFFF',
    },
    ball: {
      target: '#87CEEB',
      nonTarget: '#87CEEB',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#FF00FF',
      target: '#000000',
      nonTarget: '#000000',
      background: 'rgba(15, 15, 35, 0.9)',
      fontFamily: 'Comic Neue, cursive',
    },
    ui: {
      centerLine: '#FF00FF',
      buttons: '#00FFFF',
      accent: '#FFFF00',
    },
    effects: {
      targetGlow: '#FFFF00',
      correctHit: '#FFFF00',
      wrongHit: '#FF0080',
    },
  },
  ocean: {
    name: 'Ocean Depths',
    background: {
      type: 'gradient',
      primary: '#1B263B',
      secondary: '#0F4C75',
    },
    paddles: {
      player: '#4ECDC4',
      ai: '#F38BA8',
    },
    ball: {
      target: '#87CEEB',
      nonTarget: '#87CEEB',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B3E5FC',
      target: '#000000',
      nonTarget: '#000000',
      background: 'rgba(27, 38, 59, 0.8)',
      fontFamily: 'Comic Neue, cursive',
    },
    ui: {
      centerLine: '#4ECDC4',
      buttons: '#96CEB4',
      accent: '#FFD93D',
    },
    effects: {
      targetGlow: '#96CEB4',
      correctHit: '#96CEB4',
      wrongHit: '#FF8A80',
    },
  },
  forest: {
    name: 'Enchanted Forest',
    background: {
      type: 'gradient',
      primary: '#1B4332',
      secondary: '#2D5016',
    },
    paddles: {
      player: '#95D5B2',
      ai: '#F4A261',
    },
    ball: {
      target: '#87CEEB',
      nonTarget: '#87CEEB',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#D8F3DC',
      target: '#000000',
      nonTarget: '#000000',
      background: 'rgba(27, 67, 50, 0.8)',
      fontFamily: 'Comic Neue, cursive',
    },
    ui: {
      centerLine: '#52B788',
      buttons: '#74C69D',
      accent: '#F9C74F',
    },
    effects: {
      targetGlow: '#74C69D',
      correctHit: '#74C69D',
      wrongHit: '#E76F51',
    },
  },
};

// Default game settings with integer speeds for pixel-perfect movement
export const DEFAULT_SETTINGS: GameSettings = {
  targetWords: ['cat', 'bat', 'hat', 'mat', 'sat', 'pat', 'fat', 'rat'],
  nonTargetWords: ['dog', 'sun', 'pen', 'book', 'tree', 'car', 'fish', 'bird'],
  categoryName: 'Short A Words',
  theme: 'classic',
  initialSpeed: 4, // Integer speed for crisp text rendering
  paddleSize: INITIAL_PLAYER_PADDLE_HEIGHT,
  maxLives: 3,
  speedIncrement: 1, // Integer increment for pixel-perfect movement
  wordsPerLevel: 10,
  enableSound: true,
  gameTime: 180 // Default 3 minutes
};

// Utility functions
export const getRandomWord = (settings: GameSettings): GameWord => {
  const useTarget = Math.random() < 0.6; // 60% chance for target words
  const wordList = useTarget ? settings.targetWords : settings.nonTargetWords;
  const text = wordList[Math.floor(Math.random() * wordList.length)];
  return { text, isTarget: useTarget };
};

export const calculateCollision = (
  ballX: number,
  ballY: number,
  ballRadius: number,
  paddleX: number,
  paddleY: number,
  paddleWidth: number,
  paddleHeight: number
): boolean => {
  // Simple AABB collision detection
  const ballLeft = ballX - ballRadius;
  const ballRight = ballX + ballRadius;
  const ballTop = ballY - ballRadius;
  const ballBottom = ballY + ballRadius;

  const paddleLeft = paddleX;
  const paddleRight = paddleX + paddleWidth;
  const paddleTop = paddleY;
  const paddleBottom = paddleY + paddleHeight;

  return (
    ballRight >= paddleLeft &&
    ballLeft <= paddleRight &&
    ballBottom >= paddleTop &&
    ballTop <= paddleBottom
  );
};

export const calculateBounceAngle = (
  ballY: number,
  paddleY: number,
  paddleHeight: number
): number => {
  // Calculate where the ball hit the paddle (0 = top, 1 = bottom)
  let hitPoint = (ballY - paddleY) / paddleHeight;
  
  // Clamp hit point to prevent extreme angles when ball hits paddle edges
  hitPoint = clamp(hitPoint, 0.1, 0.9); // Limit to 10%-90% of paddle height
  
  // Convert to angle with more natural bounce behavior
  const maxAngle = Math.PI / 4; // Reduced from 60 to 45 degrees for more natural bounces
  const angle = (hitPoint - 0.5) * 2 * maxAngle;
  
  return angle;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatAccuracy = (correct: number, total: number): string => {
  if (total === 0) return '0%';
  return `${Math.round((correct / total) * 100)}%`;
};

export const getDifficultySettings = (difficulty: 'easy' | 'medium' | 'hard'): Partial<GameSettings> => {
  switch (difficulty) {
    case 'easy':
      return {
        initialSpeed: 3, // Integer speed for pixel-perfect movement
        maxLives: 5,
        speedIncrement: 1, // Integer increment for crisp movement
        wordsPerLevel: 8,
      };
    case 'medium':
      return {
        initialSpeed: 4, // Integer speed for pixel-perfect movement
        maxLives: 3,
        speedIncrement: 1, // Integer increment for crisp movement
        wordsPerLevel: 10,
      };
    case 'hard':
      return {
        initialSpeed: 5, // Integer speed for pixel-perfect movement
        maxLives: 2,
        speedIncrement: 1, // Integer increment for crisp movement
        wordsPerLevel: 12,
      };
    default:
      return {};
  }
};

// Text-to-speech utility (for accessibility)
export const speakWord = (word: string, isTarget: boolean): void => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8;
    utterance.pitch = isTarget ? 1.2 : 0.8;
    speechSynthesis.speak(utterance);
  }
};

// Vibration feedback (for mobile)
export const vibrateFeedback = (pattern: number | number[]): void => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

// Screen shake effect calculation
export const calculateScreenShake = (intensity: number): { x: number; y: number } => {
  return {
    x: (Math.random() - 0.5) * intensity,
    y: (Math.random() - 0.5) * intensity,
  };
}; 