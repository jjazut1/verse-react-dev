import React from 'react';
import { 
  VStack, 
  Button, 
  Text 
} from '@chakra-ui/react';

interface GameControlsProps {
  isZoomed: boolean;
  spinning: boolean;
  gameComplete: boolean;
  itemsLength: number;
  spinCount: number;
  onSpin: () => void;
  onReset: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  isZoomed,
  spinning,
  gameComplete,
  itemsLength,
  spinCount,
  onSpin,
  onReset
}) => {
  // Only show controls when NOT zoomed
  if (isZoomed) return null;

  return (
    <VStack spacing={4} align="center" justify="center" w="100%">
      {/* Spin Button */}
      <Button
        onClick={onSpin}
        isDisabled={spinning || itemsLength < 2 || gameComplete}
        bg="#F5F5DC"
        color="#8B4513"
        _hover={{ bg: "#F0E68C" }}
        _active={{ bg: "#DDD6C1" }}
        size="lg"
        fontSize="xl"
        px={8}
        py={6}
        isLoading={spinning}
        loadingText="SPINNING..."
      >
        🎯 SPIN THE WHEEL!
      </Button>

      {gameComplete && (
        <VStack spacing={2}>
          <Text fontSize="lg" fontWeight="bold" color="blue.600">
            Game Complete! 🎊
          </Text>
          <Text>Total spins: {spinCount}</Text>
          <Button onClick={onReset} colorScheme="blue" variant="outline">
            🔄 Play Again
          </Button>
        </VStack>
      )}
    </VStack>
  );
}; 