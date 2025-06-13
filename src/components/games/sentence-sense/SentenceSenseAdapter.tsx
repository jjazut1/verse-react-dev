import React from 'react';
import SentenceSense from './SentenceSense';
import { GameConfig } from '../../../types/game';

interface SentenceSenseAdapterProps {
  config: GameConfig;
  playerName: string;
  onGameComplete: (score: number) => void;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
}

const SentenceSenseAdapter: React.FC<SentenceSenseAdapterProps> = ({
  config,
  playerName,
  onGameComplete,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
}) => {
  // Type guard to ensure we have a sentence-sense config
  if (config.type !== 'sentence-sense') {
    return <div>Error: Invalid game configuration</div>;
  }

  return (
    <SentenceSense
      config={config}
      playerName={playerName}
      onGameComplete={onGameComplete}
      onHighScoreProcessStart={onHighScoreProcessStart}
      onHighScoreProcessComplete={onHighScoreProcessComplete}
    />
  );
};

export default SentenceSenseAdapter; 