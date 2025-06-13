import React from 'react';
import {
  Box,
  HStack,
  Text,
  Progress,
  Badge,
  Card,
  CardBody,
  useColorModeValue
} from '@chakra-ui/react';
import { GameState } from './types';

interface GameHeaderProps {
  gameState: GameState;
  formatTime: (seconds: number) => string;
}

const GameHeader: React.FC<GameHeaderProps> = ({ gameState, formatTime }) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const currentAnagram = gameState.anagrams[gameState.currentAnagramIndex];
  const progress = ((gameState.currentAnagramIndex + (currentAnagram?.isCompleted ? 1 : 0)) / gameState.anagrams.length) * 100;

  return (
    <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" mb={6}>
      <CardBody>
        <HStack justify="space-between" mb={4}>
          <Text fontSize="lg" fontWeight="bold">
            Anagram {gameState.currentAnagramIndex + 1} of {gameState.anagrams.length}
          </Text>
          <HStack spacing={4}>
            <Badge colorScheme="blue" fontSize="sm">
              Time: {formatTime(gameState.timeElapsed)}
            </Badge>
            <Badge colorScheme="red" fontSize="sm">
              Misses: {gameState.gameStats.totalMisses}
            </Badge>
            <Badge colorScheme="green" fontSize="sm">
              Correct: {gameState.gameStats.correctAnswers}
            </Badge>
            {gameState.gameStats.hintsUsed > 0 && (
              <Badge colorScheme="orange" fontSize="sm">
                Hints: {gameState.gameStats.hintsUsed}
              </Badge>
            )}
          </HStack>
        </HStack>
        <Progress 
          value={progress} 
          colorScheme="green" 
          size="lg" 
          borderRadius="md"
        />
      </CardBody>
    </Card>
  );
};

export default GameHeader; 