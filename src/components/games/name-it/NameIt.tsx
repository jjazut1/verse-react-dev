import React, { useMemo, useCallback, useEffect } from 'react';
import { Box, VStack } from '@chakra-ui/react';
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
  
  const gameLogic = useGameLogic(gameLogicProps);

  // ✅ SAFETY: Ensure gameLogic is valid before rendering
  if (!gameLogic || !gameLogic.gameState) {
    console.warn('⚠️ NAMEIT: gameLogic is incomplete, skipping render');
    return null;
  }

  const localPlayerId = currentUser?.uid || 'local-player';

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