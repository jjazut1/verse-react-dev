import React from 'react';
import {
  Flex,
  Heading,
  HStack,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import { GameStats } from './types';

interface GameHeaderProps {
  playerName: string;
  gameStats: GameStats;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  playerName,
  gameStats,
}) => {
  const headingSize = useBreakpointValue({ base: "sm", md: "md", lg: "lg" });

  return (
    <Flex 
      direction={{ base: "column", md: "row" }} 
      justify="space-between" 
      align={{ base: "center", md: "center" }}
      gap={2}
    >
      <Heading size={headingSize}>Syllable Egg Hunt</Heading>
      <HStack spacing={4}>
        <Text fontSize={{ base: "sm", md: "md" }}>Player: {playerName}</Text>
        <Text fontSize={{ base: "sm", md: "md" }}>Score: {gameStats.score}</Text>
        <Text fontSize={{ base: "sm", md: "md" }}>
          Eggs: {gameStats.crackedEggs}/{gameStats.totalEggs}
        </Text>
      </HStack>
    </Flex>
  );
}; 