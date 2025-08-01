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
  Center,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Tooltip
} from '@chakra-ui/react';
import Scene from './Scene';
import { WhackAMoleConfig } from '../../../types/game';
import { useAuth } from '../../../contexts/AuthContext';
import { useHighScore } from '../../../hooks/useHighScore';
import { HighScoreModal } from '../../common/HighScoreModal';
import PWAGameHeader from '../PWAGameHeader';
import { useWhackAMoleAudio } from './useWhackAMoleAudio';

interface WhackAMoleProps {
  playerName: string;
  onGameComplete: (score: number) => void;
  config: WhackAMoleConfig;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
}

// Simple CSS-based rotation icon
const RotationIcon: React.FC = () => {
  return (
    <Box
      width="60px"
      height="60px"
      borderRadius="8px"
      bg="white"
      color="#001f3f"
      display="flex"
      alignItems="center"
      justifyContent="center"
      position="relative"
      fontSize="2xl"
      fontWeight="bold"
      transform="rotate(90deg)"
      transition="transform 0.3s ease"
      _hover={{ transform: "rotate(90deg) scale(1.1)" }}
    >
      📱
      <Box
        position="absolute"
        top="-8px"
        right="-8px"
        width="20px"
        height="20px"
        borderRadius="full"
        bg="#007AFF"
        color="white"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="xs"
      >
        🔄
      </Box>
    </Box>
  );
};

// Rotation Prompt Component
const RotationPrompt: React.FC = () => {
  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="rgba(0, 31, 63, 0.95)"
      zIndex={9999}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Center>
        <VStack spacing={6} textAlign="center" color="white" p={8}>
          <Box
            bg="rgba(255, 255, 255, 0.1)"
            borderRadius="20px"
            p={6}
            boxShadow="0 0 30px rgba(255, 255, 255, 0.2)"
            border="2px solid rgba(255, 255, 255, 0.3)"
          >
            <RotationIcon />
          </Box>
          
          <VStack spacing={3}>
            <Heading 
              size="lg" 
              fontFamily="'Comic Neue', cursive"
              textShadow="1px 1px 2px rgba(0,0,0,0.3)"
            >
              Rotate Your Device
            </Heading>
            <Text 
              fontSize="lg" 
              fontFamily="'Comic Neue', cursive"
              textAlign="center"
              lineHeight="1.5"
            >
              For the best Whack-a-Mole experience,{'\n'}
              please rotate your device to landscape mode
            </Text>
            <Text 
              fontSize="md" 
              fontFamily="'Comic Neue', cursive"
              opacity={0.8}
              mt={2}
            >
              🔄 Turn your phone sideways
            </Text>
          </VStack>
        </VStack>
      </Center>
    </Box>
  );
};

// Hook to detect orientation
const useOrientation = () => {
  const [isLandscape, setIsLandscape] = useState(
    window.innerWidth > window.innerHeight
  );

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return isLandscape;
};

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
  
  // Check if device is in landscape orientation (moved after other state hooks)
  const isLandscape = useOrientation();

  // Initialize audio system
  const {
    playMolePopUpSound,
    playCorrectHitSound,
    playWrongHitSound,
    playBonusStreakSound,
    playCountdownTickSound,
    playGameStartSound,
    playGameEndSound,
    startBackgroundMusic,
    stopBackgroundMusic,
    isMuted,
    toggleMute,
    musicEnabled,
    toggleMusic,
    volume,
    setVolume
  } = useWhackAMoleAudio();

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
      // Play countdown tick sound
      playCountdownTickSound();
      
      countdownTimerRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0 && showCountdown) {
      setShowCountdown(false);
      setGameStarted(true);
      setGameOver(false);
      
      // Play game start sound and start background music
      playGameStartSound();
      startBackgroundMusic();
    }

    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [showCountdown, countdown, playCountdownTickSound, playGameStartSound, startBackgroundMusic]);

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
    
    // Stop background music and play game end sound
    stopBackgroundMusic();
    playGameEndSound();
    
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
      // Play correct hit sound
      playCorrectHitSound();
      
      // Calculate points including bonus if applicable
      const newConsecutiveHits = consecutiveHits + 1;
      let points = config.pointsPerHit;
      
      if (newConsecutiveHits >= config.bonusThreshold) {
        points += config.bonusPoints;
        
        // Play bonus streak sound for special achievements
        playBonusStreakSound();
        
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
      // Play wrong hit sound
      playWrongHitSound();
      
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

  // Show rotation prompt if not in landscape mode (moved to end after all hooks)
  if (!isLandscape) {
    return (
      <>
        <PWAGameHeader gameTitle="Whack-a-Mole" variant="compact" />
        <RotationPrompt />
      </>
    );
  }

  return (
    <Box width="100%" height="100vh" position="relative">
      <PWAGameHeader gameTitle="Whack-a-Mole" variant="compact" />
      
      {/* Game UI */}
      <Box
        position="absolute"
        top="60px" // Account for PWAGameHeader height
        left={0}
        right={0}
        zIndex={1000} // Higher z-index to ensure visibility above 3D scene
        p={4}
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        // Removed: bg, backdropFilter, borderRadius to eliminate banner effect
      >
        {/* Title Display */}
        <Box 
          bg="transparent" // Remove background
          p={2} 
          borderRadius="md"
          maxWidth="400px"
          // Removed: boxShadow
        >
          <Text 
            fontSize="xl" 
            fontWeight="bold" 
            color="#001f3f" 
            fontFamily="'Comic Neue', cursive" 
            textShadow="3px 3px 6px rgba(255,255,255,0.95)" // Stronger shadow for readability
            isTruncated
          >
            {config.title}
          </Text>
        </Box>

        {/* Right Side: Score/Timer + Audio Controls */}
        <VStack spacing={2} alignItems="flex-end">
          {/* Score and Timer */}
          <HStack 
            justify="space-between" 
            bg="transparent" // Remove background
            p={2} 
            borderRadius="md"
            width="320px"
            // Removed: boxShadow
            spacing={4}
          >
            <Text 
              fontSize="xl" 
              fontWeight="bold" 
              color="#001f3f" 
              fontFamily="'Comic Neue', cursive" 
              textShadow="3px 3px 6px rgba(255,255,255,0.95)" // Stronger shadow for readability
            >
              Score: {score}
            </Text>
            <Text 
              fontSize="xl" 
              fontWeight="bold" 
              color={timeLeft <= 10 ? "#dc2626" : "#001f3f"}
              fontFamily="'Comic Neue', cursive" 
              textShadow="3px 3px 6px rgba(255,255,255,0.95)" // Stronger shadow for readability
              sx={{
                animation: timeLeft <= 10 ? "pulse 1s ease-in-out infinite" : "none",
                "@keyframes pulse": {
                  "0%, 100%": { transform: "scale(1)", opacity: 1 },
                  "50%": { transform: "scale(1.1)", opacity: 0.8 }
                }
              }}
            >
              Time: {timeLeft}s
            </Text>
          </HStack>

          {/* Audio Controls - positioned under timer */}
          <HStack spacing={3} bg="rgba(255, 255, 255, 0.9)" borderRadius="xl" p={2}>
            <Button
              size="sm"
              onClick={toggleMute}
              color="#001f3f"
              _hover={{ bg: "rgba(0, 31, 63, 0.1)" }}
              bg="transparent"
              borderRadius="full"
              minW="32px"
              h="32px"
              p={0}
              fontSize="md"
            >
              {isMuted ? '🔇' : '🔊'}
            </Button>
            
            {/* Volume Slider */}
            <Box width="60px">
              <Tooltip label={`Volume: ${Math.round(volume * 100)}%`} placement="top">
                <Slider
                  aria-label="volume-slider"
                  value={volume}
                  onChange={(val) => setVolume(val)}
                  min={0}
                  max={1}
                  step={0.1}
                  size="sm"
                  isDisabled={isMuted}
                >
                  <SliderTrack bg="rgba(0, 31, 63, 0.2)">
                    <SliderFilledTrack bg="#001f3f" />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </Tooltip>
            </Box>
            
            {/* Music Toggle with Animated Bars */}
            <Button
              size="sm"
              onClick={toggleMusic}
              color="#001f3f"
              _hover={{ bg: "rgba(0, 31, 63, 0.1)" }}
              bg="transparent"
              borderRadius="full"
              minW="32px"
              h="32px"
              p={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Box display="flex" alignItems="end" gap="1px" height="16px">
                {/* Music bars that animate based on music state */}
                <Box
                  width="3px"
                  height="8px"
                  bg={musicEnabled ? "#001f3f" : "#ccc"}
                  borderRadius="1px"
                  opacity={musicEnabled ? 1 : 0.5}
                  transition="all 0.2s ease"
                  sx={musicEnabled ? {
                    animation: "musicBar1 1s ease-in-out infinite alternate",
                    "@keyframes musicBar1": {
                      "0%": { height: "8px" },
                      "100%": { height: "12px" }
                    }
                  } : {}}
                />
                <Box
                  width="3px"
                  height="12px"
                  bg={musicEnabled ? "#001f3f" : "#ccc"}
                  borderRadius="1px"
                  opacity={musicEnabled ? 1 : 0.5}
                  transition="all 0.2s ease"
                  sx={musicEnabled ? {
                    animation: "musicBar2 1s ease-in-out infinite alternate",
                    animationDelay: "0.2s",
                    "@keyframes musicBar2": {
                      "0%": { height: "12px" },
                      "100%": { height: "16px" }
                    }
                  } : {}}
                />
                <Box
                  width="3px"
                  height="6px"
                  bg={musicEnabled ? "#001f3f" : "#ccc"}
                  borderRadius="1px"
                  opacity={musicEnabled ? 1 : 0.5}
                  transition="all 0.2s ease"
                  sx={musicEnabled ? {
                    animation: "musicBar3 1s ease-in-out infinite alternate",
                    animationDelay: "0.4s",
                    "@keyframes musicBar3": {
                      "0%": { height: "6px" },
                      "100%": { height: "10px" }
                    }
                  } : {}}
                />
                <Box
                  width="3px"
                  height="10px"
                  bg={musicEnabled ? "#001f3f" : "#ccc"}
                  borderRadius="1px"
                  opacity={musicEnabled ? 1 : 0.5}
                  transition="all 0.2s ease"
                  sx={musicEnabled ? {
                    animation: "musicBar4 1s ease-in-out infinite alternate",
                    animationDelay: "0.6s",
                    "@keyframes musicBar4": {
                      "0%": { height: "10px" },
                      "100%": { height: "14px" }
                    }
                  } : {}}
                />
              </Box>
            </Button>
          </HStack>
        </VStack>
      </Box>

      {/* 3D Scene */}
      <Scene
        ref={sceneRef}
        onMoleHit={handleMoleHit}
        config={config}
        gameActive={gameStarted && !gameOver}
        onMolePopUp={playMolePopUpSound}
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