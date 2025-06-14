import React from 'react';
import {
  Box,
  VStack,
  Center,
  Spinner,
  Text,
  useColorModeValue
} from '@chakra-ui/react';
import { AnagramProps } from './types';
import { useGameLogic } from './useGameLogic';
import StartScreen from './StartScreen';
import GameHeader from './GameHeader';
import GameArea from './GameArea';
import GameComplete from './GameComplete';
import HighScoreModal from './HighScoreModal';

const Anagram: React.FC<AnagramProps> = ({
  playerName,
  onGameComplete,
  config,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
}) => {
  const gameLogic = useGameLogic(
    config,
    playerName,
    onGameComplete,
    onHighScoreProcessStart,
    onHighScoreProcessComplete
  );

  const bgColor = useColorModeValue('gray.50', 'gray.900');

  // Start screen
  if (!gameLogic.gameState.gameStarted) {
    return <StartScreen config={config} onStartGame={gameLogic.startGame} />;
  }

  // Game complete screen
  if (gameLogic.gameState.gameCompleted) {
    return (
      <GameComplete
        gameState={gameLogic.gameState}
        formatTime={gameLogic.formatTime}
        onResetGame={gameLogic.resetGame}
      />
    );
  }

  // Loading screen
  const currentAnagram = gameLogic.gameState.anagrams[gameLogic.gameState.currentAnagramIndex];
  if (!currentAnagram) {
    return (
      <Box minH="100vh" bg={bgColor}>
        <Center h="100vh">
          <VStack spacing={4}>
            <Spinner size="xl" color="purple.500" thickness="4px" />
            <Text color="gray.600">Loading word...</Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  // Main game screen
  return (
    <Box minH="100vh" bg={bgColor} p={4}>
      <VStack spacing={6} maxW="4xl" mx="auto">
        <GameHeader 
          gameState={gameLogic.gameState} 
          formatTime={gameLogic.formatTime} 
        />
        
        <GameArea
          gameState={gameLogic.gameState}
          config={config}
          onLetterClick={gameLogic.handleLetterClick}
          onUseHint={gameLogic.useHint}
          onToggleDefinition={gameLogic.toggleDefinition}
        />
      </VStack>

      <HighScoreModal
        gameState={gameLogic.gameState}
        onClose={gameLogic.closeHighScoreModal}
      />
    </Box>
  );
};

export default Anagram; 