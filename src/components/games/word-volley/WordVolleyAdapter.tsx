import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WordVolley } from './WordVolley';
import { GameSettings } from './types';

interface WordVolleyAdapterProps {
  gameConfig: any;
  playerName: string;
  onGameComplete: (score: number) => void;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
}

const WordVolleyAdapter: React.FC<WordVolleyAdapterProps> = ({
  gameConfig,
  playerName,
  onGameComplete,
  onHighScoreProcessStart,
  onHighScoreProcessComplete
}) => {
  const navigate = useNavigate();

  // Convert Firebase config to WordVolley GameSettings format
  // Map paddle size from 1-10 scale to actual pixel values (40-80 pixels)
  const paddleSizeScale = gameConfig.paddleSize || 5;
  const actualPaddleSize = 40 + ((paddleSizeScale - 1) / 9) * 40;

  // Convert game speed from 2-15 scale to actual ball speed multiplier
  const speedScale = gameConfig.gameSpeed || 5;
  const actualSpeed = 3 + ((speedScale - 2) / 13) * 12; // 3 to 15 px/frame for proper Pong speed

  const convertedSettings: Partial<GameSettings> = {
    gameTime: (gameConfig.gameDuration || 3) * 60, // Convert minutes to seconds
    paddleSize: actualPaddleSize,
    initialSpeed: actualSpeed,
    categoryName: gameConfig.targetCategory?.name || 'Words',
    targetWords: gameConfig.targetCategory?.words || [],
    nonTargetWords: gameConfig.nonTargetCategory?.words || [],
    enableTextToSpeech: gameConfig.enableTextToSpeech ?? true,
    theme: 'classic',
    maxLives: 3,
    speedIncrement: 1.0,
    wordsPerLevel: 10,
    enableSound: true
  };

  const handleGameComplete = (score: number, timeElapsed: number) => {
    onGameComplete(score);
  };

  const handleGameExit = () => {
    // Navigate back to the previous page or dashboard
    navigate(-1); // Goes back to previous page
  };

  return (
    <WordVolley
      gameConfig={convertedSettings}
      onGameComplete={handleGameComplete}
      onHighScoreProcessStart={onHighScoreProcessStart}
      onHighScoreProcessComplete={onHighScoreProcessComplete}
      configId={gameConfig.id}
      playerName={playerName}
      onGameExit={handleGameExit}
    />
  );
};

export default WordVolleyAdapter; 