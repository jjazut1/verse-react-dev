import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  useToast,
  Heading,
  Center
} from '@chakra-ui/react';
import Scene from './Scene';
import { WhackAMoleConfig } from '../../../types/game';
import { useAuth } from '../../../contexts/AuthContext';
import { useHighScore } from '../../../hooks/useHighScore';
import { HighScoreModal } from '../../common/HighScoreModal';
import PWAGameHeader from '../PWAGameHeader';

interface WhackAMoleProps {
  playerName: string;
  onGameComplete: (score: number) => void;
  config: WhackAMoleConfig;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
}

const WhackAMole: React.FC<WhackAMoleProps> = ({
  playerName,
  onGameComplete,
  config,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
}) => {
  const { currentUser, isTeacher, isStudent } = useAuth();
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.gameTime);
  const [gameStarted, setGameStarted] = useState(false);
  const [consecutiveHits, setConsecutiveHits] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sceneRef = useRef<any>(null);
  const toast = useToast();

  // Initialize modularized high score system
  const {
    highScores,
    isNewHighScore,
    showHighScoreModal,
    setShowHighScoreModal,
    saveHighScore,
    isSubmittingScore
  } = useHighScore({
    gameType: 'whack-a-mole',
    configId: config.id || 'default',
    scoringSystem: 'points-based',
    enableRateLimit: true,
    onHighScoreProcessStart,
    onHighScoreProcessComplete
  });

  // Game countdown and timer logic
  useEffect(() => {
    if (gameStarted && timeLeft > 0 && !gameOver) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameStarted) {
      endGame();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, gameStarted, gameOver]);

  // Countdown logic
  useEffect(() => {
    if (showCountdown && countdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0 && showCountdown) {
      setShowCountdown(false);
      setGameStarted(true);
      setGameOver(false);
      if (sceneRef.current) {
        sceneRef.current.startGame();
      }
    }

    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [showCountdown, countdown]);

  const startCountdown = () => {
    // Reset game state
    setScore(0);
    setTimeLeft(config.gameTime);
    setConsecutiveHits(0);
    setGameOver(false);
    setGameStarted(false);
    setShowCountdown(true);
    setCountdown(3);
    
    if (sceneRef.current) {
      sceneRef.current.reset();
    }
  };

  const endGame = () => {
    setGameOver(true);
    setGameStarted(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (sceneRef.current) {
      sceneRef.current.reset();
    }
    onGameComplete(score);
    
    // Save high score using modularized system
    if (config.id && currentUser) {
      saveHighScore(score, playerName);
    } else if (!currentUser) {
      // Show completion modal without high score for unauthenticated users
      toast({
        title: 'Game Complete!',
        description: `Final Score: ${score} points. Sign in to save high scores!`,
        status: 'info',
        duration: 5000,
      });
    }
  };

  const handleMoleHit = (word: string, isCorrect: boolean) => {
    if (!gameStarted || gameOver) return;

    if (isCorrect) {
      // Calculate points including bonus if applicable
      const newConsecutiveHits = consecutiveHits + 1;
      let points = config.pointsPerHit;
      
      if (newConsecutiveHits >= config.bonusThreshold) {
        points += config.bonusPoints;
        toast({
          title: 'Bonus!',
          description: `+${config.bonusPoints} bonus points!`,
          status: 'success',
          duration: 1000,
        });
      }

      setScore(prev => prev + points);
      setConsecutiveHits(newConsecutiveHits);
    } else {
      // Apply penalty
      setScore(prev => Math.max(0, prev - config.penaltyPoints));
      setConsecutiveHits(0);
      toast({
        title: 'Oops!',
        description: `Wrong word! "${word}" -${config.penaltyPoints} points`,
        status: 'error',
        duration: 1000,
      });
    }
  };

  // Handle high score modal close with navigation
  const handleHighScoreModalClose = () => {
    setShowHighScoreModal(false);
    
    // Navigate based on user role
    if (isTeacher) {
      navigate('/teacher');
    } else if (isStudent) {
      navigate('/student');
    } else {
      navigate('/');
    }
  };

  return (
    <Box width="100%" height="100vh" position="relative">
      <PWAGameHeader gameTitle="Whack-a-Mole" variant="compact" />
      
      {/* Game UI */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        zIndex={1}
        p={4}
        display="flex"
        justifyContent="space-between"
      >
        {/* Title Display */}
        <Box 
          bg="transparent" 
          p={4} 
          borderRadius="md"
          maxWidth="400px"
        >
          <Text 
            fontSize="2xl" 
            fontWeight="bold" 
            color="#001f3f" 
            fontFamily="'Comic Neue', cursive" 
            textShadow="1px 1px 2px rgba(255,255,255,0.8)"
            isTruncated
          >
            {config.title}
          </Text>
        </Box>

        {/* Score and Timer */}
        <HStack 
          justify="space-between" 
          bg="transparent" 
          p={4} 
          borderRadius="md"
          width="300px"
        >
          <Text fontSize="2xl" fontWeight="bold" color="#001f3f" fontFamily="'Comic Neue', cursive" textShadow="1px 1px 2px rgba(255,255,255,0.8)">Score: {score}</Text>
          <Text fontSize="2xl" fontWeight="bold" color="#001f3f" fontFamily="'Comic Neue', cursive" textShadow="1px 1px 2px rgba(255,255,255,0.8)">Time: {timeLeft}s</Text>
        </HStack>
      </Box>

      {/* 3D Scene */}
      <Scene
        ref={sceneRef}
        onMoleHit={handleMoleHit}
        config={config}
        gameActive={gameStarted && !gameOver}
      />

      {/* Countdown Display */}
      {showCountdown && (
        <Center
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={10}
          bg="rgba(255, 255, 255, 0.95)"
          borderRadius="full"
          width="200px"
          height="200px"
          border="8px solid #001f3f"
          boxShadow="0 0 50px rgba(0, 31, 63, 0.3)"
        >
          <Text
            fontSize="8xl"
            fontWeight="bold"
            color="#001f3f"
            fontFamily="'Comic Neue', cursive"
            textShadow="2px 2px 4px rgba(255,255,255,0.8)"
            lineHeight="1"
          >
            {countdown}
          </Text>
        </Center>
      )}

      {/* Game Start/End Screen */}
      {(!gameStarted && !showCountdown || gameOver) && !showHighScoreModal && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={2}
          bg="white"
          p={6}
          borderRadius="md"
          boxShadow="xl"
          textAlign="center"
          fontFamily="'Comic Neue', cursive"
        >
          <VStack spacing={4}>
            <Heading size="lg" fontFamily="'Comic Neue', cursive">
              {gameOver ? 'Game Over!' : 'Whack-a-Mole'}
            </Heading>
            {!gameOver && (
              <VStack spacing={2}>
                {config.instructions ? (
                  <Text fontFamily="'Comic Neue', cursive">{config.instructions}</Text>
                ) : (
                  <>
                    <Text fontFamily="'Comic Neue', cursive">Select moles displaying words from {config.categories[0].title}!</Text>
                    <Text fontSize="sm" color="gray.600" fontFamily="'Comic Neue', cursive">
                      Words from {config.categories[0].title} will earn you points.
                      Other words will result in a penalty.
                    </Text>
                  </>
                )}
              </VStack>
            )}
            {gameOver && (
              <Text fontSize="xl" fontFamily="'Comic Neue', cursive">Final Score: {score}</Text>
            )}
            <Button
              colorScheme="blue"
              size="lg"
              onClick={startCountdown}
              fontFamily="'Comic Neue', cursive"
              fontWeight="bold"
            >
              {gameOver ? 'Play Again' : 'Start Game'}
            </Button>
          </VStack>
        </Box>
      )}

      {/* Modularized High Score Modal */}
      <HighScoreModal
        isOpen={showHighScoreModal}
        onClose={handleHighScoreModalClose}
        score={score}
        isNewHighScore={isNewHighScore}
        highScores={highScores}
        scoringSystem="points-based"
        gameTitle="Whack-a-Mole"
        additionalStats={[
          { label: 'Game Time', value: `${config.gameTime}s`, colorScheme: 'blue' },
          { label: 'Category', value: config.categories[0]?.title || 'Words', colorScheme: 'green' },
          { label: 'Max Consecutive', value: consecutiveHits, colorScheme: 'purple' }
        ]}
        isSubmittingScore={isSubmittingScore}
        onPlayAgain={startCountdown}
        customActions={[
          {
            label: 'Back to Dashboard',
            onClick: handleHighScoreModalClose,
            colorScheme: 'gray',
            variant: 'outline'
          }
        ]}
      />
    </Box>
  );
};

export default WhackAMole; 