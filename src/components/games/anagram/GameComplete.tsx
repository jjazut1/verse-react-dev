import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Grid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Center,
  useColorModeValue
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { GameState } from './types';

interface GameCompleteProps {
  gameState: GameState;
  formatTime: (seconds: number) => string;
  onResetGame: () => void;
}

const GameComplete: React.FC<GameCompleteProps> = ({ 
  gameState, 
  formatTime, 
  onResetGame 
}) => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.700');

  return (
    <Box minH="100vh" bg={bgColor} p={6}>
      <Center>
        <Card maxW="lg" w="full" bg={cardBg}>
          <CardHeader textAlign="center">
            <Heading size="xl" color="green.500" mb={2} fontFamily="'Comic Neue', sans-serif">
              🎉 Game Complete!
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={6}>
              <Grid templateColumns="1fr 1fr" gap={6} w="full">
                <Stat textAlign="center">
                  <StatLabel fontFamily="'Comic Neue', sans-serif">Total Misses</StatLabel>
                  <StatNumber color="purple.500" fontSize="3xl" fontFamily="'Comic Neue', sans-serif">
                    {gameState.score}
                  </StatNumber>
                  <StatHelpText fontFamily="'Comic Neue', sans-serif">Fewer misses = better score!</StatHelpText>
                </Stat>
                <Stat textAlign="center">
                  <StatLabel fontFamily="'Comic Neue', sans-serif">Time</StatLabel>
                  <StatNumber color="orange.500" fontSize="3xl" fontFamily="'Comic Neue', sans-serif">
                    {formatTime(gameState.timeElapsed)}
                  </StatNumber>
                  <StatHelpText fontFamily="'Comic Neue', sans-serif">Total time</StatHelpText>
                </Stat>
              </Grid>

              <Grid templateColumns="1fr 1fr" gap={6} w="full">
                <Stat textAlign="center">
                  <StatLabel fontFamily="'Comic Neue', sans-serif">Correct</StatLabel>
                  <StatNumber color="green.500" fontSize="2xl" fontFamily="'Comic Neue', sans-serif">
                    {gameState.gameStats.correctAnswers} / {gameState.anagrams.length}
                  </StatNumber>
                  <StatHelpText fontFamily="'Comic Neue', sans-serif">Words solved</StatHelpText>
                </Stat>
                <Stat textAlign="center">
                  <StatLabel fontFamily="'Comic Neue', sans-serif">Accuracy</StatLabel>
                  <StatNumber color="blue.500" fontSize="2xl" fontFamily="'Comic Neue', sans-serif">
                    {gameState.gameStats.totalMisses + gameState.gameStats.correctAnswers > 0 
                      ? Math.round((gameState.gameStats.correctAnswers / (gameState.gameStats.totalMisses + gameState.gameStats.correctAnswers)) * 100) 
                      : 100}%
                  </StatNumber>
                  <StatHelpText fontFamily="'Comic Neue', sans-serif">Success rate</StatHelpText>
                </Stat>
              </Grid>

              <HStack spacing={4} w="full" justify="center">
                <Button
                  onClick={onResetGame}
                  colorScheme="purple"
                  size="lg"
                  leftIcon={<RepeatIcon />}
                  fontFamily="'Comic Neue', sans-serif"
                >
                  Play Again
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </Center>
    </Box>
  );
};

export default GameComplete; 