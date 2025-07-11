import React from 'react';
import { GameHeaderProps } from './types';

/**
 * Game header component containing title, scoreboard, and educational feature buttons
 */
export const GameHeader: React.FC<GameHeaderProps> = ({
  config,
  gameState,
  showPlaceValueLabels,
  setShowPlaceValueLabels,
  showExpandedNumbers,
  setShowExpandedNumbers,
  showExpandedWords,
  setShowExpandedWords,
  onAdvanceToNextRound
}) => (
  <div className="game-header">
    <h2>🏆 {config.title}</h2>
    <div className="header-content">
      <div className="scoreboard">
        <div className="score">
          <span className="player-name">{config.teacherName}</span>
          <span className="points">{gameState.teacherScore}</span>
        </div>
        <div className="vs">VS</div>
        <div className="score">
          <span className="player-name">{config.playerName}</span>
          <span className="points">{gameState.studentScore}</span>
        </div>
      </div>
      
      <div className="header-controls">
        <button 
          onClick={() => setShowPlaceValueLabels(!showPlaceValueLabels)}
          className={`feature-button compact ${showPlaceValueLabels ? 'active' : ''}`}
          title="Show Place Values"
        >
          📊
        </button>
        <button 
          onClick={() => setShowExpandedNumbers(!showExpandedNumbers)}
          className={`feature-button compact ${showExpandedNumbers ? 'active' : ''}`}
          title="Show Expanded Numbers"
        >
          🔢
        </button>
        <button 
          onClick={() => setShowExpandedWords(!showExpandedWords)}
          className={`feature-button compact ${showExpandedWords ? 'active' : ''}`}
          title="Show Expanded Words"
        >
          📝
        </button>
      </div>
      
      {gameState.phase === 'revealing' && (
        <button 
          onClick={onAdvanceToNextRound}
          className="continue-button compact"
        >
          🎲 Next Round
        </button>
      )}
    </div>
  </div>
); 