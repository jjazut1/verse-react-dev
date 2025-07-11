import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { 
  HighScore, 
  HighScoreConfig, 
  HighScoreService, 
  HighScoreError,
  ScoringSystem 
} from '../services/highScoreService';

// Hook configuration
export interface UseHighScoreConfig {
  gameType: string;
  configId: string;
  scoringSystem: ScoringSystem;
  enableRateLimit?: boolean;
  rateLimitCount?: number;
  rateLimitMinutes?: number;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
}

// Hook return type
export interface UseHighScoreReturn {
  // State
  highScores: HighScore[];
  isLoading: boolean;
  isSubmittingScore: boolean;
  isNewHighScore: boolean;
  showHighScoreModal: boolean;
  error: string | null;
  
  // Functions
  loadHighScores: () => Promise<void>;
  checkHighScore: (score: number) => boolean;
  saveHighScore: (score: number, playerName: string) => Promise<void>;
  setShowHighScoreModal: (show: boolean) => void;
  clearError: () => void;
}

/**
 * Custom hook for managing high scores in games
 */
export const useHighScore = (config: UseHighScoreConfig): UseHighScoreReturn => {
  const { currentUser } = useAuth();
  const toast = useToast();
  
  // State
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [showHighScoreModal, setShowHighScoreModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Create service instance
  const highScoreService = new HighScoreService({
    gameType: config.gameType,
    configId: config.configId,
    scoringSystem: config.scoringSystem,
    enableRateLimit: config.enableRateLimit,
    rateLimitCount: config.rateLimitCount,
    rateLimitMinutes: config.rateLimitMinutes,
  });
  
  // Load high scores
  const loadHighScores = useCallback(async () => {
    if (!config.configId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const scores = await highScoreService.loadScores();
      setHighScores(scores);
    } catch (err) {
      const errorMessage = err instanceof HighScoreError ? err.message : 'Failed to load high scores';
      setError(errorMessage);
      console.error('Error loading high scores:', err);
    } finally {
      setIsLoading(false);
    }
  }, [config.configId, config.gameType]);
  
  // Check if score qualifies as high score
  const checkHighScore = useCallback((score: number): boolean => {
    return highScoreService.checkScore(score, highScores);
  }, [highScores]);
  
  // Save high score
  const saveHighScore = useCallback(async (score: number, playerName: string) => {
    if (!config.configId) {
      toast({
        title: 'Error',
        description: 'Cannot save high score: missing game configuration',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    
    setIsSubmittingScore(true);
    setError(null);
    
    // Check if this is a high score
    const isHighScoreResult = checkHighScore(score);
    setIsNewHighScore(isHighScoreResult);
    
    // Notify parent component
    if (isHighScoreResult && config.onHighScoreProcessStart) {
      config.onHighScoreProcessStart();
    }
    
    try {
      if (isHighScoreResult) {
        // Save the high score
        await highScoreService.saveScore(score, playerName, currentUser);
        
        // Reload high scores
        await loadHighScores();
        
        toast({
          title: 'High Score Saved!',
          description: `Congratulations! Your score of ${score} has been recorded.`,
          status: 'success',
          duration: 5000,
        });
      }
      
      // Show the high score modal
      setShowHighScoreModal(true);
      
    } catch (err) {
      const errorMessage = err instanceof HighScoreError ? err.message : 'Failed to save high score';
      setError(errorMessage);
      
      // Handle specific error types with user-friendly messages
      if (err instanceof HighScoreError) {
        let title = 'Error Saving Score';
        let description = err.message;
        
        switch (err.code) {
          case 'RATE_LIMIT_EXCEEDED':
            title = 'Too Many Attempts';
            break;
          case 'NOT_AUTHENTICATED':
            title = 'Authentication Required';
            break;
          case 'CONFIG_NOT_FOUND':
            title = 'Configuration Error';
            break;
          case 'INVALID_SCORE':
            title = 'Invalid Score';
            break;
        }
        
        toast({
          title,
          description,
          status: 'error',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Error Saving Score',
          description: 'Could not save your high score. Please try again.',
          status: 'error',
          duration: 3000,
        });
      }
      
      console.error('Error saving high score:', err);
    } finally {
      setIsSubmittingScore(false);
      
      // Always notify completion
      if (config.onHighScoreProcessComplete) {
        config.onHighScoreProcessComplete();
      }
    }
  }, [
    config.configId,
    config.onHighScoreProcessStart,
    config.onHighScoreProcessComplete,
    currentUser,
    checkHighScore,
    loadHighScores,
    toast
  ]);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Load high scores on mount and when config changes
  useEffect(() => {
    loadHighScores();
  }, [loadHighScores]);
  
  return {
    // State
    highScores,
    isLoading,
    isSubmittingScore,
    isNewHighScore,
    showHighScoreModal,
    error,
    
    // Functions
    loadHighScores,
    checkHighScore,
    saveHighScore,
    setShowHighScoreModal,
    clearError,
  };
}; 