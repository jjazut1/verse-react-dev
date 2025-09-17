import React from 'react';
import { Box, VStack, Heading, Center, Text, useBreakpointValue, Button } from '@chakra-ui/react';
import { SpinnerWheelProps } from './types';
import { useGameLogic } from './useGameLogic';
import { WheelRenderer } from './WheelRenderer';
import { ZoomedControls } from './ZoomedControls';
import { GameControls } from './GameControls';
import PWAGameHeader from '../PWAGameHeader';
import { useNavigate } from 'react-router-dom';

const SpinnerWheel: React.FC<SpinnerWheelProps> = ({
  onGameComplete,
  config
}) => {
  const gameLogic = useGameLogic(onGameComplete, config);
  const navigate = useNavigate();
  
  // Responsive values for different screen sizes
  const wheelSize = useBreakpointValue({ 
    base: 280, // Mobile: 280px
    sm: 320,   // Small tablet: 320px  
    md: 400,   // Medium: 400px
    lg: 480    // Large: 480px (original size)
  });
  
  const containerPadding = useBreakpointValue({
    base: 2,   // Mobile: minimal padding
    sm: 4,     // Small: some padding
    md: 6,     // Medium: normal padding
    lg: 6      // Large: normal padding
  });
  
  const headingSize = useBreakpointValue({
    base: "md",
    sm: "lg", 
    md: "lg",
    lg: "lg"
  });

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
      flexDirection="column"
      zIndex={1}
      overflow={gameLogic.isZoomed ? "visible" : "auto"} // Allow overflow when zoomed for proper centering
    >
      <PWAGameHeader gameTitle="Spinner Wheel" variant="compact" />

      {/* Persistent Home button overlay (visible in both zoom states) */}
      <Box position="fixed" top={{ base: '60px', md: '64px' }} left={{ base: 2, md: 4 }} zIndex={2000}>
        <Button size="sm" colorScheme="blue" borderRadius="full" onClick={() => { navigate('/student'); window.scrollTo(0, 0); }}>
          🏠 Home
        </Button>
      </Box>
      
      <Box
        flex="1"
        display="flex"
        justifyContent="center"
        alignItems="center"
        p={{ base: 2, sm: 4, md: 6 }}
        overflow="hidden"
      >
        <Box 
          w="100%"
          maxW={{ base: "100%", sm: "90%", md: "600px" }}
          fontFamily="'Comic Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
          bg="#E6F3FF" 
          borderRadius={{ base: "lg", md: "xl" }}
          position="relative"
          display="flex"
          flexDirection="column"
          alignItems="center"
          minH="0" // Allow flex shrinking
        >
          <VStack spacing={{ base: 3, sm: 4, md: 6 }} w="100%" align="center">
            {/* Header - Only show when NOT zoomed */}
            {!gameLogic.isZoomed && (
              <VStack spacing={2} textAlign="center">
                <Heading size={headingSize} color="blue.600">
                  🎡 {config.title || 'Spinner Wheel'}
                </Heading>
              </VStack>
            )}

            {/* Wheel Container */}
            <Box 
              bg="#E6F3FF" 
              p={containerPadding} 
              borderRadius={{ base: "lg", md: "xl" }}
              shadow={gameLogic.isZoomed ? "none" : "lg"} 
              position="relative"
              w="100%"
              display="flex"
              justifyContent="center"
              alignItems="center"
              overflow="visible" // Always allow overflow for zoom
              // Adjust container for zoom state
              zIndex={gameLogic.isZoomed ? 999 : 1}
            >
              <WheelRenderer
                items={gameLogic.items}
                rotation={gameLogic.rotation}
                isZoomed={gameLogic.isZoomed}
                zoomTarget={gameLogic.zoomTarget}
                spinning={gameLogic.spinning}
                wheelSize={wheelSize} // Pass responsive wheel size
              />
              
              <ZoomedControls
                isZoomed={gameLogic.isZoomed}
                selected={gameLogic.selected}
                items={gameLogic.items}
                config={config}
                onZoomOut={gameLogic.handleZoomOut}
                onRemoveSelected={gameLogic.removeSelectedItem}
                wheelSize={wheelSize} // Pass wheel size for proper positioning
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
    </Box>
  );
};

export default SpinnerWheel; 