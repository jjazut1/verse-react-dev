import React from 'react';
import PlaceValueShowdown from './PlaceValueShowdown';
import { GameConfig } from '../../../types/game';

interface PlaceValueShowdownAdapterProps {
  playerName: string;
  onGameComplete: (score: number) => void;
  config: GameConfig;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
}

const PlaceValueShowdownAdapter: React.FC<PlaceValueShowdownAdapterProps> = ({
  playerName,
  onGameComplete,
  config,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
}) => {
  // Type guard to ensure we have a place value showdown config
  if (config.type !== 'place-value-showdown') {
    return <div>Error: Invalid game configuration</div>;
  }

  return (
    <PlaceValueShowdown
      config={config}
      playerName={playerName}
      onGameComplete={onGameComplete}
      onHighScoreProcessStart={onHighScoreProcessStart}
      onHighScoreProcessComplete={onHighScoreProcessComplete}
    />
  );
};

export default PlaceValueShowdownAdapter; 