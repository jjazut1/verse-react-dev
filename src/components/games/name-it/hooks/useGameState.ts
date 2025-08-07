import { useState, useCallback } from 'react';
import { GameState, Player, GameCard } from '../types';

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
  setGameCompleted: (completed: boolean) => void;
  setTimeLeft: (time: number) => void;
}

export const useGameState = ({ 
  initialTimeLeft, 
  initialPlayers 
}: UseGameStateProps): UseGameStateReturn => {
  console.log('🎮 useGameState: Initializing with timeLeft:', initialTimeLeft, 'players:', initialPlayers.length);

  const initialScores = initialPlayers.reduce<Record<string, number>>((acc, player) => {
    acc[player.id] = 0;
    return acc;
  }, {});

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

      // ✅ FIX: Ensure all players have entries in scoresByPlayerId
      const updatedScores = { ...prev.scoresByPlayerId };
      for (const player of newPlayers) {
        if (!(player.id in updatedScores)) {
          updatedScores[player.id] = 0;
          console.log('📊 useGameState: Adding new player to scores:', player.id);
        }
      }

      return {
        ...prev,
        players: newPlayers,
        scoresByPlayerId: updatedScores
      };
    });
  }, []);

  const updatePlayerScore = useCallback((playerId: string, score: number) => {
    console.log('📊 useGameState: Updating player score:', playerId, '→', score);
    setGameState(prev => ({
      ...prev,
      scoresByPlayerId: {
        ...prev.scoresByPlayerId,
        [playerId]: score
      }
    }));
  }, []);

  const setMatchFound = useCallback((match: { playerId: string; iconId: string } | null) => {
    console.log('🎯 useGameState: Setting match found:', match);
    setGameState(prev => ({ ...prev, matchFound: match }));
  }, []);

  const setGameStarted = useCallback((started: boolean) => {
    console.log('🚀 useGameState: Setting game started:', started);
    setGameState(prev => ({ ...prev, gameStarted: started }));
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
    setGameCompleted,
    setTimeLeft
  };
}; 