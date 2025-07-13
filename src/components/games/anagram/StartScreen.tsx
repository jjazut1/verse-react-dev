import React from 'react';
import {
  Box,
  VStack,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Center,
  useColorModeValue
} from '@chakra-ui/react';
import { AnagramConfig } from '../../../types/game';

interface StartScreenProps {
  config: AnagramConfig;
  onStartGame: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ config, onStartGame }) => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.700');

  return (
    <Box minH="100vh" bg={bgColor} p={6}>
      <Center>
        <Card maxW="lg" w="full" bg={cardBg}>
          <CardHeader textAlign="center">
            <Heading size="xl" color="purple.500" mb={2} fontFamily="'Comic Neue', sans-serif">
              🔤 Anagram Challenge
            </Heading>
            <Text color="gray.600" fontSize="lg" fontFamily="'Comic Neue', sans-serif">
              Unscramble the letters to form words!
            </Text>
          </CardHeader>
          <CardBody>
            <VStack spacing={6}>
              <VStack spacing={3} textAlign="center">
                <Text fontSize="md" color="gray.700" fontFamily="'Comic Neue', sans-serif">
                  <strong>How to Play:</strong>
                </Text>
                <VStack spacing={2} align="start" fontSize="sm" color="gray.600">
                  <Text fontFamily="'Comic Neue', sans-serif">• Click letters in the correct order to spell the word</Text>
                  <Text fontFamily="'Comic Neue', sans-serif">• Letters must be placed sequentially from left to right</Text>
                  <Text fontFamily="'Comic Neue', sans-serif">• Click answer letters to move them back to scrambled area</Text>
                  <Text fontFamily="'Comic Neue', sans-serif">• Use hints and definitions if available</Text>
                  <Text fontFamily="'Comic Neue', sans-serif">• Fewer misses = better score!</Text>
                </VStack>
              </VStack>

              <VStack spacing={2} textAlign="center">
                <Text fontSize="sm" color="gray.600" fontFamily="'Comic Neue', sans-serif">
                  <strong>Game Settings:</strong>
                </Text>
                <Text fontSize="sm" color="gray.600" fontFamily="'Comic Neue', sans-serif">
                  Words: {config.anagrams.length} | 
                  Shuffle: {config.shuffleIntensity} | 
                  Hints: {config.enableHints ? 'Enabled' : 'Disabled'}
                </Text>
              </VStack>

              <Button
                onClick={onStartGame}
                colorScheme="purple"
                size="lg"
                w="full"
                fontSize="lg"
                fontFamily="'Comic Neue', sans-serif"
              >
                Start Game
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </Center>
    </Box>
  );
};

export default StartScreen; 