import React, { useMemo, useCallback, useEffect } from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';
import { PWAGameHeader } from '../PWAGameHeader';
import { HighScoreModal } from '../../common/HighScoreModal';
import { useAuth } from '../../../contexts/AuthContext';
import { NameItProps } from './types';
import { useGameLogic } from './useGameLogic';
import { GameArea } from './GameArea';
import { GameControls } from './GameControls';

// ✅ STABILITY FIX: Stable default config object to prevent recreations
const DEFAULT_GAME_CONFIG = {};

// ✅ DIAGNOSTIC: Add custom comparison to React.memo to debug
const NameItComponent: React.FC<NameItProps> = ({
  gameConfig = DEFAULT_GAME_CONFIG,
  onGameComplete,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
  onGameExit,
  configId = 'default',
  playerName = 'Player',
  enableWebRTC = false
}) => {
  console.log('🚀 NAMEIT COMPONENT: Rendering started with props:', {
    configId,
    playerName,
    enableWebRTC,
    hasGameConfig: !!gameConfig,
    hasCallbacks: {
      onGameComplete: !!onGameComplete,
      onHighScoreProcessStart: !!onHighScoreProcessStart,
      onHighScoreProcessComplete: !!onHighScoreProcessComplete,
      onGameExit: !!onGameExit
    }
  });

  const auth = useAuth();
  // ✅ STABILITY FIX: Memoize currentUser to prevent constant changes
  const currentUser = useMemo(() => auth.currentUser, [auth.currentUser?.uid]);
  
  // ✅ COMPONENT LIFECYCLE: Track mounting/unmounting
  useEffect(() => {
    console.log('🎬 NAMEIT COMPONENT: MOUNTED at', new Date().toISOString());
    console.log('🔍 NAMEIT COMPONENT: Mount user ID:', currentUser?.uid);
    console.log('🔍 NAMEIT COMPONENT: Mount stack trace:');
    console.trace();
    return () => {
      console.log('💀 NAMEIT COMPONENT: UNMOUNTING!!! at', new Date().toISOString());
      console.log('🔍 NAMEIT COMPONENT: Unmount user ID was:', currentUser?.uid);
      console.log('🔍 NAMEIT COMPONENT: Unmount stack trace:');
      console.trace();
    };
  }, []);
  
  // ✅ STABILITY FIX: Component-level debugging
  useEffect(() => {
    console.log('🔄 NAMEIT: Component re-rendered, props:', {
      gameConfig,
      enableWebRTC,
      playerName,
      configId,
      currentUser: currentUser?.uid
    });
    console.log('🔍 NAMEIT: Stack trace to see what triggered render:');
    console.trace();
  }, [gameConfig, enableWebRTC, playerName, configId, currentUser]);
  
  // ✅ STABILITY FIX: Better memoization (avoid JSON.stringify)
  const memoizedConfig = useMemo(() => {
    const config = { ...gameConfig, enableWebRTC };
    console.log('🔧 NAMEIT: Creating memoized config (this should happen rarely):', config);
    return config;
  }, [gameConfig, enableWebRTC]);
  
  // ✅ STABILITY FIX: Memoize all callbacks as a stable object
  const stableCallbacks = useMemo(() => ({
    onGameComplete: onGameComplete ? (score: number, timeElapsed: number) => {
      onGameComplete(score, timeElapsed);
    } : undefined,
    onHighScoreProcessStart: onHighScoreProcessStart ? () => {
      onHighScoreProcessStart();
    } : undefined,
    onHighScoreProcessComplete: onHighScoreProcessComplete ? () => {
      onHighScoreProcessComplete();
    } : undefined
  }), [onGameComplete, onHighScoreProcessStart, onHighScoreProcessComplete]);
  
  // ✅ STABILITY FIX: Memoize the entire props object for useGameLogic
  const gameLogicProps = useMemo(() => {
    console.log('🔧 NAMEIT: Creating gameLogicProps object (should be rare)');
    return {
      initialConfig: memoizedConfig,
      playerName,
      configId,
      onGameComplete: stableCallbacks.onGameComplete,
      onHighScoreProcessStart: stableCallbacks.onHighScoreProcessStart,
      onHighScoreProcessComplete: stableCallbacks.onHighScoreProcessComplete
    };
  }, [memoizedConfig, playerName, configId, stableCallbacks]);

  // ✅ DEBUGGING: Track when gameLogicProps changes (should be very rare)
  useEffect(() => {
    console.log('🧪 NAMEIT: gameLogicProps object changed (this should be RARE):', {
      configHasId: !!(memoizedConfig && 'id' in memoizedConfig),
      playerName,
      configId,
      callbacksPresent: {
        onGameComplete: !!stableCallbacks.onGameComplete,
        onHighScoreProcessStart: !!stableCallbacks.onHighScoreProcessStart,
        onHighScoreProcessComplete: !!stableCallbacks.onHighScoreProcessComplete
      }
    });
  }, [gameLogicProps]);
  
  // ✅ CRITICAL FIX: Call useGameLogic hook ALWAYS (no conditional returns before this)
  const gameLogic = useGameLogic(gameLogicProps);

  // ✅ SAFETY: After ALL hooks are called, now we can do conditional rendering
  console.log('🔍 NAMEIT: Post-hook validation - gameLogic exists:', !!gameLogic);
  
  if (!gameLogic) {
    console.warn('⚠️ NAMEIT: gameLogic is null/undefined, showing fallback');
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" padding={4}>
        <Text fontSize="xl" color="orange.500" marginBottom={4}>
          🔧 Game Logic Loading...
        </Text>
        <Text fontSize="md" color="gray.600" textAlign="center">
          The game is initializing. If this persists, please refresh the page.
        </Text>
      </Box>
    );
  }
  
  if (!gameLogic.gameState) {
    console.warn('⚠️ NAMEIT: gameLogic.gameState is missing, showing fallback');
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" padding={4}>
        <Text fontSize="xl" color="orange.500" marginBottom={4}>
          🔧 Game State Loading...
        </Text>
        <Text fontSize="md" color="gray.600" textAlign="center">
          The game state is initializing. If this persists, please refresh the page.
        </Text>
      </Box>
    );
  }
  
  // ✅ SAFETY: Check if config exists and has iconSet
  if (!gameLogic.config) {
    console.warn('⚠️ NAMEIT: gameLogic.config is missing, showing fallback');
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" padding={4}>
        <Text fontSize="xl" color="orange.500" marginBottom={4}>
          🔧 Game Configuration Loading...
        </Text>
        <Text fontSize="md" color="gray.600" textAlign="center">
          The game configuration is loading. If this persists, please refresh the page.
        </Text>
      </Box>
    );
  }
  
  if (!gameLogic.config.iconSet || gameLogic.config.iconSet.length === 0) {
    console.warn('⚠️ NAMEIT: gameLogic.config.iconSet is empty or missing, showing fallback');
    console.warn('Debug config:', gameLogic.config);
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" padding={4}>
        <Text fontSize="xl" color="orange.500" marginBottom={4}>
          🔧 Game Icons Loading...
        </Text>
        <Text fontSize="md" color="gray.600" textAlign="center" marginBottom={4}>
          The game icons are loading. This might take a moment.
        </Text>
        <Text fontSize="sm" color="gray.500" textAlign="center">
          Icons available: {gameLogic.config.iconSet?.length || 0}
        </Text>
      </Box>
    );
  }
  
  // ✅ SAFETY: Check for required methods and properties
  if (typeof gameLogic.handleIconClick !== 'function' ||
      typeof gameLogic.startGame !== 'function' ||
      typeof gameLogic.resetGame !== 'function' ||
      typeof gameLogic.pauseGame !== 'function' ||
      typeof gameLogic.resumeGame !== 'function' ||
      typeof gameLogic.enableMultiplayer !== 'function' ||
      typeof gameLogic.disableMultiplayer !== 'function' ||
      typeof gameLogic.createRoom !== 'function' ||
      typeof gameLogic.joinRoom !== 'function' ||
      typeof gameLogic.setShowHighScoreModal !== 'function') {
    console.warn('⚠️ NAMEIT: Missing required methods, showing fallback');
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" padding={4}>
        <Text fontSize="xl" color="red.500" marginBottom={4}>
          🚨 Game Methods Missing
        </Text>
        <Text fontSize="md" color="gray.600" textAlign="center">
          Essential game functions are not available. Please refresh the page.
        </Text>
      </Box>
    );
  }
  
  // ✅ SAFETY: Check for required properties 
  if (typeof gameLogic.timeLeft !== 'number' || 
      typeof gameLogic.formattedTimeLeft !== 'string' ||
      typeof gameLogic.isGameActive !== 'boolean' ||
      typeof gameLogic.isMultiplayerEnabled !== 'boolean' ||
      typeof gameLogic.connectionStatus !== 'string' ||
      typeof gameLogic.currentPlayerScore !== 'number') {
    console.warn('⚠️ NAMEIT: gameLogic has invalid property types, showing fallback');
    console.warn('Debug info:', {
      timeLeft: typeof gameLogic.timeLeft,
      formattedTimeLeft: typeof gameLogic.formattedTimeLeft,
      isGameActive: typeof gameLogic.isGameActive,
      isMultiplayerEnabled: typeof gameLogic.isMultiplayerEnabled,
      connectionStatus: typeof gameLogic.connectionStatus,
      currentPlayerScore: typeof gameLogic.currentPlayerScore
    });
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" padding={4}>
        <Text fontSize="xl" color="red.500" marginBottom={4}>
          🚨 Game Properties Invalid
        </Text>
        <Text fontSize="md" color="gray.600" textAlign="center" marginBottom={4}>
          Game data types are incorrect. Please refresh the page.
        </Text>
        <Text fontSize="sm" color="gray.500" textAlign="center">
          Check console for detailed type information.
        </Text>
      </Box>
    );
  }
  
  // ✅ ENHANCED SAFETY: Check JSX-specific properties that could cause React Error #300
  if (!gameLogic.gameState.cards || !Array.isArray(gameLogic.gameState.cards)) {
    console.warn('⚠️ NAMEIT: gameState.cards is invalid:', {
      exists: !!gameLogic.gameState.cards,
      isArray: Array.isArray(gameLogic.gameState.cards),
      cardsType: typeof gameLogic.gameState.cards
    });
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" padding={4}>
        <Text fontSize="xl" color="red.500" marginBottom={4}>
          🚨 Game Cards Invalid
        </Text>
        <Text fontSize="md" color="gray.600" textAlign="center">
          Game card data is malformed. Please refresh the page.
        </Text>
      </Box>
    );
  }
  
  if (!gameLogic.gameState.players || !Array.isArray(gameLogic.gameState.players)) {
    console.warn('⚠️ NAMEIT: gameState.players is invalid:', {
      exists: !!gameLogic.gameState.players,
      isArray: Array.isArray(gameLogic.gameState.players),
      playersType: typeof gameLogic.gameState.players
    });
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" padding={4}>
        <Text fontSize="xl" color="red.500" marginBottom={4}>
          🚨 Game Players Invalid
        </Text>
        <Text fontSize="md" color="gray.600" textAlign="center">
          Player data is malformed. Please refresh the page.
        </Text>
      </Box>
    );
  }
  
  // ✅ SAFETY: Check critical JSX properties explicitly
  if (gameLogic.showHighScoreModal === undefined || gameLogic.currentPlayerScore === undefined ||
      gameLogic.isNewHighScore === undefined || gameLogic.highScores === undefined ||
      gameLogic.roomId === undefined || gameLogic.isSubmittingScore === undefined) {
    console.warn('⚠️ NAMEIT: Critical JSX properties are undefined:', {
      showHighScoreModal: typeof gameLogic.showHighScoreModal,
      currentPlayerScore: typeof gameLogic.currentPlayerScore,
      isNewHighScore: typeof gameLogic.isNewHighScore,
      highScores: typeof gameLogic.highScores,
      roomId: typeof gameLogic.roomId,
      isSubmittingScore: typeof gameLogic.isSubmittingScore
    });
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" padding={4}>
        <Text fontSize="xl" color="red.500" marginBottom={4}>
          🚨 Game Properties Undefined
        </Text>
        <Text fontSize="md" color="gray.600" textAlign="center" marginBottom={4}>
          Critical game properties are missing. Please refresh the page.
        </Text>
        <Text fontSize="sm" color="gray.500" textAlign="center">
          Check console for detailed property information.
        </Text>
      </Box>
    );
  }

  const localPlayerId = currentUser?.uid || 'local-player';

  // ✅ CRITICAL: Try/catch boundary to catch React Error #300 rendering crashes
  try {
    console.log('🔍 RENDER ATTEMPT: Starting NameIt JSX render with:', {
      hasGameLogic: !!gameLogic,
      hasGameState: !!gameLogic?.gameState,
      hasConfig: !!gameLogic?.config,
      localPlayerId,
      gameLogicKeys: gameLogic ? Object.keys(gameLogic) : []
    });

    // ✅ CRITICAL: Validate all JSX properties to catch React Error #300 causes
    const jsxValidation = {
      gameState: gameLogic.gameState,
      gameStateType: typeof gameLogic.gameState,
      gameStateCards: gameLogic.gameState?.cards,
      gameStateCardsLength: gameLogic.gameState?.cards?.length,
      gameStateCardsIsArray: Array.isArray(gameLogic.gameState?.cards),
      
      onIconClick: gameLogic.handleIconClick,
      onIconClickType: typeof gameLogic.handleIconClick,
      
      localPlayerId,
      localPlayerIdType: typeof localPlayerId,
      
      timeLeft: gameLogic.timeLeft,
      timeLeftType: typeof gameLogic.timeLeft,
      
      formattedTimeLeft: gameLogic.formattedTimeLeft,
      formattedTimeLeftType: typeof gameLogic.formattedTimeLeft,
      
      isGameActive: gameLogic.isGameActive,
      isGameActiveType: typeof gameLogic.isGameActive,
      
      showHighScoreModal: gameLogic.showHighScoreModal,
      showHighScoreModalType: typeof gameLogic.showHighScoreModal,
      
      highScores: gameLogic.highScores,
      highScoresType: typeof gameLogic.highScores,
      highScoresIsArray: Array.isArray(gameLogic.highScores)
    };
    
    console.log('🔍 JSX VALIDATION:', jsxValidation);
    
    // Check for undefined values that could crash render
    const problematicValues = Object.entries(jsxValidation).filter(([key, value]) => 
      value === undefined || value === null
    );
    
    if (problematicValues.length > 0) {
      console.error('🚨 POTENTIAL CRASH: Found undefined/null values for JSX:', problematicValues);
    }

    return (
      <Box width="100vw" maxWidth="100%" overflow="hidden" height="auto" minHeight="100vh">
      {/* Game Header */}
      <PWAGameHeader 
        gameTitle="Name It" 
        variant="compact"
        showBackButton={true}
        onBack={onGameExit}
      />
      
      {/* Game Content */}
      <VStack spacing={6} padding={4} paddingTop={2}>
        {/* Game Area */}
        <GameArea
          gameState={gameLogic.gameState}
          onIconClick={gameLogic.handleIconClick}
          localPlayerId={localPlayerId}
          timeLeft={gameLogic.timeLeft}
          formattedTime={gameLogic.formattedTimeLeft}
          isGameActive={gameLogic.isGameActive}
        />

        {/* Game Controls */}
        <GameControls
          gameState={gameLogic.gameState}
          isGameActive={gameLogic.isGameActive}
          isMultiplayerEnabled={gameLogic.isMultiplayerEnabled}
          connectionStatus={gameLogic.connectionStatus}
          roomId={gameLogic.roomId}
          onStartGame={gameLogic.startGame}
          onResetGame={gameLogic.resetGame}
          onPauseGame={gameLogic.pauseGame}
          onResumeGame={gameLogic.resumeGame}
          onEnableMultiplayer={gameLogic.enableMultiplayer}
          onDisableMultiplayer={gameLogic.disableMultiplayer}
          onCreateRoom={gameLogic.createRoom}
          onJoinRoom={gameLogic.joinRoom}
        />
      </VStack>

      {/* High Score Modal */}
      <HighScoreModal
        isOpen={gameLogic.showHighScoreModal}
        onClose={() => gameLogic.setShowHighScoreModal(false)}
        score={gameLogic.currentPlayerScore}
        isNewHighScore={gameLogic.isNewHighScore}
        highScores={gameLogic.highScores}
        scoringSystem="points-based"
        gameTitle="Name It"
        timeElapsed={(gameLogic.config?.gameTime || 0) - gameLogic.timeLeft}
        additionalStats={[
          { 
            label: 'Matches Found', 
            value: gameLogic.currentPlayerScore, 
            colorScheme: 'blue' 
          },
          { 
            label: 'Game Mode', 
            value: gameLogic.isMultiplayerEnabled ? 'Multiplayer' : 'Single Player', 
            colorScheme: 'green' 
          },
          { 
            label: 'Difficulty', 
            value: gameLogic.config?.difficulty || 'unknown', 
            colorScheme: 'purple' 
          }
        ]}
        isSubmittingScore={gameLogic.isSubmittingScore}
        onPlayAgain={gameLogic.resetGame}
        customActions={onGameExit ? [
          {
            label: 'Exit Game',
            onClick: onGameExit,
            colorScheme: 'gray',
            variant: 'outline'
          }
        ] : undefined}
      />
    </Box>
  );
  
  } catch (renderError) {
    const error = renderError instanceof Error ? renderError : new Error(String(renderError));
    console.error('🚨 CRITICAL: NameIt render crashed with React Error #300:', error);
    console.error('🔍 CRASH CONTEXT:', {
      hasGameLogic: !!gameLogic,
      hasGameState: !!gameLogic?.gameState,
      hasConfig: !!gameLogic?.config,
      gameLogicType: typeof gameLogic,
      localPlayerId,
      gameLogicKeys: gameLogic ? Object.keys(gameLogic) : [],
      stack: error.stack
    });
    
    // Return fallback UI instead of crashing
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" padding={4}>
        <Text fontSize="xl" color="red.500" marginBottom={4}>
          🚨 Game Render Error
        </Text>
        <Text fontSize="md" color="gray.600" textAlign="center" marginBottom={4}>
          The game encountered a rendering error. This has been logged for debugging.
        </Text>
        <Text fontSize="sm" color="gray.500" textAlign="center">
          Error: {error.message}
        </Text>
      </Box>
    );
  }
};

// ✅ STABILITY FIX: Smart React.memo comparison for NameIt
const NameIt = React.memo(NameItComponent, (prevProps, nextProps) => {
  console.log('🔥 NAMEIT REACT.MEMO: COMPARISON FUNCTION CALLED!!!');
  
  // Compare essential props
  const gameConfigChanged = prevProps.gameConfig !== nextProps.gameConfig; // Object reference comparison
  const playerNameChanged = prevProps.playerName !== nextProps.playerName;
  const configIdChanged = prevProps.configId !== nextProps.configId;
  const enableWebRTCChanged = prevProps.enableWebRTC !== nextProps.enableWebRTC;
  
  // Callback comparison (these should be stable if using useCallback properly)
  const callbacksChanged = prevProps.onGameComplete !== nextProps.onGameComplete ||
                          prevProps.onHighScoreProcessStart !== nextProps.onHighScoreProcessStart ||
                          prevProps.onHighScoreProcessComplete !== nextProps.onHighScoreProcessComplete ||
                          prevProps.onGameExit !== nextProps.onGameExit;
  
  const shouldRerender = gameConfigChanged || playerNameChanged || configIdChanged || 
                        enableWebRTCChanged || callbacksChanged;
  
  console.log('🔥 NAMEIT REACT.MEMO:', {
    gameConfigChanged,
    playerNameChanged,
    configIdChanged,
    enableWebRTCChanged,
    callbacksChanged,
    shouldRerender,
    action: shouldRerender ? 'ALLOWING re-render' : 'PREVENTING re-render'
  });
  
  return !shouldRerender; // Return true to prevent re-render, false to allow
});

// Add displayName for React.memo
NameIt.displayName = 'NameIt';

// ✅ DIAGNOSTIC: Log that React.memo wrapper was created
console.log('🏭 NAMEIT: React.memo wrapper created successfully');

export default NameIt; 