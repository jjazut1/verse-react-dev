import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { sanitizeName, isValidPlayerName } from '../../../utils/profanityFilter';
import { 
  SortCategoriesConfig, 
  GameState, 
  Word, 
  EggType, 
  BasketType, 
  HighScoreType 
} from './types';
import { 
  generateEggs, 
  generateBaskets, 
  calculateScoreForPlacement, 
  isGameComplete as checkGameComplete,
  getFallbackConfigs,
  checkHighScore as checkHighScoreUtil
} from './utils';

export const useGameLogic = (
  initialConfig: SortCategoriesConfig,
  playerName: string,
  onGameComplete: (score: number) => void,
  onHighScoreProcessStart?: () => void,
  onHighScoreProcessComplete?: () => void
) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    eggs: [],
    crackedEggs: [],
    selectedWord: null,
    selectedEggId: null,
    isWordSelected: false,
    baskets: [],
    gameConfig: {
      title: 'Default Configuration',
      type: 'sort-categories-egg',
      description: 'Sort items into categories by cracking eggs',
      difficulty: 'medium',
      timeLimit: 300,
      targetScore: 100,
      eggQty: 6,
      categories: [
        { name: 'Category 1', items: ['Item 1', 'Item 2', 'Item 3'] },
        { name: 'Category 2', items: ['Item 4', 'Item 5', 'Item 6'] },
      ],
      share: false,
      createdAt: initialConfig.createdAt,
    },
    gameStarted: false,
    savedConfigs: [],
    isConfigModalOpen: false,
    isLoading: false,
    ghostPosition: { x: 0, y: 0 },
    targetBasket: null,
    isGameComplete: false,
    highScores: [],
    isHighScore: false,
    showHighScoreDisplayModal: false,
    isSubmittingScore: false,
    placedEggIds: [],
  });

  // Define functions first to avoid circular dependencies
  const loadHighScores = useCallback(async (configId: string) => {
    try {
      const q = query(
        collection(db, 'highScores'),
        where('configId', '==', configId),
        where('gameType', '==', 'sort-categories-egg'),
        orderBy('score', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const scores: HighScoreType[] = [];
      querySnapshot.forEach((doc) => {
        scores.push({ id: doc.id, ...doc.data() } as HighScoreType);
      });
      setGameState(prev => ({ ...prev, highScores: scores }));
    } catch (error) {
      console.error('Error loading high scores:', error);
    }
  }, []);

  const loadSavedConfigs = useCallback(async () => {
    try {
      setGameState(prev => ({ ...prev, isLoading: true }));
      const q = query(
        collection(db, 'userGameConfigs'),
        where('type', '==', 'sort-categories-egg'),
        where('share', '==', true)
      );
      const querySnapshot = await getDocs(q);
      const configs: SortCategoriesConfig[] = [];
      querySnapshot.forEach((doc) => {
        configs.push({ id: doc.id, ...doc.data() } as SortCategoriesConfig);
      });
      setGameState(prev => ({ ...prev, savedConfigs: configs }));
    } catch (error) {
      console.error('Error loading configurations:', error);
      // Provide fallback data
      setGameState(prev => ({ ...prev, savedConfigs: getFallbackConfigs() }));
    } finally {
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const initializeGame = useCallback((config: SortCategoriesConfig) => {
    console.log('Initializing game with config:', config);
    
    // Ensure we preserve the ID when setting the game config
    setGameState(prev => ({
      ...prev,
      gameConfig: {
        ...config,
        id: config.id // Explicitly preserve the ID
      }
    }));
    
    // Load high scores for this configuration
    if (config.id) {
      console.log('Loading high scores for config ID:', config.id);
      loadHighScores(config.id);
    } else {
      console.error('No config ID available for game initialization');
    }
    
    // Generate baskets and eggs
    const newBaskets = generateBaskets(config);
    const newEggs = generateEggs(config);
    
    setGameState(prev => ({
      ...prev,
      baskets: newBaskets,
      eggs: newEggs,
      crackedEggs: [],
      score: 0,
      gameStarted: true,
      isGameComplete: false,
      selectedWord: null,
      isWordSelected: false
    }));
  }, [loadHighScores]);

  // Load saved configurations - only run once on mount
  useEffect(() => {
    loadSavedConfigs();
  }, []); // Empty dependency array is intentional - only run once

  // Initialize game with provided config - only when initialConfig changes
  useEffect(() => {
    const emptyBaskets = generateBaskets(initialConfig);
    setGameState(prev => ({ ...prev, baskets: emptyBaskets }));
    initializeGame(initialConfig);
  }, [initialConfig]); // Only depend on initialConfig, not initializeGame to avoid loops

  // Global mouse move handler for dragging
  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (gameState.isWordSelected && gameAreaRef.current) {
        const rect = gameAreaRef.current.getBoundingClientRect();
        setGameState(prev => ({
          ...prev,
          ghostPosition: { 
            x: event.clientX - rect.left, 
            y: event.clientY - rect.top 
          }
        }));
      }
    };

    if (gameState.isWordSelected) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [gameState.isWordSelected]);

  const handleEggClick = useCallback((egg: EggType) => {
    if (egg.cracked) return;
    
    setGameState(prev => {
      const updatedEggs = prev.eggs.map(e => 
        e.id === egg.id ? { ...e, cracked: true } : e
      );
      
      const crackedEgg = updatedEggs.find(e => e.id === egg.id);
      const newCrackedEggs = crackedEgg ? [...prev.crackedEggs, crackedEgg] : prev.crackedEggs;
      
      return {
        ...prev,
        eggs: updatedEggs,
        crackedEggs: newCrackedEggs,
        selectedWord: null,
        isWordSelected: false,
        selectedEggId: egg.id
      };
    });
  }, []);

  const handleWordClick = useCallback((word: Word, e: React.MouseEvent) => {
    e.stopPropagation();
    if (gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      setGameState(prev => ({
        ...prev,
        selectedWord: word,
        isWordSelected: true,
        ghostPosition: { 
          x: e.clientX - rect.left, 
          y: e.clientY - rect.top 
        }
      }));
    }
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (gameState.isWordSelected && gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      setGameState(prev => ({
        ...prev,
        ghostPosition: { 
          x: event.clientX - rect.left, 
          y: event.clientY - rect.top 
        }
      }));
    }
  }, [gameState.isWordSelected]);

  const handleGameAreaClick = useCallback((event: React.MouseEvent) => {
    if (!gameState.isWordSelected || !gameState.selectedWord) return;

    const target = event.target as HTMLElement;
    const basketElement = target.closest('.basket');
    
    if (basketElement) {
      const basketId = basketElement.getAttribute('data-basket-id');
      const basket = gameState.baskets.find(b => b.name === basketId);
      
      if (basket) {
        placeWordInBasket(gameState.selectedWord, basket);
      }
    }
    
    // Clear selection regardless
    setGameState(prev => ({
      ...prev,
      selectedWord: null,
      isWordSelected: false
    }));
  }, [gameState.isWordSelected, gameState.selectedWord, gameState.baskets]);

  const placeWordInBasket = useCallback((word: Word, basket: BasketType) => {
    const points = calculateScoreForPlacement(word, basket);
    
    setGameState(prev => {
      const updatedBaskets = prev.baskets.map(b =>
        b.id === basket.id ? { ...b, items: [...b.items, word] } : b
      );
      
      const newScore = prev.score + points;
      const gameComplete = checkGameComplete(prev.eggs, updatedBaskets);
      const updatedPlaced = prev.selectedEggId ? [...prev.placedEggIds, prev.selectedEggId] : prev.placedEggIds;
      
      return {
        ...prev,
        baskets: updatedBaskets,
        score: newScore,
        isGameComplete: gameComplete,
        selectedWord: null,
        isWordSelected: false,
        placedEggIds: updatedPlaced,
        selectedEggId: null
      };
    });
  }, []);

  const handleConfigSelect = useCallback((config: SortCategoriesConfig) => {
    initializeGame(config);
    setGameState(prev => ({ ...prev, isConfigModalOpen: false }));
  }, []); // Remove initializeGame dependency to avoid circular reference

  const handleResetGame = useCallback(() => {
    initializeGame(gameState.gameConfig);
  }, [gameState.gameConfig]); // Remove initializeGame dependency to avoid circular reference

  const handleCloseGame = useCallback(() => {
    onGameComplete(gameState.score);
  }, [gameState.score, onGameComplete]);

  const checkHighScore = useCallback((newScore: number) => {
    return checkHighScoreUtil(newScore, gameState.highScores);
  }, [gameState.highScores]);

  const saveHighScore = useCallback(async (finalScore?: number) => {
    const scoreToSave = finalScore ?? gameState.score;
    
    if (!isValidPlayerName(playerName)) {
      toast({
        title: "Invalid Name",
        description: "Please enter a valid player name.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const sanitizedName = sanitizeName(playerName);
    const isHighScoreResult = checkHighScore(scoreToSave);

    if (isHighScoreResult && onHighScoreProcessStart) {
      onHighScoreProcessStart();
    }

    if (isHighScoreResult) {
      try {
        setGameState(prev => ({ ...prev, isSubmittingScore: true }));
        
        const highScoreData = {
          playerName: sanitizedName,
          score: scoreToSave,
          configId: gameState.gameConfig.id || 'unknown',
          gameType: 'sort-categories-egg',
          userId: currentUser?.uid || null,
          createdAt: serverTimestamp(),
        };

        await addDoc(collection(db, 'highScores'), highScoreData);
        
        setGameState(prev => ({ 
          ...prev, 
          isHighScore: true,
          showHighScoreDisplayModal: true
        }));
        
        // Reload high scores
        if (gameState.gameConfig.id) {
          await loadHighScores(gameState.gameConfig.id);
        }
        
        toast({
          title: "High Score Saved!",
          description: `Congratulations ${sanitizedName}! Your score of ${scoreToSave} has been saved.`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } catch (error) {
        console.error('Error saving high score:', error);
        toast({
          title: "Error",
          description: "Failed to save high score. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setGameState(prev => ({ ...prev, isSubmittingScore: false }));
      }
    } else {
      // Not a high score, but still show completion modal
      setGameState(prev => ({ 
        ...prev, 
        isHighScore: false,
        showHighScoreDisplayModal: true
      }));
    }

    if (onHighScoreProcessComplete) {
      onHighScoreProcessComplete();
    }

    onGameComplete(scoreToSave);
  }, [gameState.score, gameState.gameConfig.id, gameState.highScores, playerName, currentUser, checkHighScore, loadHighScores, onHighScoreProcessStart, onHighScoreProcessComplete, onGameComplete, toast]);

  const handleHighScoreDisplayModalClose = useCallback(() => {
    setGameState(prev => ({ 
      ...prev, 
      showHighScoreDisplayModal: false,
      isHighScore: false
    }));
  }, []);

  const openConfigModal = useCallback(() => {
    setGameState(prev => ({ ...prev, isConfigModalOpen: true }));
  }, []);

  const closeConfigModal = useCallback(() => {
    setGameState(prev => ({ ...prev, isConfigModalOpen: false }));
  }, []);

  // Check for game completion
  useEffect(() => {
    if (gameState.isGameComplete && !gameState.showHighScoreDisplayModal) {
      saveHighScore();
    }
  }, [gameState.isGameComplete, gameState.showHighScoreDisplayModal, saveHighScore]);

  return {
    gameState,
    gameAreaRef,
    handleEggClick,
    handleWordClick,
    handleMouseMove,
    handleGameAreaClick,
    handleConfigSelect,
    handleResetGame,
    handleCloseGame,
    handleHighScoreDisplayModalClose,
    openConfigModal,
    closeConfigModal,
    loadSavedConfigs
  };
}; 