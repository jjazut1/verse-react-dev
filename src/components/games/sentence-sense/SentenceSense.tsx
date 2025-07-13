import React, { useMemo } from 'react';
import WordSentenceMode from '../anagram/WordSentenceMode';
import {
  Box,
  VStack,
  Center,
  Spinner,
  Text,
  useColorModeValue
} from '@chakra-ui/react';
import { SentenceSenseConfig } from '../../../types/game';
import { SentenceSenseProps } from './types';
import { useGameLogic } from './useGameLogic';
import { GameHeader } from './GameHeader';
import { formatTime } from './utils';
import PWAGameHeader from '../PWAGameHeader';

const SentenceSense: React.FC<SentenceSenseProps> = ({
  playerName,
  onGameComplete,
  config,
}) => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  const gameLogic = useGameLogic(
    config as SentenceSenseConfig,
    playerName,
    onGameComplete
  );

  // Memoize the sentence object to prevent unnecessary re-renders
  const memoizedSentence = useMemo(() => {
    if (!gameLogic.currentSentence) return null;
    return {
      id: gameLogic.currentSentence.id,
      original: gameLogic.currentSentence.original,
      definition: gameLogic.currentSentence.definition
    };
  }, [
    gameLogic.currentSentence?.id,
    gameLogic.currentSentence?.original,
    gameLogic.currentSentence?.definition
  ]);

  const handlePlayAgain = () => {
    // Reload the page to start a fresh game
    window.location.reload();
  };

  if (!gameLogic.currentSentence) {
    return (
      <Box minH="100vh" bg={bgColor}>
        <Center h="100vh">
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" thickness="4px" />
            <Text color="gray.600">Loading sentence...</Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={bgColor} p={4}>
      <VStack spacing={6} maxW="4xl" mx="auto">
        {/* PWA Navigation Header */}
        <PWAGameHeader 
          gameTitle="Sentence Sense"
          variant="compact"
        />
        
        {/* Game Header */}
        <GameHeader
          currentSentenceIndex={gameLogic.currentSentenceIndex}
          totalSentences={gameLogic.sentences.length}
          gameStats={gameLogic.gameStats}
          timeElapsed={gameLogic.timeElapsed}
          formatTime={formatTime}
        />

        {/* Main Sentence Arrangement */}
        <Box w="full">
          <WordSentenceMode
            anagram={memoizedSentence!}
            onComplete={gameLogic.handleSentenceComplete}
            onHintUsed={gameLogic.handleHintUsed}
            showDefinition={false}
            enableHints={(config as SentenceSenseConfig).showHints}
            enableTextToSpeech={(config as SentenceSenseConfig).enableTextToSpeech}
          />
        </Box>
      </VStack>

      {/* High Score Modal */}
      {/* The HighScoreModal component is no longer imported, so this block is removed. */}
    </Box>
  );
};

export default SentenceSense; 