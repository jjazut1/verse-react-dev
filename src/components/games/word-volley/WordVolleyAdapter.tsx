import React from 'react';
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
  // Convert Firebase config to WordVolley GameSettings format
  // Map paddle size from 1-10 scale to actual pixel values (40-80 pixels)
  const paddleSizeScale = gameConfig.paddleSize || 5;
  const actualPaddleSize = 40 + ((paddleSizeScale - 1) * 40) / 9; // Maps 1-10 to 40-80 pixels
  
  const convertedSettings: Partial<GameSettings> = {
    targetWords: gameConfig.targetCategory?.words || ['cat', 'bat', 'hat', 'mat', 'rat'],
    nonTargetWords: gameConfig.nonTargetCategory?.words || ['dog', 'tree', 'house', 'car', 'sun'],
    categoryName: gameConfig.targetCategory?.name || 'Target Words',
    theme: gameConfig.theme || 'classic',
    initialSpeed: gameConfig.gameSpeed || 3,
    paddleSize: Math.round(actualPaddleSize),
    maxLives: 3,
    speedIncrement: 0.5,
    wordsPerLevel: 10,
    enableSound: true,
    gameTime: gameConfig.timeLimit || 300
  };

  // Handle game completion with score and time
  const handleGameComplete = (score: number, timeElapsed: number) => {
    onGameComplete(score);
  };

  return (
    <WordVolley
      gameConfig={convertedSettings}
      onGameComplete={handleGameComplete}
      onGameExit={() => {
        // Handle game exit if needed
      }}
    />
  );
};

export default WordVolleyAdapter; 