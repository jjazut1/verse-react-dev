import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { formatTime } from './utils';

interface HighScoreModalProps {
  score: number;
  timeElapsed: number;
  wordsProcessed: number;
  level: number;
  onPlayAgain: () => void;
  onExit?: () => void;
}

export const HighScoreModal: React.FC<HighScoreModalProps> = ({
  score,
  timeElapsed,
  wordsProcessed,
  level,
  onPlayAgain,
  onExit
}) => {
  const { currentUser } = useAuth();

  const getPerformanceRating = (score: number, level: number): { rating: string; emoji: string; color: string } => {
    if (score >= 500 && level >= 5) {
      return { rating: 'Excellent!', emoji: '🌟', color: '#FFD700' };
    } else if (score >= 300 && level >= 3) {
      return { rating: 'Great Job!', emoji: '⭐', color: '#4CAF50' };
    } else if (score >= 150) {
      return { rating: 'Good Work!', emoji: '👍', color: '#2196F3' };
    } else if (score >= 50) {
      return { rating: 'Keep Trying!', emoji: '💪', color: '#FF9800' };
    } else {
      return { rating: 'Practice More!', emoji: '📚', color: '#9C27B0' };
    }
  };

  const performance = getPerformanceRating(score, level);

  return (
    <div className="high-score-modal-overlay">
      <div className="high-score-modal">
        <div className="modal-header">
          <h2 className="modal-title">Game Complete!</h2>
          <div 
            className="performance-badge"
            style={{ color: performance.color }}
          >
            <span className="performance-emoji">{performance.emoji}</span>
            <span className="performance-text">{performance.rating}</span>
          </div>
        </div>

        <div className="stats-container">
          <div className="stat-grid">
            <div className="stat-item primary">
              <div className="stat-value">{score}</div>
              <div className="stat-label">Final Score</div>
            </div>

            <div className="stat-item">
              <div className="stat-value">{level}</div>
              <div className="stat-label">Level Reached</div>
            </div>

            <div className="stat-item">
              <div className="stat-value">{formatTime(timeElapsed)}</div>
              <div className="stat-label">Time Played</div>
            </div>

            <div className="stat-item">
              <div className="stat-value">{wordsProcessed}</div>
              <div className="stat-label">Words Processed</div>
            </div>

            <div className="stat-item">
              <div className="stat-value">
                {wordsProcessed > 0 ? Math.round(wordsProcessed / (timeElapsed / 60)) : 0}
              </div>
              <div className="stat-label">Words/Minute</div>
            </div>
          </div>
        </div>

        {/* Achievement badges */}
        <div className="achievements">
          <h3 className="achievements-title">Achievements</h3>
          <div className="achievement-badges">
            {score >= 500 && (
              <div className="achievement-badge">
                <span className="badge-icon">👑</span>
                <span className="badge-text">High Scorer</span>
              </div>
            )}
            {level >= 5 && (
              <div className="achievement-badge">
                <span className="badge-icon">🚀</span>
                <span className="badge-text">Level Master</span>
              </div>
            )}
            {timeElapsed >= 300 && (
              <div className="achievement-badge">
                <span className="badge-icon">⏰</span>
                <span className="badge-text">Endurance</span>
              </div>
            )}
            {wordsProcessed >= 50 && (
              <div className="achievement-badge">
                <span className="badge-icon">📚</span>
                <span className="badge-text">Word Warrior</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress indicators */}
        <div className="progress-section">
          <div className="progress-item">
            <div className="progress-label">
              <span>Level Progress</span>
              <span>Level {level}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill level"
                style={{ width: `${Math.min(100, (level / 10) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Player info */}
        {currentUser && (
          <div className="player-info">
            <div className="player-name">
              Well done, {currentUser.displayName || 'Student'}! 🎉
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="modal-actions">
          <button 
            className="action-button secondary"
            onClick={onExit}
          >
            <span>🏠</span>
            Exit Game
          </button>
          
          <button 
            className="action-button primary"
            onClick={onPlayAgain}
          >
            <span>🔄</span>
            Play Again
          </button>
        </div>

        {/* Motivational message */}
        <div className="motivational-message">
          {score >= 300 ? 
            "Fantastic work! You're becoming a word volley champion! 🏆" :
            score >= 150 ?
            "Great effort! Keep practicing to improve your score! 💪" :
            "Good start! Practice makes perfect - try again! 🌟"
          }
        </div>
      </div>

      <style>{`
        .high-score-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .high-score-modal {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          padding: 32px;
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          color: white;
          text-align: center;
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-header {
          margin-bottom: 24px;
        }

        .modal-title {
          font-size: 2.5em;
          margin-bottom: 12px;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .performance-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 1.5em;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .performance-emoji {
          font-size: 1.2em;
        }

        .stats-container {
          margin-bottom: 24px;
        }

        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .stat-item {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 16px;
          backdrop-filter: blur(10px);
        }

        .stat-item.primary {
          background: rgba(255, 215, 0, 0.2);
          border: 2px solid rgba(255, 215, 0, 0.5);
        }

        .stat-value {
          font-size: 2em;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 0.9em;
          opacity: 0.9;
        }

        .achievements {
          margin-bottom: 24px;
        }

        .achievements-title {
          font-size: 1.3em;
          margin-bottom: 12px;
        }

        .achievement-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }

        .achievement-badge {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9em;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .badge-icon {
          font-size: 1.2em;
        }

        .progress-section {
          margin-bottom: 24px;
        }

        .progress-item {
          margin-bottom: 16px;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 0.9em;
        }

        .progress-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 1s ease-out;
        }

        .progress-fill.level {
          background: linear-gradient(90deg, #2196F3, #03DAC6);
        }

        .player-info {
          margin-bottom: 24px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }

        .player-name {
          font-size: 1.2em;
          font-weight: bold;
        }

        .modal-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin-bottom: 20px;
        }

        .action-button {
          padding: 12px 24px;
          border: none;
          border-radius: 25px;
          font-size: 1.1em;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          min-width: 140px;
          justify-content: center;
        }

        .action-button.primary {
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
        }

        .action-button.secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .action-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }

        .motivational-message {
          font-style: italic;
          opacity: 0.9;
          line-height: 1.5;
          padding: 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          margin-top: 16px;
        }

        @media (max-width: 640px) {
          .high-score-modal {
            padding: 20px;
            margin: 10px;
          }

          .modal-title {
            font-size: 2em;
          }

          .stat-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .modal-actions {
            flex-direction: column;
          }

          .action-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}; 