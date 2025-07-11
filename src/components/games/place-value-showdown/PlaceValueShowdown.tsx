import React, { useState, useEffect } from 'react';
import { PlaceValueShowdownProps } from './types';
import { useGameLogic } from './useGameLogic';
import { GameHeader } from './GameHeader';
import { PlayerArea } from './PlayerArea';
import PWAGameHeader from '../PWAGameHeader';
import './PlaceValueShowdown.css';

/**
 * Place Value Showdown - A math game for practicing place value concepts
 * 
 * This component has been refactored into multiple files for better organization:
 * - types.ts: TypeScript interfaces and type definitions
 * - utils.ts: Utility functions for game logic and calculations
 * - useGameLogic.ts: Custom hook for managing game state and logic
 * - GameHeader.tsx: Header component with scoreboard and controls
 * - PlayerArea.tsx: Player area with slots and cards
 * - SlotContainer.tsx: Individual slot container component
 */

const PlaceValueShowdown: React.FC<PlaceValueShowdownProps> = ({
  playerName,
  onGameComplete,
  config,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
}) => {
  // Educational feature toggles
  const [showPlaceValueLabels, setShowPlaceValueLabels] = useState(false);
  const [showExpandedNumbers, setShowExpandedNumbers] = useState(false);
  const [showExpandedWords, setShowExpandedWords] = useState(false);

  // Create a modified config that uses the dynamic playerName
  const dynamicConfig = React.useMemo(() => ({
    ...config,
    playerName: playerName || config.playerName // Use dynamic playerName if available, fallback to original
  }), [config, playerName]);

  // Use custom hook for game logic and state management
  const { gameState, selectionState, handlers } = useGameLogic(dynamicConfig, onGameComplete);

  // Handle mouse move for ghost card tracking
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!selectionState.isCardSelected) return;
      handlers.updateGhostPosition({ x: e.clientX, y: e.clientY });
    };

    if (selectionState.isCardSelected) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [selectionState.isCardSelected, handlers]);

  return (
    <div className="place-value-showdown" onClick={handlers.handleGameAreaClick}>
      {/* PWA Navigation Header */}
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        right: '10px', 
        zIndex: 1000
      }}>
        <PWAGameHeader 
          gameTitle={dynamicConfig.title}
          variant="compact"
        />
      </div>
      
      <GameHeader
        config={dynamicConfig}
        gameState={gameState}
        showPlaceValueLabels={showPlaceValueLabels}
        setShowPlaceValueLabels={setShowPlaceValueLabels}
        showExpandedNumbers={showExpandedNumbers}
        setShowExpandedNumbers={setShowExpandedNumbers}
        showExpandedWords={showExpandedWords}
        setShowExpandedWords={setShowExpandedWords}
        onAdvanceToNextRound={handlers.handleAdvanceToNextRound}
      />

      {(gameState.phase === 'dealing' || gameState.phase === 'gameComplete') && (
        <div className="game-message">
          <p>{gameState.message}</p>
        </div>
      )}

      {(gameState.phase === 'dealing' || gameState.phase === 'arranging' || gameState.phase === 'revealing') && (
        <div className="game-area">
          <PlayerArea
            isTeacher={true}
            config={dynamicConfig}
            gameState={gameState}
            showPlaceValueLabels={showPlaceValueLabels}
            showExpandedNumbers={showExpandedNumbers}
            showExpandedWords={showExpandedWords}
          />

          <PlayerArea
            isTeacher={false}
            config={dynamicConfig}
            gameState={gameState}
            showPlaceValueLabels={showPlaceValueLabels}
            showExpandedNumbers={showExpandedNumbers}
            showExpandedWords={showExpandedWords}
            onSlotClick={handlers.handleSlotClick}
            onCardClick={handlers.handleCardClick}
            onReturnToDeck={handlers.handleReturnToDeck}
            selectionState={selectionState}
          />
        </div>
      )}

      {gameState.phase === 'gameComplete' && (
        <div className="game-complete">
          <h2>🎉 Game Complete!</h2>
          <div className="final-scores">
            <p><strong>Final Score:</strong></p>
            <p>{dynamicConfig.teacherName}: {gameState.teacherScore}</p>
            <p>{dynamicConfig.playerName}: {gameState.studentScore}</p>
          </div>
        </div>
      )}

      {selectionState.isCardSelected && selectionState.selectedCard && (
        <div
          className="ghost-card"
          style={{
            position: 'fixed',
            left: selectionState.ghostPosition.x - 30,
            top: selectionState.ghostPosition.y - 40,
            pointerEvents: 'none',
            zIndex: 1000,
            opacity: 0.8
          }}
        >
          <div className="card student-card">
            {selectionState.selectedCard.digit}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaceValueShowdown; 