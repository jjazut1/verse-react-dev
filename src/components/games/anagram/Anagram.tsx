import React from 'react';
import { Box } from '@chakra-ui/react';
import { AnagramProps } from './types';
import { useGameLogic } from './useGameLogic';
import StartScreen from './StartScreen';
import GameArea from './GameArea';
import GameComplete from './GameComplete';
import PWAGameHeader from '../PWAGameHeader';
import './WordSentenceMode.css';

const Anagram: React.FC<AnagramProps> = ({
  playerName,
  onGameComplete,
  config,
}) => {
  const gameLogic = useGameLogic(
    config,
    playerName,
    onGameComplete
  );

  const { gameState } = gameLogic;

  if (!gameState.gameStarted) {
    return (
      <Box w="100vw" h="100vh" overflow="hidden">
        <PWAGameHeader gameTitle="Anagram" variant="compact" />
        <StartScreen config={config} onStartGame={gameLogic.startGame} />
      </Box>
    );
  }

  if (gameState.gameCompleted) {
    return (
      <Box w="100vw" h="100vh" overflow="hidden">
        <PWAGameHeader gameTitle="Anagram" variant="compact" />
        <GameComplete
          gameState={gameState} 
          onResetGame={gameLogic.resetGame}
          formatTime={gameLogic.formatTime}
        />
      </Box>
    );
  }

  return (
    <Box w="100vw" h="100vh" overflow="hidden">
      <PWAGameHeader gameTitle="Anagram" variant="compact" />
        <GameArea
        gameState={gameState}
          config={config}
          onLetterClick={gameLogic.handleLetterClick}
          onUseHint={gameLogic.useHint}
          onToggleDefinition={gameLogic.toggleDefinition}
      />
    </Box>
  );
};

export default Anagram; 