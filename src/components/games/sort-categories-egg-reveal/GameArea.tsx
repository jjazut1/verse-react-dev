import React from 'react';
import {
  Box,
  Flex,
  useBreakpointValue,
  ResponsiveValue
} from '@chakra-ui/react';
import { GameState, EggType, Word } from './types';
import Container from './Egg';
import Basket from './Basket';
import RichText from './RichText';

interface GameAreaProps {
  gameState: GameState;
  gameAreaRef: React.RefObject<HTMLDivElement>;
  onMouseMove: (event: React.MouseEvent) => void;
  onGameAreaClick: (event: React.MouseEvent) => void;
  onEggClick: (egg: EggType) => void;
  onWordClick: (word: Word, e: React.MouseEvent) => void;
  enableTextToSpeech?: boolean;
  usePhonicsMode?: boolean;
  useAmazonPolly?: boolean;
  textToSpeechMode?: string;
  containerType?: string;
  soundEnabled?: boolean;
}

const GameArea: React.FC<GameAreaProps> = ({
  gameState,
  gameAreaRef,
  onMouseMove,
  onGameAreaClick,
  onEggClick,
  onWordClick,
  enableTextToSpeech = false,
  usePhonicsMode = false,
  useAmazonPolly = false,
  textToSpeechMode,
  containerType = 'eggs',
  soundEnabled = true
}) => {
  // Enhanced responsive values for better landscape support
  const containerPadding = useBreakpointValue({ base: 1, md: 2, lg: 3 });
  
  // Better responsive game height for landscape devices
  const gameHeight = useBreakpointValue({ 
    base: "calc(100vh - 140px)", // Mobile: account for header + some margin
    md: "calc(100vh - 160px)",   // Tablet: account for header + controls
    lg: "calc(100vh - 180px)"    // Desktop: account for header + controls + margin
  });
  
  const basketStackDirection = useBreakpointValue({ base: "column", md: "row" }) as ResponsiveValue<"column" | "row">;
  
  // Responsive egg/container sizing
  const eggSize = useBreakpointValue({ base: "35px", md: "45px", lg: "55px" });
  
  const basketSpacing = useBreakpointValue({ base: 1, md: 2, lg: 3 });

  // Compute responsive basket width so all baskets fit within the game area width
  const numBaskets = Math.max(1, gameState.baskets.length);
  // Chakra spacing unit is 4px by default
  const spacingUnit = typeof basketSpacing === 'number' ? basketSpacing : 2;
  const pxPerUnit = 4;
  const gapPx = spacingUnit * pxPerUnit; // gap between baskets in pixels
  const sidePaddingPx = spacingUnit * pxPerUnit; // horizontal padding of the Flex container
  const basketWidthCalc = `calc((100% - ${(numBaskets - 1) * gapPx}px - ${2 * sidePaddingPx}px) / ${numBaskets})`;

  return (
    <Box 
      width="100vw" 
      maxWidth="100%" 
      position="relative"
      left="50%"
      transform="translateX(-50%)"
      bg="blue.50"
    >
      <Box
        width="100%"
        maxW="1600px" // Increased max width for better landscape support
        mx="auto"
        px={containerPadding}
        py={2} // Reduced padding for more space
      >
        <Box
          ref={gameAreaRef}
          position="relative"
          width="100%"
          height={gameHeight} // Use responsive height
          bg="blue.100"
          borderRadius="lg"
          overflow="hidden"
          onMouseMove={onMouseMove}
          onClick={onGameAreaClick}
          cursor={gameState.isWordSelected ? "pointer" : "default"}
          boxShadow="lg"
          minHeight="400px" // Ensure minimum playable height
        >
          {/* Game area background pattern */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            opacity={0.1}
            backgroundImage="radial-gradient(circle at 1px 1px, gray 1px, transparent 0)"
            backgroundSize="40px 40px"
          />
          
          {/* Eggs */}
          {gameState.eggs.map((egg) => (
            <Box
              key={egg.id}
              position="absolute"
              left={`${egg.position.x}%`}
              top={`${egg.position.y}%`}
              transform="translate(-50%, -50%)"
              width={eggSize}
              height={eggSize}
              zIndex={egg.cracked ? 2 : 1}
            >
              <Container
                onClick={() => onEggClick(egg)}
                item={egg.word.text}
                category={egg.word.category}
                cracked={egg.cracked}
                onWordClick={(item: string, category: string, e: React.MouseEvent) => onWordClick({ text: item, category }, e as React.MouseEvent)}
                enableTextToSpeech={enableTextToSpeech}
                usePhonicsMode={usePhonicsMode}
                useAmazonPolly={useAmazonPolly}
                textToSpeechMode={textToSpeechMode}
                containerType={containerType}
                soundEnabled={soundEnabled}
              />
            </Box>
          ))}
          
          {/* Baskets - positioned at bottom within game area for working drag/drop */}
          <Flex
            position="absolute"
            bottom="4px" // Reduced bottom spacing for more space
            left="0"
            right="0"
            direction={basketStackDirection}
            justify="center"
            align="center"
            px={basketSpacing}
            gap={basketSpacing}
            flexWrap="nowrap" // Force a single row and compute widths to fit
            maxHeight="28%" // Slightly reduced height for more game space
          >
            {gameState.baskets.map((basket) => (
              <Box 
                key={basket.id}
                width={basketWidthCalc}
                minWidth="0"
                mb={{ base: 1, md: 0 }} // Reduced margin
                flex={{ base: "1", md: "0 1 auto" }}
                className={`basket basket-${basket.id}`} // Keep both classes for compatibility
                data-basket-id={basket.name} // Keep data attribute for click detection
              >
                <Basket
                  category={{ name: basket.name }}
                  items={basket.items.map(item => item.text)}
                  onClick={() => {}}
                />
              </Box>
            ))}
          </Flex>
          
          {/* Dragged word */}
          {gameState.isWordSelected && gameState.selectedWord && (
            <Box
              position="absolute"
              left={`${gameState.ghostPosition.x}px`}
              top={`${gameState.ghostPosition.y}px`}
              transform="translate(-50%, -50%)"
              pointerEvents="none"
              zIndex={1000}
              bg="white"
              borderRadius="md"
              boxShadow="lg"
              p={2}
            >
              <RichText 
                content={gameState.selectedWord.text} 
                fontSize={{ base: "sm", md: "md" }}
                noPadding
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default GameArea; 