import React from 'react';
import {
  Box,
  Flex,
  useBreakpointValue,
  ResponsiveValue
} from '@chakra-ui/react';
import { GameState, Word } from './types';
import Egg from './Egg';
import Basket from './Basket';
import RichText from './RichText';

interface GameAreaProps {
  gameState: GameState;
  gameAreaRef: React.RefObject<HTMLDivElement>;
  onMouseMove: (event: React.MouseEvent) => void;
  onGameAreaClick: (event: React.MouseEvent) => void;
  onEggClick: (egg: any) => void;
  onWordClick: (word: Word, e: React.MouseEvent) => void;
}

const GameArea: React.FC<GameAreaProps> = ({
  gameState,
  gameAreaRef,
  onMouseMove,
  onGameAreaClick,
  onEggClick,
  onWordClick
}) => {
  // Responsive values
  const containerPadding = useBreakpointValue({ base: 2, md: 3, lg: 4 });
  const gameHeight = useBreakpointValue({ base: "300px", md: "400px", lg: "450px" });
  const basketStackDirection = useBreakpointValue({ base: "column", md: "row" }) as ResponsiveValue<"column" | "row">;
  const eggSize = useBreakpointValue({ base: "45px", md: "50px", lg: "55px" });
  const basketWidth = useBreakpointValue({ base: "120px", md: "140px", lg: "160px" });
  const basketSpacing = useBreakpointValue({ base: 2, md: 3, lg: 4 });

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
        maxW="1400px"
        mx="auto"
        px={containerPadding}
        py={4}
      >
        <Box
          ref={gameAreaRef}
          position="relative"
          width="100%"
          height={gameHeight}
          bg="blue.100"
          borderRadius="lg"
          overflow="hidden"
          onMouseMove={onMouseMove}
          onClick={onGameAreaClick}
          cursor={gameState.isWordSelected ? "pointer" : "default"}
          boxShadow="lg"
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
              <Egg
                onClick={() => onEggClick(egg)}
                item={egg.word.text}
                category={egg.word.category}
                cracked={egg.cracked}
                onWordClick={(item, category, e) => onWordClick({ text: item, category }, e as React.MouseEvent)}
              />
            </Box>
          ))}
          
          {/* Baskets */}
          <Flex
            position="absolute"
            bottom="10px"
            left="0"
            right="0"
            direction={basketStackDirection}
            justify="center"
            align="center"
            px={basketSpacing}
            gap={basketSpacing}
          >
            {gameState.baskets.map((basket) => (
              <Box 
                key={basket.id}
                width={basketWidth}
                mb={{ base: 2, md: 0 }}
                flex={{ base: "1", md: "0 1 auto" }}
                className={`basket-${basket.id}`}
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