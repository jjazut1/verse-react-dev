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
import { HighScoreModal } from './HighScoreModal';
import { formatTime } from './utils';

const SentenceSense: React.FC<SentenceSenseProps> = ({
  playerName,
  onGameComplete,
  config,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
}) => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  const gameLogic = useGameLogic(
    config as SentenceSenseConfig,
    playerName,
    onGameComplete,
    onHighScoreProcessStart,
    onHighScoreProcessComplete
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
    gameLogic.setShowHighScoreModal(false);
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
            enableHints={(config as SentenceSenseConfig).enableHints}
            correctFeedbackDuration={(config as SentenceSenseConfig).correctFeedbackDuration}
          />
        </Box>
      </VStack>

      {/* High Score Modal */}
      <HighScoreModal
        isOpen={gameLogic.showHighScoreModal}
        onClose={() => gameLogic.setShowHighScoreModal(false)}
        isNewHighScore={gameLogic.isNewHighScore}
        score={gameLogic.score}
        timeElapsed={gameLogic.timeElapsed}
        gameStats={gameLogic.gameStats}
        totalSentences={gameLogic.sentences.length}
        highScores={gameLogic.highScores}
        formatTime={formatTime}
        onPlayAgain={handlePlayAgain}
      />
    </Box>
  );
};

export default SentenceSense; 