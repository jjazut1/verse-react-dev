import React from 'react';
import {
  Flex,
  HStack,
  Text,
  Button
} from '@chakra-ui/react';
import { GameState } from './types';

interface GameControlsProps {
  gameState: GameState;
  onResetGame: () => void;
  onCloseGame: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  gameState,
  onResetGame,
  onCloseGame
}) => {
  return (
    <Flex 
      position="absolute"
      top={4}
      right={4}
      direction={{ base: "column", md: "row" }} 
      justify="flex-end"
      align="center" 
      gap={2}
      bg="white"
      p={3}
      borderRadius="lg"
      boxShadow="md"
      fontFamily="'Comic Neue', sans-serif"
      width="auto"
      zIndex={10}
    >
      <HStack spacing={4}>
        <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color="blue.600">
          Score: {gameState.score}
        </Text>
      </HStack>
      
      {gameState.isGameComplete && (
        <HStack spacing={4} ml={4}>
          <Button 
            colorScheme="blue" 
            onClick={onResetGame}
            size={{ base: "sm", md: "md" }}
            fontFamily="'Comic Neue', sans-serif"
          >
            Play Again
          </Button>
          <Button 
            colorScheme="gray" 
            onClick={onCloseGame}
            size={{ base: "sm", md: "md" }}
            fontFamily="'Comic Neue', sans-serif"
          >
            Close Game
          </Button>
        </HStack>
      )}
    </Flex>
  );
};

export default GameControls; 