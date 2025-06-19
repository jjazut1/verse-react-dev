import React from 'react';
import { Box } from '@chakra-ui/react';
import { SortCategoriesEggRevealProps } from './types';
import { useGameLogic } from './useGameLogic';
import StartScreen from './StartScreen';
import GameArea from './GameArea';
import GameControls from './GameControls';
import HighScoreModal from './HighScoreModal';
import ConfigModal from './ConfigModal';
import PWAGameHeader from '../PWAGameHeader';

const SortCategoriesEggReveal: React.FC<SortCategoriesEggRevealProps> = ({
  playerName,
  onGameComplete,
  config: initialConfig,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
}): JSX.Element => {
  const gameLogic = useGameLogic(
    initialConfig,
    playerName,
    onGameComplete,
    onHighScoreProcessStart,
    onHighScoreProcessComplete
  );

  return (
    <Box width="100vw" maxWidth="100%" overflow="hidden" height="auto">
      <PWAGameHeader gameTitle="Sort Categories Egg Reveal" variant="compact" />
      
      <ConfigModal
        gameState={gameLogic.gameState}
        onClose={gameLogic.closeConfigModal}
        onConfigSelect={gameLogic.handleConfigSelect}
      />
      
      {gameLogic.gameState.gameStarted ? (
        <Box position="relative">
          <GameArea
            gameState={gameLogic.gameState}
            gameAreaRef={gameLogic.gameAreaRef}
            onMouseMove={gameLogic.handleMouseMove}
            onGameAreaClick={gameLogic.handleGameAreaClick}
            onEggClick={gameLogic.handleEggClick}
            onWordClick={gameLogic.handleWordClick}
          />
          <GameControls
            gameState={gameLogic.gameState}
            onResetGame={gameLogic.handleResetGame}
            onCloseGame={gameLogic.handleCloseGame}
          />
        </Box>
      ) : (
        <StartScreen
          onStartGame={gameLogic.openConfigModal}
          onLoadConfig={gameLogic.openConfigModal}
        />
      )}
      
      <HighScoreModal
        gameState={gameLogic.gameState}
        onClose={gameLogic.handleHighScoreDisplayModalClose}
      />
    </Box>
  );
};

export default SortCategoriesEggReveal; 