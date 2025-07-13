import React from 'react';
import SentenceSense from './SentenceSense';
import { GameConfig } from '../../../types/game';

interface SentenceSenseAdapterProps {
  config: GameConfig;
  playerName: string;
  onGameComplete: (score: number) => void;
}

const SentenceSenseAdapter: React.FC<SentenceSenseAdapterProps> = ({
  config,
  playerName,
  onGameComplete,
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
    />
  );
};

export default SentenceSenseAdapter; 