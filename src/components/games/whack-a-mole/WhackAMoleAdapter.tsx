import React from 'react';
import { Box } from '@chakra-ui/react';
import WhackAMole from './WhackAMole';
import { GameConfig } from '../../../types/game';

interface WhackAMoleAdapterProps {
  playerName: string;
  onGameComplete: (score: number) => void;
  config: GameConfig;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
}

const WhackAMoleAdapter: React.FC<WhackAMoleAdapterProps> = ({
  playerName,
  onGameComplete,
  config,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
}) => {
  return (
    <Box width="100%" height="100%">
      <WhackAMole
        playerName={playerName}
        onGameComplete={onGameComplete}
        config={config}
        onHighScoreProcessStart={onHighScoreProcessStart}
        onHighScoreProcessComplete={onHighScoreProcessComplete}
      />
    </Box>
  );
};

export default WhackAMoleAdapter; 