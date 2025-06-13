import React from 'react';
import {
  Card,
  CardBody,
  VStack,
  HStack,
  Text,
  Progress,
  Badge,
  Box,
  useColorModeValue
} from '@chakra-ui/react';
import { GameStats } from './types';

interface GameHeaderProps {
  currentSentenceIndex: number;
  totalSentences: number;
  gameStats: GameStats;
  timeElapsed: number;
  formatTime: (seconds: number) => string;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  currentSentenceIndex,
  totalSentences,
  gameStats,
  timeElapsed,
  formatTime
}) => {
  const cardBg = useColorModeValue('white', 'gray.700');

  return (
    <Card w="full" bg={cardBg}>
      <CardBody p={4}>
        <VStack spacing={3}>
          <HStack w="full" justify="space-between">
            <Badge colorScheme="blue" variant="outline">
              Sentence {currentSentenceIndex + 1} of {totalSentences}
            </Badge>
            <Badge colorScheme="green" variant="outline">
              Misses: {gameStats.totalMisses}
            </Badge>
            <Badge colorScheme="orange" variant="outline">
              Time: {formatTime(timeElapsed)}
            </Badge>
          </HStack>
          
          <Box w="full">
            <Text fontSize="sm" mb={1} color="gray.600">Progress</Text>
            <Progress 
              value={(currentSentenceIndex / totalSentences) * 100} 
              colorScheme="blue" 
              size="md"
              borderRadius="full"
            />
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
}; 