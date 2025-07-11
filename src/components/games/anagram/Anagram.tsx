import React from 'react';
import { Box } from '@chakra-ui/react';
import { AnagramProps } from './types';
import { useGameLogic } from './useGameLogic';
import StartScreen from './StartScreen';
import GameArea from './GameArea';
import GameComplete from './GameComplete';
import PWAGameHeader from '../PWAGameHeader';
import { HighScoreModal } from '../../common/HighScoreModal';
import './WordSentenceMode.css';

const Anagram: React.FC<AnagramProps> = ({
  playerName,
  onGameComplete,
  config,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
}) => {
  const gameLogic = useGameLogic(
    config,
    playerName,
    onGameComplete,
    onHighScoreProcessStart,
    onHighScoreProcessComplete
  );

  const { gameState, highScoreSystem } = gameLogic;

  if (!gameState.gameStarted) {
    return (
      <Box w="100vw" h="100vh" overflow="hidden">
        <PWAGameHeader gameTitle="Anagram" variant="compact" />
        <StartScreen config={config} onStartGame={gameLogic.startGame} />
      </Box>
    );
  }

  if (gameState.gameCompleted) {
    return (
      <Box w="100vw" h="100vh" overflow="hidden">
        <PWAGameHeader gameTitle="Anagram" variant="compact" />
        <GameComplete 
          gameState={gameState} 
          onResetGame={gameLogic.resetGame}
          formatTime={gameLogic.formatTime}
        />
        
        {/* Use the new unified HighScoreModal */}
        <HighScoreModal
          isOpen={highScoreSystem.showHighScoreModal}
          onClose={gameLogic.closeHighScoreModal}
          score={gameState.score}
          isNewHighScore={highScoreSystem.isNewHighScore}
          highScores={highScoreSystem.highScores}
          scoringSystem="miss-based"
          gameTitle="Anagram"
          timeElapsed={gameState.timeElapsed}
          additionalStats={[
            { label: 'Correct Answers', value: gameState.gameStats.correctAnswers, colorScheme: 'green' },
            { label: 'Hints Used', value: gameState.gameStats.hintsUsed, colorScheme: 'yellow' },
          ]}
          isLoading={highScoreSystem.isLoading}
          isSubmittingScore={highScoreSystem.isSubmittingScore}
          error={highScoreSystem.error}
          onClearError={highScoreSystem.clearError}
          onPlayAgain={gameLogic.resetGame}
        />
      </Box>
    );
  }

  return (
    <Box w="100vw" h="100vh" overflow="hidden">
      <PWAGameHeader gameTitle="Anagram" variant="compact" />
      <GameArea 
        gameState={gameState}
        config={config}
        onLetterClick={gameLogic.handleLetterClick}
        onUseHint={gameLogic.useHint}
        onToggleDefinition={gameLogic.toggleDefinition}
      />
    </Box>
  );
};

export default Anagram; 