import React, { useMemo, useEffect } from 'react';
import NameIt from './NameIt';
import NameItMinimal from './NameItMinimal';
import { PlayerMappingProvider } from './contexts/PlayerMappingContext';
import { GameConfig } from './types';

interface NameItAdapterProps {
  config: GameConfig;
  onGameComplete?: (score: number, timeElapsed: number) => void;
  playerName?: string;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
  onGameExit?: () => void;
}

const NameItAdapterComponent: React.FC<NameItAdapterProps> = ({
  config,
  onGameComplete,
  playerName = 'Player',
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
  onGameExit
}) => {
  console.log('🚀 NAMEIT ADAPTER: Rendering started with props:', {
    configId: config?.id,
    playerName,
    enableWebRTC: config?.enableWebRTC,
    hasCallbacks: {
      onGameComplete: !!onGameComplete,
      onHighScoreProcessStart: !!onHighScoreProcessStart,
      onHighScoreProcessComplete: !!onHighScoreProcessComplete,
      onGameExit: !!onGameExit
    }
  });
  
  // ✅ CRITICAL: Add detailed re-render analysis for Adapter
  const renderCountRef = React.useRef(0);
  const lastPropsRef = React.useRef<any>(null);
  const lastRenderTimeRef = React.useRef(Date.now());
  
  renderCountRef.current += 1;
  const currentTime = Date.now();
  const timeSinceLastRender = currentTime - lastRenderTimeRef.current;
  lastRenderTimeRef.current = currentTime;
  
  const currentProps = {
    configId: config?.id,
    configTitle: config?.title,
    configEnableWebRTC: config?.enableWebRTC,
    configReference: config, // Object reference
    playerName,
    onGameComplete: !!onGameComplete,
    onGameCompleteRef: onGameComplete, // Function reference
    onHighScoreProcessStart: !!onHighScoreProcessStart,
    onHighScoreProcessStartRef: onHighScoreProcessStart,
    onHighScoreProcessComplete: !!onHighScoreProcessComplete,
    onHighScoreProcessCompleteRef: onHighScoreProcessComplete,
    onGameExit: !!onGameExit,
    onGameExitRef: onGameExit
  };
  
  // Detect what changed
  const changedProps = [];
  if (lastPropsRef.current) {
    for (const [key, value] of Object.entries(currentProps)) {
      if (lastPropsRef.current[key] !== value) {
        changedProps.push({
          prop: key,
          old: lastPropsRef.current[key],
          new: value,
          typeOld: typeof lastPropsRef.current[key],
          typeNew: typeof value
        });
      }
    }
  }
  
  lastPropsRef.current = currentProps;
  
  console.log(`🔄 ADAPTER RENDER #${renderCountRef.current} (+${timeSinceLastRender}ms):`, {
    timestamp: new Date().toISOString(),
    timeSinceLastRender,
    changedProps: changedProps.length > 0 ? changedProps : 'No prop changes detected',
    configObjectReference: `config@${config ? Object.prototype.toString.call(config) : 'null'}`
  });
  
  // Log stack trace for rapid re-renders (< 100ms)  
  if (timeSinceLastRender < 100 && renderCountRef.current > 1) {
    console.warn(`⚡ ADAPTER RAPID RE-RENDER detected (${timeSinceLastRender}ms)! Render #${renderCountRef.current}`);
    console.trace('Adapter stack trace for rapid re-render:');
  }
  
  // ✅ COMPONENT LIFECYCLE: Track adapter mounting/unmounting
  useEffect(() => {
    console.log('🎬 NAMEIT ADAPTER: MOUNTED at', new Date().toISOString());
    return () => {
      console.log('💀 NAMEIT ADAPTER: UNMOUNTING!!! at', new Date().toISOString());
      console.trace();
    };
  }, []);
  
  // ✅ AUTH STABILIZED: Now protected by AuthStableWrapper, no need to track auth changes

  // ✅ STABILITY FIX: Adapter-level debugging  
  useEffect(() => {
    console.log('🔄 NAMEIT ADAPTER: Re-rendered, props:', {
      configId: config?.id,
      playerName,
      enableWebRTC: config?.enableWebRTC
    });
  }, [config, playerName, onGameComplete, onHighScoreProcessStart, onHighScoreProcessComplete, onGameExit]);
  
  // ✅ STABILITY FIX: Memoize props passed to NameIt
  const memoizedProps = useMemo(() => ({
    gameConfig: config,
    onGameComplete,
    onHighScoreProcessStart,
    onHighScoreProcessComplete,
    onGameExit,
    configId: config?.id,
    playerName,
    enableWebRTC: config?.enableWebRTC
  }), [config, onGameComplete, onHighScoreProcessStart, onHighScoreProcessComplete, onGameExit, playerName]);
  // ✅ TESTING: Use minimal version to isolate Player 1 disconnect issue
  const useMinimalVersion = true; // Set to false to use full version

  if (useMinimalVersion) {
    console.log('🧪 ADAPTER: Using NameItMinimal for testing');
    return (
      <PlayerMappingProvider>
        <NameItMinimal
          gameConfig={memoizedProps.gameConfig}
          onGameComplete={memoizedProps.onGameComplete}
          onHighScoreProcessStart={memoizedProps.onHighScoreProcessStart}
          onHighScoreProcessComplete={memoizedProps.onHighScoreProcessComplete}
          onGameExit={memoizedProps.onGameExit}
          configId={memoizedProps.configId}
          playerName={memoizedProps.playerName}
          enableWebRTC={memoizedProps.enableWebRTC}
        />
      </PlayerMappingProvider>
    );
  }

  return (
    <NameIt
      gameConfig={memoizedProps.gameConfig}
      onGameComplete={memoizedProps.onGameComplete}
      onHighScoreProcessStart={memoizedProps.onHighScoreProcessStart}
      onHighScoreProcessComplete={memoizedProps.onHighScoreProcessComplete}
      onGameExit={memoizedProps.onGameExit}
      configId={memoizedProps.configId}
      playerName={memoizedProps.playerName}
      enableWebRTC={memoizedProps.enableWebRTC}
    />
  );
};

// ✅ STABILITY FIX: Smart React.memo comparison to prevent unnecessary re-renders
const NameItAdapter = React.memo(NameItAdapterComponent, (prevProps, nextProps) => {
  console.log('🔥 NAMEIT ADAPTER REACT.MEMO: COMPARISON FUNCTION CALLED!!!');
  
  // Compare essential config properties instead of object reference
  const configChanged = prevProps.config?.id !== nextProps.config?.id ||
                       prevProps.config?.title !== nextProps.config?.title;
  
  const propsChanged = prevProps.playerName !== nextProps.playerName ||
                      prevProps.onGameComplete !== nextProps.onGameComplete ||
                      prevProps.onHighScoreProcessStart !== nextProps.onHighScoreProcessStart ||
                      prevProps.onHighScoreProcessComplete !== nextProps.onHighScoreProcessComplete ||
                      prevProps.onGameExit !== nextProps.onGameExit;
  
  const shouldRerender = configChanged || propsChanged;
  
  console.log('🔥 NAMEIT ADAPTER REACT.MEMO:', {
    configChanged,
    propsChanged,
    shouldRerender,
    action: shouldRerender ? 'ALLOWING re-render' : 'PREVENTING re-render'
  });
  
  return !shouldRerender; // Return true to prevent re-render, false to allow
});

// Add displayName for React.memo
NameItAdapter.displayName = 'NameItAdapter';

// ✅ DIAGNOSTIC: Log that React.memo wrapper was created
console.log('🏭 NAMEIT ADAPTER: React.memo wrapper created successfully');

export default NameItAdapter; 