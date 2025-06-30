import React from 'react';
import { GameState, ThemeType } from './types';
import { THEMES } from './utils';

interface GameControlsProps {
  gameState: GameState;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
  onToggleTextToSpeech: () => void;
  isTextToSpeechEnabled: boolean;
  theme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gameState,
  onStart,
  onPause,
  onReset,
  onToggleMute,
  isMuted,
  onToggleTextToSpeech,
  isTextToSpeechEnabled,
  theme,
  onThemeChange
}) => {
  const getPlayPauseButton = () => {
    switch (gameState) {
      case 'idle':
        return (
          <button onClick={onStart} className="control-button primary">
            <span>▶️</span>
            Start Game
          </button>
        );
      case 'playing':
        return (
          <button onClick={onPause} className="control-button secondary">
            <span>⏸️</span>
            Pause
          </button>
        );
      case 'paused':
        return (
          <button onClick={onPause} className="control-button primary">
            <span>▶️</span>
            Resume
          </button>
        );
      case 'gameOver':
        return (
          <button onClick={onReset} className="control-button primary">
            <span>🔄</span>
            New Game
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="game-controls">
      <div className="control-section">
        <h4 className="section-title">Game Controls</h4>
        <div className="control-buttons">
          {getPlayPauseButton()}
          
          {gameState !== 'idle' && (
            <button onClick={onReset} className="control-button secondary">
              <span>🔄</span>
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="control-section">
        <h4 className="section-title">Audio</h4>
        <div className="control-buttons">
          <button onClick={onToggleMute} className="control-button audio">
            <span>{isMuted ? '🔇' : '🔊'}</span>
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <button onClick={onToggleTextToSpeech} className="control-button audio">
            <span>{isTextToSpeechEnabled ? '🗣️' : '🔇'}</span>
            {isTextToSpeechEnabled ? 'TTS On' : 'TTS Off'}
          </button>
        </div>
      </div>

      <div className="control-section">
        <h4 className="section-title">Theme</h4>
        <div className="theme-selector">
          {Object.entries(THEMES).map(([themeKey, themeData]) => (
            <button
              key={themeKey}
              onClick={() => onThemeChange(themeKey as ThemeType)}
              className={`theme-button ${theme === themeKey ? 'active' : ''}`}
              style={{
                background: themeData.background.type === 'gradient' 
                  ? `linear-gradient(135deg, ${themeData.background.primary}, ${themeData.background.secondary})`
                  : themeData.background.primary,
                color: themeData.text.primary
              }}
              title={themeData.name}
            >
              <span className="theme-preview">
                <div 
                  className="theme-paddle"
                  style={{ backgroundColor: themeData.paddles.player }}
                />
                <div 
                  className="theme-ball"
                  style={{ backgroundColor: themeData.ball.target }}
                />
              </span>
              <span className="theme-name">{themeData.name}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .game-controls {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 12px;
          margin-top: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .control-section {
          margin-bottom: 20px;
        }

        .control-section:last-child {
          margin-bottom: 0;
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #333;
          text-align: center;
        }

        .control-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .control-button {
          padding: 10px 18px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
          min-width: 100px;
          justify-content: center;
        }

        .control-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .control-button.primary {
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
        }

        .control-button.secondary {
          background: linear-gradient(135deg, #2196F3, #1976D2);
          color: white;
        }

        .control-button.audio {
          background: linear-gradient(135deg, #FF9800, #F57C00);
          color: white;
        }

        .control-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .theme-selector {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
        }

        .theme-button {
          padding: 12px 8px;
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          position: relative;
          overflow: hidden;
        }

        .theme-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .theme-button.active {
          border-color: #FFD700;
          box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.3);
        }

        .theme-preview {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 2px;
        }

        .theme-paddle {
          width: 8px;
          height: 20px;
          border-radius: 2px;
        }

        .theme-ball {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .theme-name {
          font-size: 10px;
          text-align: center;
          line-height: 1.2;
          opacity: 0.9;
        }

        @media (max-width: 640px) {
          .game-controls {
            padding: 16px;
          }

          .control-buttons {
            flex-direction: column;
          }

          .control-button {
            width: 100%;
          }

          .theme-selector {
            grid-template-columns: repeat(2, 1fr);
          }

          .theme-button {
            padding: 8px 4px;
          }
        }
      `}</style>
    </div>
  );
}; 