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
      top={2} // Reduced top spacing
      right={2} // Reduced right spacing
      direction={{ base: "column", md: "row" }} 
      justify="flex-end"
      align="center" 
      gap={2}
      bg="white"
      p={2} // Reduced padding
      borderRadius="lg"
      boxShadow="md"
      fontFamily="'Comic Neue', sans-serif"
      width="auto"
      zIndex={10}
      fontSize="sm" // Smaller font size for compactness
    >
      <HStack spacing={3}> {/* Reduced spacing */}
        <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color="blue.600">
          Score: {gameState.score}
        </Text>
      </HStack>
      
      {gameState.isGameComplete && (
        <HStack spacing={2} ml={2}> {/* Reduced spacing and margin */}
          <Button 
            colorScheme="blue" 
            onClick={onResetGame}
            size="sm" // Always use small size for compactness
            fontFamily="'Comic Neue', sans-serif"
          >
            Play Again
          </Button>
          <Button 
            colorScheme="gray" 
            onClick={onCloseGame}
            size="sm" // Always use small size for compactness
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