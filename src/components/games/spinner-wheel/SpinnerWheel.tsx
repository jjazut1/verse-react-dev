import React from 'react';
import { Box, VStack, Heading, Center, Text } from '@chakra-ui/react';
import { SpinnerWheelProps } from './types';
import { useGameLogic } from './useGameLogic';
import { WheelRenderer } from './WheelRenderer';
import { ZoomedControls } from './ZoomedControls';
import { GameControls } from './GameControls';

const SpinnerWheel: React.FC<SpinnerWheelProps> = ({
  onGameComplete,
  config
}) => {
  const gameLogic = useGameLogic(onGameComplete, config);

  if (gameLogic.items.length === 0) {
    return (
      <Center p={8}>
        <Text>No items configured for this spinner wheel.</Text>
      </Center>
    );
  }

  return (
    <Box 
      position="fixed"
      top="0"
      left="0"
      w="100vw" 
      h="100vh" 
      bg="#E6F3FF" 
      display="flex"
      justifyContent="center"
      alignItems="center"
      zIndex={1}
      overflow="auto"
    >
      <Box 
        maxW="600px" 
        p={6} 
        fontFamily="'Comic Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
        bg="#E6F3FF" 
        borderRadius="xl"
        position="relative"
        marginTop="auto"
        marginBottom="auto"
      >
        <VStack spacing={6}>
          {/* Header - Only show when NOT zoomed */}
          {!gameLogic.isZoomed && (
            <VStack spacing={2} textAlign="center">
              <Heading size="lg" color="blue.600">
                🎡 {config.title || 'Spinner Wheel'}
              </Heading>
            </VStack>
          )}

          {/* Wheel Container */}
          <Box 
            bg="#E6F3FF" 
            p={6} 
            borderRadius="xl" 
            shadow={gameLogic.isZoomed ? "none" : "lg"} 
            position="relative"
          >
            <WheelRenderer
              items={gameLogic.items}
              rotation={gameLogic.rotation}
              isZoomed={gameLogic.isZoomed}
              zoomTarget={gameLogic.zoomTarget}
              spinning={gameLogic.spinning}
            />
            
            <ZoomedControls
              isZoomed={gameLogic.isZoomed}
              selected={gameLogic.selected}
              items={gameLogic.items}
              config={config}
              onZoomOut={gameLogic.handleZoomOut}
              onRemoveSelected={gameLogic.removeSelectedItem}
            />
          </Box>

          {/* Game Controls */}
          <GameControls
            isZoomed={gameLogic.isZoomed}
            spinning={gameLogic.spinning}
            gameComplete={gameLogic.gameComplete}
            itemsLength={gameLogic.items.length}
            spinCount={gameLogic.spinCount}
            onSpin={gameLogic.spin}
            onReset={gameLogic.resetGame}
          />
        </VStack>
      </Box>
    </Box>
  );
};

export default SpinnerWheel; 