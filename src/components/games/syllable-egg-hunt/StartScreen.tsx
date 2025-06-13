import React from 'react';
import {
  VStack,
  Heading,
  Text,
  Button,
} from '@chakra-ui/react';

interface StartScreenProps {
  playerName: string;
  onStartGame: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  playerName,
  onStartGame,
}) => {
  return (
    <VStack spacing={6} align="center" justify="center" height="600px">
      <Heading>Syllable Egg Hunt</Heading>
      <Text>Welcome, {playerName}!</Text>
      <Text>Find eggs, crack them open, and sort the words by their syllable count.</Text>
      <Button colorScheme="blue" onClick={onStartGame}>
        Start Game
      </Button>
    </VStack>
  );
}; 