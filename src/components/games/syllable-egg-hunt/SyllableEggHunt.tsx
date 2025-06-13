import React, { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Container,
  useDisclosure,
  useBreakpointValue,
} from '@chakra-ui/react';
import { SyllableEggHuntProps, GameConfig } from './types';
import { defaultConfig } from './utils';
import { useGameLogic } from './useGameLogic';
import { GameHeader } from './GameHeader';
import { ConfigModal } from './ConfigModal';
import { GameArea } from './GameArea';
import { StartScreen } from './StartScreen';

const SyllableEggHunt: React.FC<SyllableEggHuntProps> = ({
  playerName,
  onGameComplete,
}) => {
  const [gameConfig, setGameConfig] = useState<GameConfig>(defaultConfig);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const containerPadding = useBreakpointValue({ base: 2, md: 4, lg: 6 });
  const gameHeight = useBreakpointValue({ base: "400px", md: "500px", lg: "600px" });

  const gameLogic = useGameLogic(playerName, onGameComplete);

  const handleStartGame = () => {
    gameLogic.startGame(gameConfig);
    onClose();
  };

  const renderGame = () => (
    <Container maxW="container.xl" p={containerPadding}>
      <Box position="relative" height={gameHeight} borderWidth="1px" borderRadius="lg" p={4}>
        <VStack spacing={4} align="stretch" height="100%">
          <GameHeader
            playerName={playerName}
            gameStats={gameLogic.gameStats}
          />
          
          <GameArea
            eggs={gameLogic.eggs}
            crackedEggs={gameLogic.crackedEggs}
            baskets={gameLogic.baskets}
            selectedWord={gameLogic.selectedWord}
            onEggClick={gameLogic.handleEggClick}
            onBasketClick={gameLogic.handleBasketClick}
          />
          
          <Button 
            colorScheme="blue" 
            onClick={gameLogic.resetGame} 
            size={{ base: "sm", md: "md" }}
          >
            Reset Game
          </Button>
        </VStack>
      </Box>
    </Container>
  );

  return (
    <Box>
      <ConfigModal
        isOpen={isOpen}
        onClose={onClose}
        gameConfig={gameConfig}
        onConfigChange={setGameConfig}
        onStartGame={handleStartGame}
      />
      
      {!gameLogic.gameStarted ? (
        <StartScreen
          playerName={playerName}
          onStartGame={onOpen}
        />
      ) : (
        renderGame()
      )}
    </Box>
  );
};

export default SyllableEggHunt; 