import { useState, useCallback, useRef } from 'react';
import { GameState, Player, GameCard } from '../types';

// ✅ FIX: Score remapping utility - ID-based, not index-based
function remapScores(oldScores: Record<string, number>, players: Player[]): Record<string, number> {
  const newScores: Record<string, number> = {};
  const realPlayerIds = new Set(players.map(p => p.id));

  console.log('🔄 useGameState: REMAPPING SCORES - Input:', {
    oldScores,
    players: players.map((p, idx) => `${idx}: ${p.name}(${p.id.slice(-8)})`)
  });

  // Copy over existing real player scores (these take precedence)
  for (const [key, value] of Object.entries(oldScores)) {
    if (realPlayerIds.has(key)) {
      newScores[key] = value;
      console.log(`🔄 useGameState: Preserving real player score: ${key.slice(-8)} → ${value}`);
    }
  }

  // Migrate scores from placeholders ONLY if real ID doesn't already have one
  for (const [key, value] of Object.entries(oldScores)) {
    if (key.startsWith('placeholder-player-')) {
      const index = parseInt(key.replace('placeholder-player-', ''), 10);
      const player = players[index];

      if (player && newScores[player.id] === undefined) {
        newScores[player.id] = value;
        console.log(`🔄 useGameState: Migrated placeholder ${key} → ${player.id.slice(-8)} (score: ${value})`);
      } else if (player) {
        console.log(`🔄 useGameState: Skipping migration ${key} → ${player.id.slice(-8)} (real score ${newScores[player.id]} already exists)`);
      }
    }
  }

  // Fill in 0 for any missing players
  players.forEach(p => {
    if (newScores[p.id] === undefined) {
      newScores[p.id] = 0;
      console.log(`🔄 useGameState: Defaulting player ${p.id.slice(-8)} to score 0`);
    }
  });

  console.log('🔄 useGameState: REMAPPING COMPLETE - Final scores:', newScores);
  return newScores;
}

interface UseGameStateProps {
  initialTimeLeft: number;
  initialPlayers: Player[];
}

interface UseGameStateReturn {
  gameState: GameState;
  updateGameState: (updater: (prev: GameState) => GameState) => void;
  resetGameState: () => void;
  setCards: (cards: GameCard[]) => void;
  setPlayers: (playersOrUpdater: Player[] | ((prev: Player[]) => Player[])) => void;
  updatePlayerScore: (playerId: string, score: number) => void;
  setMatchFound: (match: { playerId: string; iconId: string } | null) => void;
  setGameStarted: (started: boolean) => void;
  setGamePaused: (paused: boolean) => void;
  setGameCompleted: (completed: boolean) => void;
  setTimeLeft: (time: number) => void;
}

export const useGameState = ({ 
  initialTimeLeft, 
  initialPlayers 
}: UseGameStateProps): UseGameStateReturn => {
  console.log('🎮 useGameState: Initializing with timeLeft:', initialTimeLeft, 'players:', initialPlayers.length);

  // ✅ FIX: Persist scores across component re-renders with smart ID mapping
  const persistedScoresRef = useRef<Record<string, number>>({});
  
  const initialScores = initialPlayers.reduce<Record<string, number>>((acc, player) => {
    // Try to find score under current player ID first
    let score = persistedScoresRef.current[player.id];
    
    // If no score found and this is a placeholder, try to find corresponding real ID score
    if (score === undefined && player.id.startsWith('placeholder-player-')) {
      // Look for any real player ID that might have a score we can migrate back
      const allScores = persistedScoresRef.current;
      const realPlayerIds = Object.keys(allScores).filter(id => 
        !id.startsWith('placeholder-player-') && allScores[id] > 0
      );
      
      if (realPlayerIds.length > 0) {
        // For placeholder-player-0, try to find the first real player score
        // For placeholder-player-1, try to find the second real player score  
        const playerIndex = parseInt(player.id.replace('placeholder-player-', ''));
        if (playerIndex < realPlayerIds.length) {
          score = allScores[realPlayerIds[playerIndex]];
          console.log(`📊 useGameState: Found real player score for ${player.id}: ${score} (from ${realPlayerIds[playerIndex]})`);
        }
      }
    }
    
    // Use found score or default to 0
    acc[player.id] = score || 0;
    return acc;
  }, {});

  // Initialize with preserved scores
  console.log('📊 useGameState: Using preserved scores:', initialScores);

  const [gameState, setGameState] = useState<GameState>({
    gameStarted: false,
    gameCompleted: false,
    gamePaused: false,
    timeLeft: initialTimeLeft,
    currentRound: 0,
    cards: [],
    players: initialPlayers,
    currentPlayerId: null,
    winner: null,
    showHighScoreModal: false,
    isNewHighScore: false,
    matchFound: null,
    scoresByPlayerId: initialScores
  });

  const updateGameState = useCallback((updater: (prev: GameState) => GameState) => {
    setGameState(updater);
  }, []);

  const resetGameState = useCallback(() => {
    console.log('🔄 useGameState: Resetting to initial state');
    
    // ✅ FIX: Clear persisted scores on reset
    persistedScoresRef.current = {};
    
    setGameState(prev => ({
      gameStarted: false,
      gameCompleted: false,
      gamePaused: false,
      timeLeft: initialTimeLeft,
      currentRound: 0,
      cards: [],
      players: prev.players,
      currentPlayerId: null,
      winner: null,
      showHighScoreModal: false,
      isNewHighScore: false,
      matchFound: null,
      scoresByPlayerId: Object.fromEntries(prev.players.map(p => [p.id, 0]))
    }));
  }, [initialTimeLeft]);

  const setCards = useCallback((cards: GameCard[]) => {
    console.log('🎴 useGameState: Setting cards:', cards.map(c => c.id));
    setGameState(prev => ({ ...prev, cards }));
  }, []);

  const setPlayers = useCallback((playersOrUpdater: Player[] | ((prev: Player[]) => Player[])) => {
    setGameState(prev => {
      const newPlayers =
        typeof playersOrUpdater === 'function'
          ? playersOrUpdater(prev.players)
          : playersOrUpdater;

      console.log('👥 useGameState: Setting players:', newPlayers.map(p => `${p.name}(${p.id})`));

      // ✅ FIX: Remap scores from placeholder IDs to real player IDs
      const remappedScores = remapScores(prev.scoresByPlayerId, newPlayers);
      
      // ✅ FIX: Also update the persisted scores ref
      persistedScoresRef.current = { ...remappedScores };

      return {
        ...prev,
        players: newPlayers,
        scoresByPlayerId: remappedScores
      };
    });
  }, []);

  const updatePlayerScore = useCallback((playerId: string, score: number) => {
    console.log('📊 useGameState: Updating player score:', playerId, '→', score);
    
    // ✅ FIX: Persist score to ref to survive re-renders
    persistedScoresRef.current[playerId] = score;
    console.log('📊 useGameState: Updated persistedScoresRef:', persistedScoresRef.current);
    
    setGameState(prev => {
      console.log('📊 useGameState: Current players array:', prev.players.map((p, idx) => `${idx}: ${p.name}(${p.id.slice(-8)})`));
      console.log('📊 useGameState: Player being updated:', playerId.slice(-8), 'is at index:', prev.players.findIndex(p => p.id === playerId));
      
      const newScores = {
        ...prev.scoresByPlayerId,
        [playerId]: score
      };
      console.log('📊 useGameState: New scoresByPlayerId:', newScores);
      return {
        ...prev,
        scoresByPlayerId: newScores
      };
    });
  }, []);

  const setMatchFound = useCallback((match: { playerId: string; iconId: string } | null) => {
    console.log('🎯 useGameState: Setting match found:', match);
    setGameState(prev => ({ ...prev, matchFound: match }));
  }, []);

  const setGameStarted = useCallback((started: boolean) => {
    console.log('🚀 useGameState: Setting game started:', started);
    setGameState(prev => ({ ...prev, gameStarted: started }));
  }, []);

  const setGamePaused = useCallback((paused: boolean) => {
    console.log('⏸️ useGameState: Setting game paused:', paused);
    setGameState(prev => ({ ...prev, gamePaused: paused }));
  }, []);

  const setGameCompleted = useCallback((completed: boolean) => {
    console.log('🏁 useGameState: Setting game completed:', completed);
    setGameState(prev => ({ ...prev, gameCompleted: completed }));
  }, []);

  const setTimeLeft = useCallback((time: number) => {
    setGameState(prev => ({ ...prev, timeLeft: time }));
  }, []);

  return {
    gameState,
    updateGameState,
    resetGameState,
    setCards,
    setPlayers,
    updatePlayerScore,
    setMatchFound,
    setGameStarted,
    setGamePaused,
    setGameCompleted,
    setTimeLeft
  };
}; 