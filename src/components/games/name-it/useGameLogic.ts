import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useHighScore } from '../../../hooks/useHighScore';
import { useAuth } from '../../../contexts/AuthContext';
import { GameState, GameConfig, Player, GameCard, GameIcon, PlayerAction } from './types';
import { DEFAULT_CONFIG, DEFAULT_ICONS, DIFFICULTY_SETTINGS } from './constants';
import { 
  generateDobbleCards, 
  selectGameCards, 
  checkIconMatch,
  calculateScore,
  formatTime
} from './gameLogic';
import { useWebRTC } from './useWebRTC';

interface UseGameLogicProps {
  initialConfig?: Partial<GameConfig>;
  playerName?: string;
  onGameComplete?: (score: number, timeElapsed: number) => void;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
  configId?: string;
}

interface UseGameLogicReturn {
  gameState: GameState;
  config: GameConfig;
  
  // Game controls
  startGame: () => void;
  resetGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  handleIconClick: (iconId: string, playerId: string) => void;
  
  // WebRTC controls
  enableMultiplayer: () => void;
  disableMultiplayer: () => void;
  createRoom: () => Promise<string>;
  joinRoom: (roomId: string) => Promise<void>;
  
  // High score integration
  highScores: any[];
  isNewHighScore: boolean;
  showHighScoreModal: boolean;
  setShowHighScoreModal: (show: boolean) => void;
  isSubmittingScore: boolean;
  
  // Game info
  timeLeft: number;
  formattedTimeLeft: string;
  currentPlayerScore: number;
  isGameActive: boolean;
  isMultiplayerEnabled: boolean;
  connectionStatus: string;
  roomId: string | null;
}

export const useGameLogic = ({
  initialConfig = {},
  playerName = 'Player',
  onGameComplete,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
  configId = 'default'
}: UseGameLogicProps): UseGameLogicReturn => {
  
  // ✅ CRITICAL FIX: Validate and fix iconSet IMMEDIATELY before any other logic
  const safeInitialConfig = useMemo(() => {
    const config = { ...initialConfig };
    
    // Immediate iconSet validation and fallback
    if (!config.iconSet || !Array.isArray(config.iconSet) || config.iconSet.length === 0) {
      console.warn('🚨 CRITICAL: IconSet is invalid/empty, applying DEFAULT_ICONS immediately:', {
        exists: !!config.iconSet,
        isArray: Array.isArray(config.iconSet),
        length: config.iconSet?.length || 0
      });
      config.iconSet = [...DEFAULT_ICONS];
    }
    
    console.log('✅ SAFE CONFIG: IconSet validated with', config.iconSet.length, 'icons');
    return config;
  }, [initialConfig]);
  
  // Track useGameLogic reinitializations
  const gameLogicInstanceId = useRef(Math.random().toString(36).substring(2, 8));
  const gameLogicInitCountRef = useRef(0);
  gameLogicInitCountRef.current += 1;
  
  console.log('🎮 useGameLogic instance ID:', gameLogicInstanceId.current, 'init count:', gameLogicInitCountRef.current);
  if (gameLogicInitCountRef.current > 1) {
    console.log('🚨 useGameLogic REINITIALIZED! Count:', gameLogicInitCountRef.current);
    console.trace();
  }
  
  // ✅ STABILITY GUARD: Early return cached result if core dependencies haven't changed
  const lastDepsRef = useRef<string | null>(null);
  const lastResultRef = useRef<UseGameLogicReturn | null>(null);
  
  const currentDepsKey = JSON.stringify({
    configId,
    playerName,
    initialConfigId: safeInitialConfig?.id,
    enableWebRTC: safeInitialConfig?.enableWebRTC,
    gameTime: safeInitialConfig?.gameTime
  });
  
  if (lastDepsRef.current === currentDepsKey && lastResultRef.current && gameLogicInitCountRef.current > 1) {
    // ✅ SAFETY: Validate cached result before returning it
    const cachedResult = lastResultRef.current;
    const isValidCachedResult = cachedResult.config && 
        cachedResult.gameState && 
        cachedResult.config.iconSet && 
        Array.isArray(cachedResult.config.iconSet) &&
        cachedResult.config.iconSet.length >= 57 && // Ensure we have the full DEFAULT_ICONS set
        typeof cachedResult.startGame === 'function' &&
        typeof cachedResult.handleIconClick === 'function';
        
    if (isValidCachedResult) {
      console.log('⚡ STABILITY GUARD: Deps unchanged and cached result valid, but continuing execution to maintain hook consistency');
    } else {
      console.warn('⚠️ STABILITY GUARD: Cached result is incomplete, regenerating:', {
        hasConfig: !!cachedResult.config,
        hasGameState: !!cachedResult.gameState,
        iconSetExists: !!cachedResult.config?.iconSet,
        iconSetIsArray: Array.isArray(cachedResult.config?.iconSet),
        iconSetLength: cachedResult.config?.iconSet?.length || 0,
        hasStartGame: typeof cachedResult.startGame === 'function',
        hasHandleIconClick: typeof cachedResult.handleIconClick === 'function'
      });
      // Clear invalid cached result and regenerate
      lastResultRef.current = null;
    }
  }
  
  // ✅ DEBUGGING: Track input props to see what's changing with detailed identity checks
  useEffect(() => {
    console.log('🧪 USEGAMELOGIC: Props changed - detailed analysis:', {
      safeInitialConfig,
      initialConfigId: safeInitialConfig?.id,
      iconSetLength: safeInitialConfig?.iconSet?.length || 0,
      playerName,
      configId,
      onGameComplete: !!onGameComplete,
      onHighScoreProcessStart: !!onHighScoreProcessStart,
      onHighScoreProcessComplete: !!onHighScoreProcessComplete,
      callbackIdentities: {
        onGameCompleteRef: onGameComplete?.toString().substring(0, 50),
        onHighScoreProcessStartRef: onHighScoreProcessStart?.toString().substring(0, 50),
        onHighScoreProcessCompleteRef: onHighScoreProcessComplete?.toString().substring(0, 50)
      }
    });
  }, [safeInitialConfig, playerName, configId, onGameComplete, onHighScoreProcessStart, onHighScoreProcessComplete]);
  
  // ✅ STABILITY FIX: Track hook stability
  useEffect(() => {
    console.log('🧠 useGameLogic useEffect ran - watching for instability');
  }, []);
  
  const { currentUser } = useAuth();
  
  // ✅ ENHANCED SAFETY: Robust config initialization with multiple fallbacks
  const configRef = useRef<GameConfig>();
  if (!configRef.current) {
    console.log('🔧 USEGAMELOGIC: Initial config setup with:', { 
      hasSafeInitialConfig: !!safeInitialConfig,
      safeInitialConfigIconSetLength: safeInitialConfig?.iconSet?.length || 0,
      defaultIconsLength: DEFAULT_ICONS.length
    });
    
    const mergedConfig = {
      ...DEFAULT_CONFIG,
      ...safeInitialConfig
    };
    
    // Apply difficulty settings to game time
    const difficulty = mergedConfig.difficulty || 'medium';
    const difficultySettings = DIFFICULTY_SETTINGS[difficulty];
    if (difficultySettings) {
      mergedConfig.gameTime = difficultySettings.gameTime;
      console.log('🎮 Applied difficulty settings:', difficulty, '→', difficultySettings.gameTime, 'seconds');
    }
    
    // ✅ IconSet should already be validated by safeInitialConfig, but double-check
    if (!mergedConfig.iconSet || mergedConfig.iconSet.length === 0) {
      console.error('🚨 CRITICAL: IconSet still empty after safeInitialConfig! Using DEFAULT_ICONS emergency fallback');
      mergedConfig.iconSet = [...DEFAULT_ICONS];
    }
    
    console.log('✅ CONFIG VALIDATED: IconSet has', mergedConfig.iconSet.length, 'icons');
    
    console.log('🎮 Initializing game config:');
    console.log('🔍 Final config gameTime:', mergedConfig.gameTime, 'seconds');
    console.log('🔍 Difficulty level:', mergedConfig.difficulty);
    console.log('🔍 IconSet length:', mergedConfig.iconSet?.length || 0);
    console.log('🔍 First 3 icons:', mergedConfig.iconSet.slice(0, 3).map(i => i.id));
    configRef.current = mergedConfig;
  }
  const config = configRef.current;

  // ✅ STABILITY FIX: Store stable initializePlayers function in useRef
  const initializePlayersRef = useRef<(forceAsPlayer2?: boolean) => Player[]>();
  if (!initializePlayersRef.current) {
    initializePlayersRef.current = (forceAsPlayer2 = false): Player[] => {
      const localPlayer: Player = {
        id: currentUser?.uid || 'local-player',
        name: playerName,
        score: 0,
        isLocal: true,
        connectionStatus: 'connected'
      };

      if (config.enableWebRTC) {
        const remotePlayer: Player = {
          id: 'remote-player',
          name: 'Opponent',
          score: 0,
          isLocal: false,
          connectionStatus: 'disconnected'
        };
        
        // ✅ FIXED: Ensure consistent player positioning based on role
        // players[0] = always Player 1 (host), players[1] = always Player 2 (joiner)
        return forceAsPlayer2
          ? [remotePlayer, localPlayer]  // Joiner: remote is Player 1, I'm Player 2
          : [localPlayer, remotePlayer]; // Host: I'm Player 1, remote is Player 2
      }

      return [localPlayer];
    };
  }
  const initializePlayers = initializePlayersRef.current;

  // Game state
  const [gameState, setGameState] = useState<GameState>({
    gameStarted: false,
    gameCompleted: false,
    gamePaused: false,
    timeLeft: config.gameTime,
    currentRound: 0,
    cards: [],
    players: initializePlayers(),
    currentPlayerId: null,
    winner: null,
    showHighScoreModal: false,
    isNewHighScore: false,
    matchFound: null
  });

  // Game timers
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const matchFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // High score integration
  const {
    highScores,
    isNewHighScore,
    showHighScoreModal,
    setShowHighScoreModal,
    saveHighScore,
    isSubmittingScore
  } = useHighScore({
    gameType: 'name-it',
    configId,
    scoringSystem: 'points-based',
    enableRateLimit: true,
    onHighScoreProcessStart,
    onHighScoreProcessComplete
  });

  // ✅ STABILITY FIX: Memoize gameState to prevent dependency loops
  const stableGameState = useMemo(() => {
    // Only recreate when meaningful properties change
    return {
      gameStarted: gameState.gameStarted,
      gameCompleted: gameState.gameCompleted,
      gamePaused: gameState.gamePaused,
      timeLeft: gameState.timeLeft,
      currentRound: gameState.currentRound,
      cards: gameState.cards,
      players: gameState.players,
      currentPlayerId: gameState.currentPlayerId,
      winner: gameState.winner,
      showHighScoreModal: gameState.showHighScoreModal,
      isNewHighScore: gameState.isNewHighScore,
      matchFound: gameState.matchFound
    };
  }, [
    gameState.gameStarted,
    gameState.gameCompleted, 
    gameState.gamePaused,
    gameState.timeLeft,
    gameState.currentRound,
    gameState.cards,
    gameState.players,
    gameState.currentPlayerId,
    gameState.winner,
    gameState.showHighScoreModal,
    gameState.isNewHighScore,
    gameState.matchFound
  ]);

  // ✅ STABILITY FIX: Memoize ALL callback functions to prevent WebRTC reinitializations
  const stableOnGameStateReceived = useCallback((partialState: Partial<GameState>) => {
    setGameState(prev => {
      // Smart merge: preserve local player identity and pause state
      const { gamePaused: remoteGamePaused, ...safePartialState } = partialState;
      const updatedState = { ...prev, ...safePartialState };
      
      // If players array is being synced, preserve local player identity
      if (partialState.players) {
        const currentLocalPlayerId = currentUser?.uid || 'local-player';
        const remotePlayersArray = partialState.players;
        
        // Find which player should be local based on current user (normalized comparison)
        const updatedPlayers = remotePlayersArray.map((player: Player, index: number) => {
          if (String(player.id) === String(currentLocalPlayerId)) {
            // This player matches our local ID - mark as local
            console.log('✅ Found matching player, marking as local:', player);
            return { ...player, isLocal: true };
          } else if (player.isLocal && String(player.id) !== String(currentLocalPlayerId)) {
            // This was the remote host's local player - mark as remote for us
            console.log('🔄 Converting remote host player to remote player:', player);
            return { 
              ...player, 
              isLocal: false,
              id: player.id // Keep their actual ID
            };
          } else {
            // Remote player - keep as is
            return { ...player, isLocal: false };
          }
        });
        
        // If we don't find our local player, add ourselves (normalized comparison)
        const hasLocalPlayer = updatedPlayers.some((p: Player) => String(p.id) === String(currentLocalPlayerId));
        if (!hasLocalPlayer) {
          console.log('⚠️ Local player not found in synced state, adding self');
          updatedPlayers.push({
            id: currentLocalPlayerId,
            name: playerName,
            score: 0,
            isLocal: true,
            connectionStatus: 'connected'
          });
        }
        
        console.log('🎮 Final players array:', updatedPlayers);
        updatedState.players = updatedPlayers;
      }
      
      return updatedState;
    });
  }, [currentUser?.uid, playerName]);

  const stableOnPlayerAction = useCallback((action: PlayerAction) => {
    // Forward to handlePlayerAction which will be defined later
    // This creates a stable reference while allowing handlePlayerAction to have its own dependencies
    handlePlayerActionRef.current?.(action);
  }, []);

  // Ref to hold the latest handlePlayerAction function
  const handlePlayerActionRef = useRef<((action: PlayerAction) => void) | null>(null);

  const stableOnConnectionLost = useCallback(() => {
    console.log('🔁 WebRTC connection lost, attempting to reconnect...');
    // Reset connection status for UI feedback
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(p => ({ 
        ...p, 
        connectionStatus: p.isLocal ? 'connected' : 'connecting' 
      }))
    }));
  }, []);

  // ✅ STABILITY FIX: Memoize WebRTC props object
  const webrtcProps = useMemo(() => {
    console.log('🔧 USEGAMELOGIC: Creating webrtcProps object (should be rare)');
    return {
      enabled: config.enableWebRTC,
      gameState: stableGameState,
      onGameStateReceived: stableOnGameStateReceived,
      onPlayerAction: stableOnPlayerAction,
      playerId: currentUser?.uid || 'local-player',
      onConnectionLost: stableOnConnectionLost
    };
  }, [config.enableWebRTC, stableGameState, stableOnGameStateReceived, stableOnPlayerAction, currentUser?.uid, stableOnConnectionLost]);

  // WebRTC integration with stable callbacks
  const webrtcReturn = useWebRTC(webrtcProps);

  // Destructure with debugging
  const {
    createRoom: webrtcCreateRoom,
    joinRoom: webrtcJoinRoom,
    sendPlayerAction,
    disconnect: webrtcDisconnect,
    isHost,
    connectionId,
    connectionStatus
  } = webrtcReturn;

  // Debug the WebRTC return values whenever they change
  useEffect(() => {
    console.log('🔍 useGameLogic received WebRTC values:', {
      isHost,
      connectionId,
      connectionStatus,
      sendPlayerActionExists: !!sendPlayerAction
    });
  }, [isHost, connectionId, connectionStatus, sendPlayerAction]);

  // Handle player actions from WebRTC
  const handlePlayerAction = useCallback((action: PlayerAction) => {
    console.log('🎮 Received remote player action:', action.type);
    
    // Get fresh WebRTC state from the return object instead of closure
    const currentIsHost = webrtcReturn.isHost;
    const currentConnectionStatus = webrtcReturn.connectionStatus;
    const currentConnectionId = webrtcReturn.connectionId;
    
    console.log('🔍 FRESH STATE CHECK: isHost =', currentIsHost, 'connectionStatus =', currentConnectionStatus, 'connectionId =', currentConnectionId);
    console.log('🔍 CLOSURE CHECK (old): isHost =', isHost, 'connectionStatus =', connectionStatus, 'connectionId =', connectionId);
    
    switch (action.type) {
      case 'icon_click':
        if (action.iconId && action.playerId) {
          console.log('🎯 Remote player clicked icon:', action.iconId, 'Player ID:', action.playerId);
          handleIconClick(action.iconId, action.playerId);
        }
        break;
      case 'start_game':
        console.log('🎮 Remote player started game');
        startGame(true); // Pass fromRemote = true to prevent infinite loop
        break;
      case 'reset_game':
        console.log('🔄 Remote player reset game');
        resetGame(true); // Pass fromRemote = true to prevent infinite loop
        break;
      case 'score_update':
        if (action.playerId && typeof action.score === 'number') {
          console.log('📊 Updating remote player score:', action.playerId, action.score);
          setGameState(prev => ({
            ...prev,
            players: prev.players.map(p => 
              // Map any remote player ID to our local "remote-player" entry
              !p.isLocal 
                ? { ...p, score: action.score as number }
                : p
            )
          }));
        }
        break;
      case 'new_cards':
        console.log('📥 RECEIVED new_cards action with cards:', action.cards?.length || 0);
        if (action.cards) {
          console.log('📥 CARD RESET: Player 2 received new cards from Player 1');
          console.log('🔄 Old cards:', gameState.cards.map(c => c.id));
          console.log('🆕 New cards:', action.cards.map(c => c.id));
          setGameState(prev => ({
            ...prev,
            cards: action.cards || prev.cards,
            matchFound: null
          }));
          console.log('✅ CARD RESET: Player 2 icons should now be updated');
        } else {
          console.log('❌ CARD RESET: No cards in new_cards action!');
        }
        break;
      case 'player_join':
        if (action.playerInfo) {
          console.log('🤝 Remote player joined:', action.playerInfo);
          setGameState(prev => ({
            ...prev,
            players: prev.players.map(p => 
              p.id === 'remote-player' 
                ? { 
                    ...p, 
                    id: action.playerInfo!.id,
                    name: action.playerInfo!.name,
                    connectionStatus: 'connected'
                  }
                : p
            )
          }));
          
          // Send our info back if we're the host
          if (isHost && sendPlayerAction) {
            console.log('📤 Sending local player info to remote player');
            sendPlayerAction({
              type: 'player_join',
              playerInfo: {
                id: currentUser?.uid || 'local-player',
                name: playerName
              },
              timestamp: Date.now()
            });
          }
        }
        break;
      case 'pause_game':
        console.log('⏸️ Remote player paused game');
        // Pause timer and set state directly
        if (gameTimerRef.current) {
          clearInterval(gameTimerRef.current);
          gameTimerRef.current = null;
        }
        setGameState(prev => ({ ...prev, gamePaused: true }));
        break;
      case 'resume_game':
        console.log('▶️ Remote player resumed game');
        // Resume timer and set state directly
        setGameState(prev => ({ ...prev, gamePaused: false }));
        gameTimerRef.current = setInterval(() => {
          setGameState(prev => {
            const newTimeLeft = prev.timeLeft - 1;
            if (newTimeLeft <= 0) {
              endGame();
              return { ...prev, timeLeft: 0 };
            }
            return { ...prev, timeLeft: newTimeLeft };
          });
        }, 1000);
        break;
      case 'match_found':
        console.log('🎯 Player 2 got a match! Host generating new cards...');
        console.log('🔍 USING FRESH STATE: isHost =', currentIsHost, 'typeof =', typeof currentIsHost);
        console.log('🔍 USING FRESH STATE: connectionStatus =', currentConnectionStatus, 'connectionId =', currentConnectionId);
        console.log('�� OLD CLOSURE STATE: isHost =', isHost, 'connectionStatus =', connectionStatus, 'connectionId =', connectionId);
        
        // Double-check by calling the webRTC functions directly
        console.log('🔍 CRITICAL: sendPlayerAction exists?', !!sendPlayerAction);
        console.log('🔍 CRITICAL: webrtcCreateRoom exists?', !!webrtcCreateRoom);
        
        if (currentIsHost) {
          // Generate new cards and send to Player 2
          const newCards = generateGameCards();
          setGameState(prev => ({
            ...prev,
            cards: newCards,
            matchFound: null
          }));
          
          // Send new cards to Player 2
          if (sendPlayerAction) {
            console.log('📤 HOST: Sending new cards to Player 2 after their match');
            console.log('🔍 Sending cards:', newCards.map(c => c.id));
            sendPlayerAction({
              type: 'new_cards',
              cards: newCards,
              timestamp: Date.now()
            });
          }
        } else {
          console.log('❌ CRITICAL: Player 1 thinks they are NOT the host! Cannot generate cards.');
          console.log('🔍 FRESH connectionStatus:', currentConnectionStatus, 'connectionId:', currentConnectionId);
          console.log('🔍 OLD connectionStatus:', connectionStatus, 'connectionId:', connectionId);
        }
        break;
    }
  }, [webrtcReturn, isHost, sendPlayerAction, currentUser?.uid, playerName, connectionStatus, connectionId, setGameState]);

  // ✅ STABILITY FIX: Store handlePlayerAction in ref for stable callback access
  useEffect(() => {
    handlePlayerActionRef.current = handlePlayerAction;
  }, [handlePlayerAction]);

  // Generate cards for game
  // Stable icons reference to prevent constant regeneration
  const stableIconsRef = useRef(config.iconSet && config.iconSet.length > 0 ? config.iconSet : DEFAULT_ICONS);

  const generateGameCards = useCallback(() => {
    const iconsToUse = stableIconsRef.current;
    
    try {
      const allCards = generateDobbleCards(iconsToUse);
      const selectedCards = selectGameCards(allCards);
      
      return [
        selectedCards.centerCard,
        selectedCards.player1Card,
        selectedCards.player2Card
      ];
    } catch (error) {
      console.error('❌ Error generating cards:', error);
      return [];
    }
  }, []); // No dependencies - stable function

  // Start game
  const startGame = useCallback((fromRemote = false) => {
    console.log('🎮 GAME LOGIC: startGame called, fromRemote:', fromRemote);
    const cards = generateGameCards();
    
    setGameState(prev => ({
      ...prev,
      gameStarted: true,
      gameCompleted: false,
      gamePaused: false,
      timeLeft: config.gameTime,
      currentRound: prev.currentRound + 1,
      cards,
      currentPlayerId: prev.players[0]?.id || null,
      winner: null,
      matchFound: null,
      players: prev.players.map(p => ({ ...p, score: 0 }))
    }));

    // Start game timer
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    
    gameTimerRef.current = setInterval(() => {
      setGameState(prev => {
        const newTimeLeft = prev.timeLeft - 1;
        
        if (newTimeLeft <= 0) {
          // Time's up!
          endGame();
          return { ...prev, timeLeft: 0 };
        }
        
        return { ...prev, timeLeft: newTimeLeft };
      });
    }, 1000);

    // Only send action to remote player if this is a LOCAL start (not from remote)
    if (config.enableWebRTC && !fromRemote) {
      console.log('📤 Sending start_game action to remote player');
      sendPlayerAction({
        type: 'start_game',
        timestamp: Date.now()
      });
    }
  }, [config.gameTime, config.enableWebRTC, generateGameCards, sendPlayerAction]);

  // Reset game
  const resetGame = useCallback((fromRemote = false) => {
    console.log(`🔄 Resetting game - fromRemote: ${fromRemote}`);
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    
    if (matchFeedbackTimerRef.current) {
      clearTimeout(matchFeedbackTimerRef.current);
      matchFeedbackTimerRef.current = null;
    }

    setGameState(prev => ({
      ...prev,
      gameStarted: false,
      gameCompleted: false,
      gamePaused: false,
      timeLeft: config.gameTime,
      currentRound: 0,
      cards: [],
      currentPlayerId: null,
      winner: null,
      matchFound: null,
      players: initializePlayers()
    }));

    // Only send action to remote player if this is a LOCAL reset (not from remote)
    if (config.enableWebRTC && !fromRemote) {
      console.log('📤 Sending reset_game action to remote player');
      sendPlayerAction({
        type: 'reset_game',
        timestamp: Date.now()
      });
    }
  }, [config.gameTime, config.enableWebRTC, initializePlayers, sendPlayerAction]);

  // Pause game
  const pauseGame = useCallback((fromRemote = false) => {
    console.log('⏸️ GAME LOGIC: pauseGame called');
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    
    setGameState(prev => ({ ...prev, gamePaused: true }));
    
    // Send pause action to remote player
    if (config.enableWebRTC && !fromRemote && sendPlayerAction) {
      console.log('📤 Sending pause_game action to remote player');
      sendPlayerAction({
        type: 'pause_game',
        timestamp: Date.now()
      });
    }
  }, [config.enableWebRTC, sendPlayerAction]);

  // Resume game
  const resumeGame = useCallback((fromRemote = false) => {
    console.log('▶️ GAME LOGIC: resumeGame called');
    setGameState(prev => ({ ...prev, gamePaused: false }));
    
    // Send resume action to remote player
    if (config.enableWebRTC && !fromRemote && sendPlayerAction) {
      console.log('📤 Sending resume_game action to remote player');
      sendPlayerAction({
        type: 'resume_game',
        timestamp: Date.now()
      });
    }
    
    // ✅ STABILITY FIX: Guard against duplicate timers
    if (!gameTimerRef.current) {
      gameTimerRef.current = setInterval(() => {
      setGameState(prev => {
        const newTimeLeft = prev.timeLeft - 1;
        
        if (newTimeLeft <= 0) {
          endGame();
          return { ...prev, timeLeft: 0 };
        }
        
        return { ...prev, timeLeft: newTimeLeft };
      });
    }, 1000);
    }
  }, [config.enableWebRTC, sendPlayerAction]);

  // Handle icon click
  const handleIconClick = useCallback((iconId: string, playerId: string) => {
    if (!gameState.gameStarted || gameState.gameCompleted || gameState.gamePaused) {
      return;
    }

    const player = gameState.players.find(p => p.id === playerId);
    const centerCard = gameState.cards.find(c => c.position === 'center');
    const clickedCard = gameState.cards.find(c => 
      c.position === (playerId === gameState.players[0]?.id ? 'player1' : 'player2')
    );

    if (!player || !centerCard || !clickedCard) {
      return;
    }

    // Find the clicked icon
    const clickedIcon = clickedCard.icons.find(icon => icon.id === iconId);
    if (!clickedIcon) {
      return;
    }

    // Check if it's a valid match
    const isMatch = checkIconMatch(clickedIcon, centerCard);
    
    if (isMatch) {
      // Correct match!
      const newScore = (player.score || 0) + 1;
      console.log(`🎯 Player ${playerId} scored! New score: ${newScore}`);
      
      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p => 
          p.id === playerId 
            ? { ...p, score: newScore as number }
            : p
        ),
        matchFound: { playerId, iconId }
      }));

      // Send score update to remote player if multiplayer
      if (config.enableWebRTC && player.isLocal) {
        console.log(`📤 Sending score update to remote player: ${newScore}`);
        sendPlayerAction({
          type: 'score_update',
          playerId,
          score: newScore,
          timestamp: Date.now()
        });
      }

      // Show match feedback briefly, then generate new cards
      if (matchFeedbackTimerRef.current) {
        clearTimeout(matchFeedbackTimerRef.current);
      }
      
      matchFeedbackTimerRef.current = setTimeout(() => {
        // Only the host generates new cards in multiplayer to ensure sync
        if (!config.enableWebRTC || isHost) {
          console.log('🔄 CARD RESET: Host generating new cards');
          const newCards = generateGameCards();
          console.log('🔍 Generated cards for Player 1 match:', newCards.map(c => c.id));
          setGameState(prev => ({
            ...prev,
            cards: newCards,
            matchFound: null
          }));

          // Send new cards to remote player if multiplayer
          if (config.enableWebRTC && sendPlayerAction) {
            console.log('📤 CARD RESET: Sending new cards to Player 2');
            console.log('🔍 Sending cards to Player 2:', newCards.map(c => c.id));
            sendPlayerAction({
              type: 'new_cards',
              cards: newCards,
              timestamp: Date.now()
            });
          }
        } else {
          // Non-host just clears match feedback, will receive cards from host
          console.log('⏳ CARD RESET: Player 2 waiting for new cards from Player 1');
          setGameState(prev => ({
            ...prev,
            matchFound: null
          }));
        }
      }, 1000);

    } else {
      // Wrong match - could add penalty logic here
      console.log('❌ Wrong match!');
    }

    // If this is a match and we're Player 2, tell Player 1 to generate new cards
    if (isMatch && config.enableWebRTC && player.isLocal && !isHost && sendPlayerAction) {
      console.log('📤 Player 2 telling Player 1: I got a match, generate new cards!');
      sendPlayerAction({
        type: 'match_found',
        playerId,
        timestamp: Date.now()
      });
    }
  }, [gameState.gameStarted, gameState.gameCompleted, gameState.gamePaused, gameState.players, gameState.cards, config.enableWebRTC, isHost, generateGameCards, sendPlayerAction]);

  // End game
  const endGame = useCallback(() => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }

    const localPlayer = gameState.players.find(p => p.isLocal);
    const winner = gameState.players.reduce((prev, current) => 
      current.score > prev.score ? current : prev
    );

    const timeElapsed = config.gameTime - gameState.timeLeft;
    const finalScore = localPlayer ? calculateScore(
      localPlayer.score,
      0, // We're not tracking mistakes yet
      timeElapsed,
      config.difficulty
    ) : 0;

    setGameState(prev => ({
      ...prev,
      gameCompleted: true,
      winner
    }));

    // Save high score and show modal
    if (localPlayer) {
      saveHighScore(finalScore, localPlayer.name);
      setShowHighScoreModal(true);
    }

    // Call completion callback
    if (onGameComplete) {
      onGameComplete(finalScore, timeElapsed);
    }
  }, [gameState.players, gameState.timeLeft, config.gameTime, config.difficulty, saveHighScore, setShowHighScoreModal, onGameComplete]);

  // WebRTC controls
  const enableMultiplayer = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      players: initializePlayers()
    }));
  }, [initializePlayers]);

  const disableMultiplayer = useCallback(() => {
    webrtcDisconnect();
    setGameState(prev => ({
      ...prev,
      players: prev.players.filter(p => p.isLocal)
    }));
  }, [webrtcDisconnect]);

  const createRoom = useCallback(async (): Promise<string> => {
    console.log('🏠 CREATING ROOM in useGameLogic...');
    const roomId = await webrtcCreateRoom();
    console.log('🏠 ROOM CREATED in useGameLogic:', roomId);
    return roomId;
  }, [webrtcCreateRoom]);

  const joinRoom = useCallback(async (roomId: string): Promise<void> => {
    await webrtcJoinRoom(roomId);
    
    // Send our player info to the host for identity exchange
    console.log('🤝 Sending player join info to host');
    sendPlayerAction({
      type: 'player_join',
      playerInfo: {
        id: currentUser?.uid || 'local-player',
        name: playerName
      },
      timestamp: Date.now()
    });
    
    // ✅ FIXED: Initialize as Player 2 with correct positioning
    setGameState(prev => ({
      ...prev,
      players: initializePlayers(true) // Force this joiner as Player 2
    }));
  }, [webrtcJoinRoom, sendPlayerAction, currentUser?.uid, playerName, initializePlayers]);

  // Update ALL players' connection status based on WebRTC status
  useEffect(() => {
    if (config.enableWebRTC) {
      console.log(`🔄 WebRTC connection status changed: ${connectionStatus}`);
      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p => {
          // Local player is always connected (they're the current user)
          if (p.isLocal) {
            return { ...p, connectionStatus: 'connected' };
          }
          // Remote players use WebRTC connection status
          return { 
            ...p, 
            connectionStatus: connectionStatus === 'connected' ? 'connected' : 'disconnected' 
          };
        })
      }));
    }
  }, [config.enableWebRTC, connectionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
      if (matchFeedbackTimerRef.current) {
        clearTimeout(matchFeedbackTimerRef.current);
      }
    };
  }, []);

  // Derived values
  const currentPlayerScore = gameState.players.find(p => p.isLocal)?.score || 0;
  const isGameActive = gameState.gameStarted && !gameState.gameCompleted && !gameState.gamePaused;
  const isMultiplayerEnabled = config.enableWebRTC;
  const formattedTimeLeft = formatTime(gameState.timeLeft);

  // ✅ CRITICAL: Validate result object before returning to catch React Error #300
  try {
    const result: UseGameLogicReturn = {
      gameState,
      config,
      
      // Game controls
      startGame: () => startGame(false),
      resetGame: () => resetGame(false), 
      pauseGame: () => pauseGame(false),
      resumeGame: () => resumeGame(false),
      handleIconClick,
      
      // WebRTC controls
      enableMultiplayer,
      disableMultiplayer,
      createRoom,
      joinRoom,
      
      // High score integration
      highScores,
      isNewHighScore,
      showHighScoreModal,
      setShowHighScoreModal,
      isSubmittingScore,
      
      // Game info
      timeLeft: gameState.timeLeft,
      formattedTimeLeft,
      currentPlayerScore,
      isGameActive,
      isMultiplayerEnabled,
      connectionStatus,
      roomId: connectionId
    };
    
    // Validate critical properties
    console.log('🔍 USEGAMELOGIC RESULT VALIDATION:', {
      hasGameState: !!result.gameState,
      hasConfig: !!result.config,
      gameStateType: typeof result.gameState,
      configType: typeof result.config,
      timeLeft: result.timeLeft,
      timeLeftType: typeof result.timeLeft,
      formattedTimeLeft: result.formattedTimeLeft,
      formattedTimeLeftType: typeof result.formattedTimeLeft,
      currentPlayerScore: result.currentPlayerScore,
      currentPlayerScoreType: typeof result.currentPlayerScore,
      isGameActive: result.isGameActive,
      isGameActiveType: typeof result.isGameActive,
      connectionStatus: result.connectionStatus,
      connectionStatusType: typeof result.connectionStatus,
      handleIconClickType: typeof result.handleIconClick,
      startGameType: typeof result.startGame
    });
    
    // Check for undefined critical values
    const criticalUndefinedValues = Object.entries({
      gameState: result.gameState,
      config: result.config,
      handleIconClick: result.handleIconClick,
      startGame: result.startGame,
      timeLeft: result.timeLeft,
      formattedTimeLeft: result.formattedTimeLeft,
      isGameActive: result.isGameActive,
      connectionStatus: result.connectionStatus
    }).filter(([key, value]) => value === undefined || value === null);
    
    if (criticalUndefinedValues.length > 0) {
      console.error('🚨 CRITICAL: useGameLogic returning undefined values:', criticalUndefinedValues);
    }

    // ✅ STABILITY GUARD: Cache result for future early returns
    lastDepsRef.current = currentDepsKey;
    lastResultRef.current = result;

    return result;
    
  } catch (hookError) {
    const error = hookError instanceof Error ? hookError : new Error(String(hookError));
    console.error('🚨 CRITICAL: useGameLogic crashed during execution:', error);
    console.error('🔍 HOOK CRASH CONTEXT:', {
      hasGameState: !!gameState,
      hasConfig: !!config,
      gameStateType: typeof gameState,
      configType: typeof config,
      stack: error.stack
    });
    
    // Return safe fallback result to prevent complete crash
    return {
      gameState: gameState || {
        gameStarted: false,
        gameCompleted: false,
        gamePaused: false,
        timeLeft: 0,
        currentRound: 0,
        cards: [],
        players: [],
        currentPlayerId: null,
        winner: null,
        showHighScoreModal: false,
        isNewHighScore: false,
        matchFound: null
      },
      config: config || DEFAULT_CONFIG,
      startGame: () => console.warn('Game crashed - startGame disabled'),
      resetGame: () => console.warn('Game crashed - resetGame disabled'),
      pauseGame: () => console.warn('Game crashed - pauseGame disabled'),
      resumeGame: () => console.warn('Game crashed - resumeGame disabled'),
      handleIconClick: () => console.warn('Game crashed - handleIconClick disabled'),
      enableMultiplayer: () => console.warn('Game crashed - enableMultiplayer disabled'),
      disableMultiplayer: () => console.warn('Game crashed - disableMultiplayer disabled'),
      createRoom: async () => { console.warn('Game crashed - createRoom disabled'); return ''; },
      joinRoom: async () => console.warn('Game crashed - joinRoom disabled'),
      highScores: [],
      isNewHighScore: false,
      showHighScoreModal: false,
      setShowHighScoreModal: () => console.warn('Game crashed - setShowHighScoreModal disabled'),
      isSubmittingScore: false,
      timeLeft: 0,
      formattedTimeLeft: '00:00',
      currentPlayerScore: 0,
      isGameActive: false,
      isMultiplayerEnabled: false,
      connectionStatus: 'disconnected',
      roomId: null
    };
  }
}; 