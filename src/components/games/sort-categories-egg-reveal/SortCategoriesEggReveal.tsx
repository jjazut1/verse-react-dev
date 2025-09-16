import React, { useState, useCallback } from 'react';
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

  // UI sound toggle: controls both TTS and sound effects
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  return (
    <Box width="100vw" maxWidth="100%" overflow="hidden" height="auto">
      <PWAGameHeader gameTitle="Sort Categories" variant="compact" />
      
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
            enableTextToSpeech={initialConfig.enableTextToSpeech}
            usePhonicsMode={initialConfig.usePhonicsMode}
            useAmazonPolly={initialConfig.useAmazonPolly}
            textToSpeechMode={initialConfig.textToSpeechMode}
            containerType={initialConfig.containerType}
            soundEnabled={soundEnabled}
          />
          <GameControls
            gameState={gameLogic.gameState}
            onResetGame={gameLogic.handleResetGame}
            onCloseGame={gameLogic.handleCloseGame}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
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