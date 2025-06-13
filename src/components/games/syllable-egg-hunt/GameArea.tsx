import React from 'react';
import {
  Box,
  Flex,
  Text,
  useBreakpointValue,
  ResponsiveValue,
} from '@chakra-ui/react';
import { Egg, Basket, Word } from './types';

interface GameAreaProps {
  eggs: Egg[];
  crackedEggs: string[];
  baskets: Basket[];
  selectedWord: Word | null;
  onEggClick: (eggId: string) => void;
  onBasketClick: (basketId: string) => void;
}

export const GameArea: React.FC<GameAreaProps> = ({
  eggs,
  crackedEggs,
  baskets,
  selectedWord,
  onEggClick,
  onBasketClick,
}) => {
  // Responsive values
  const gameHeight = useBreakpointValue({ base: "400px", md: "500px", lg: "600px" });
  const basketMinWidth = useBreakpointValue({ base: "100px", md: "120px", lg: "150px" });
  const eggSize = useBreakpointValue({ base: "30px", md: "40px", lg: "50px" });
  const eggHeight = useBreakpointValue({ base: "40px", md: "50px", lg: "60px" });
  const crackedEggMinWidth = useBreakpointValue({ base: "50px", md: "60px", lg: "70px" });
  const basketStackDirection = useBreakpointValue({ base: "column", md: "row" }) as ResponsiveValue<"column" | "row">;

  return (
    <>
      {/* Eggs Area */}
      <Box position="relative" flex="1" borderWidth="1px" borderRadius="md" overflow="hidden">
        {eggs.map((egg) => (
          <Box
            key={egg.id}
            position="absolute"
            left={`${egg.position.x}%`}
            top={`${egg.position.y}%`}
            transform="translate(-50%, -50%)"
            cursor="pointer"
            onClick={() => onEggClick(egg.id)}
            zIndex={crackedEggs.includes(egg.id) ? 1 : 2}
          >
            {crackedEggs.includes(egg.id) ? (
              <Box
                p={2}
                bg="yellow.100"
                borderRadius="full"
                borderWidth="2px"
                borderColor="yellow.400"
                textAlign="center"
                minWidth={crackedEggMinWidth}
              >
                <Text fontWeight="bold" fontSize={{ base: "xs", md: "sm", lg: "md" }}>
                  {egg.word.text}
                </Text>
              </Box>
            ) : (
              <Box
                w={eggSize}
                h={eggHeight}
                bg="white"
                borderRadius="full"
                borderWidth="2px"
                borderColor="gray.300"
                boxShadow="md"
              />
            )}
          </Box>
        ))}
      </Box>
      
      {/* Baskets */}
      <Flex 
        direction={basketStackDirection} 
        justify="center" 
        mt={4}
        gap={3}
        flexWrap="wrap"
      >
        {baskets.map((basket) => (
          <Box
            key={basket.id}
            p={3}
            borderWidth="2px"
            borderColor={selectedWord && selectedWord.syllables === basket.syllableCount ? "green.500" : "gray.300"}
            borderRadius="lg"
            cursor="pointer"
            onClick={() => onBasketClick(basket.id)}
            minWidth={basketMinWidth}
            textAlign="center"
            flex="1"
            maxW={{ base: "100%", md: "150px" }}
          >
            <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }}>
              {basket.syllableCount} {basket.syllableCount === 1 ? 'Syllable' : 'Syllables'}
            </Text>
            <Box mt={2} minHeight="60px">
              {basket.words.map((word) => (
                <Text key={word.id} fontSize={{ base: "xs", md: "sm" }}>{word.text}</Text>
              ))}
            </Box>
          </Box>
        ))}
      </Flex>
    </>
  );
}; 