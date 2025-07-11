import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  getDoc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from 'firebase/auth';

// Unified HighScore interface
export interface HighScore {
  id?: string;
  userId?: string;
  playerName: string;
  score: number;
  configId: string;
  createdAt: Timestamp | Date;
  gameType: string;
}

// Scoring system types
export type ScoringSystem = 'miss-based' | 'points-based';

// High score service configuration
export interface HighScoreConfig {
  gameType: string;
  configId: string;
  scoringSystem: ScoringSystem; // 'miss-based' = lower is better, 'points-based' = higher is better
  enableRateLimit?: boolean;
  rateLimitCount?: number;
  rateLimitMinutes?: number;
}

// Error types
export class HighScoreError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'HighScoreError';
  }
}

/**
 * Load high scores for a specific game configuration
 */
export const loadHighScores = async (config: HighScoreConfig): Promise<HighScore[]> => {
  try {
    const { gameType, configId, scoringSystem } = config;
    
    const scoresQuery = query(
      collection(db, 'highScores'),
      where('configId', '==', configId),
      where('gameType', '==', gameType),
      orderBy('score', scoringSystem === 'miss-based' ? 'asc' : 'desc'),
      limit(10)
    );
    
    const querySnapshot = await getDocs(scoresQuery);
    const scores = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as HighScore[];
    
    return scores;
  } catch (error) {
    console.error('Error loading high scores:', error);
    throw new HighScoreError('Failed to load high scores', 'LOAD_ERROR');
  }
};

/**
 * Check if a score qualifies as a high score
 */
export const checkHighScore = (
  newScore: number, 
  existingScores: HighScore[], 
  scoringSystem: ScoringSystem
): boolean => {
  if (existingScores.length < 10) return true;
  
  const worstScore = existingScores[existingScores.length - 1]?.score;
  
  if (scoringSystem === 'miss-based') {
    // Lower score is better
    return newScore < worstScore;
  } else {
    // Higher score is better
    return newScore > worstScore;
  }
};

/**
 * Get enhanced player name from user data
 */
const getEnhancedPlayerName = async (
  currentUser: User | null, 
  fallbackName: string
): Promise<string> => {
  if (!currentUser) return fallbackName;
  
  let displayName = currentUser.displayName || fallbackName || 'Student';
  
  // Try to get the name from the users collection for more accurate display
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      displayName = userData.name || displayName;
    }
  } catch (error) {
    console.log('Could not fetch user name from database, using fallback');
  }
  
  return displayName;
};

/**
 * Check rate limiting for high score submissions
 */
const checkRateLimit = async (
  currentUser: User,
  config: HighScoreConfig
): Promise<void> => {
  if (!config.enableRateLimit) return;
  
  const minutes = config.rateLimitMinutes || 5;
  const maxCount = config.rateLimitCount || 5;
  
  const timeAgo = new Date();
  timeAgo.setMinutes(timeAgo.getMinutes() - minutes);
  
  const recentScoresQuery = query(
    collection(db, 'highScores'),
    where('userId', '==', currentUser.uid),
    where('configId', '==', config.configId),
    where('createdAt', '>', timeAgo),
    limit(maxCount)
  );
  
  const recentScoresSnap = await getDocs(recentScoresQuery);
  if (recentScoresSnap.size >= maxCount) {
    throw new HighScoreError(
      `Please wait a few minutes before submitting another score.`,
      'RATE_LIMIT_EXCEEDED'
    );
  }
};

/**
 * Validate game configuration exists
 */
const validateGameConfig = async (configId: string): Promise<void> => {
  const configRef = doc(db, 'userGameConfigs', configId);
  const configSnap = await getDoc(configRef);
  
  if (!configSnap.exists()) {
    throw new HighScoreError('Game configuration not found.', 'CONFIG_NOT_FOUND');
  }
};

/**
 * Save a high score to Firestore
 */
export const saveHighScore = async (
  score: number,
  playerName: string,
  currentUser: User | null,
  config: HighScoreConfig
): Promise<HighScore> => {
  const { gameType, configId } = config;
  
  // Validation
  if (!configId) {
    throw new HighScoreError('Missing game configuration ID', 'MISSING_CONFIG_ID');
  }
  
  if (!currentUser) {
    throw new HighScoreError('Must be logged in to save high score', 'NOT_AUTHENTICATED');
  }
  
  if (typeof score !== 'number' || isNaN(score) || score < 0) {
    throw new HighScoreError('Invalid score value detected', 'INVALID_SCORE');
  }
  
  // Advanced validations
  await validateGameConfig(configId);
  await checkRateLimit(currentUser, config);
  
  // Get enhanced player name
  const enhancedPlayerName = await getEnhancedPlayerName(currentUser, playerName);
  
  // Create high score data
  const highScoreData = {
    userId: currentUser.uid,
    playerName: enhancedPlayerName,
    score: score,
    configId: configId,
    gameType: gameType,
    createdAt: serverTimestamp(),
  };
  
  // Save to Firestore
  const docRef = await addDoc(collection(db, 'highScores'), highScoreData);
  
  return {
    id: docRef.id,
    ...highScoreData,
    createdAt: new Date() // Convert serverTimestamp for immediate use
  } as HighScore;
};

/**
 * High score service class for managing all operations
 */
export class HighScoreService {
  constructor(private config: HighScoreConfig) {}
  
  async loadScores(): Promise<HighScore[]> {
    return loadHighScores(this.config);
  }
  
  checkScore(newScore: number, existingScores: HighScore[]): boolean {
    return checkHighScore(newScore, existingScores, this.config.scoringSystem);
  }
  
  async saveScore(
    score: number, 
    playerName: string, 
    currentUser: User | null
  ): Promise<HighScore> {
    return saveHighScore(score, playerName, currentUser, this.config);
  }
} 