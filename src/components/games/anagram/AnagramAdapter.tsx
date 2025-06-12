import React from 'react';
import Anagram from './Anagram';
import { GameConfig } from '../../../types/game';

interface AnagramAdapterProps {
  config: GameConfig;
  playerName: string;
  onGameComplete: (score: number) => void;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
}

const AnagramAdapter: React.FC<AnagramAdapterProps> = ({
  config,
  playerName,
  onGameComplete,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
}) => {
  // Type guard to ensure we have an anagram config
  if (config.type !== 'anagram') {
    return <div>Error: Invalid game configuration</div>;
  }

  return (
    <Anagram
      config={config}
      playerName={playerName}
      onGameComplete={onGameComplete}
      onHighScoreProcessStart={onHighScoreProcessStart}
      onHighScoreProcessComplete={onHighScoreProcessComplete}
    />
  );
};

export default AnagramAdapter; 