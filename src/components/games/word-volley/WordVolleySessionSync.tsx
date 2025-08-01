import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, VStack, HStack, Text, Badge, Button, Alert, AlertIcon } from '@chakra-ui/react';
import { useAuth } from '../../../contexts/AuthContext';
import { SessionManager } from './SessionManager';
import { useWordVolleySessionSync } from './useSessionSync';
import { createInitialState, WordVolleySessionState } from './sessionTypes';
import { GameSettings } from './types';

// Synchronized Word Volley Game - Integration Example
// Shows how to modify existing Word Volley to use session sync

interface WordVolleySessionSyncProps {
  config: GameSettings;
  onGameComplete?: (score: number) => void;
}

export const WordVolleySessionSync: React.FC<WordVolleySessionSyncProps> = ({
  config,
  onGameComplete
}) => {
  const { currentUser } = useAuth();
  const [sessionId, setSessionId] = useState<string>('');
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
  const [gameMode, setGameMode] = useState<'session-setup' | 'playing'>('session-setup');
  
  // Session sync hook
  const {
    gameState,
    updateGameState,
    batchUpdateGameState,
    connectionStatus,
    remoteConnectionStatus,
    isConnected
  } = useWordVolleySessionSync({
    sessionId,
    userId: currentUser?.uid || '',
    userRole: userRole || 'teacher',
    initialState: createInitialState(config, sessionId)
  });

  // Handle session creation/joining
  const handleSessionReady = (newSessionId: string, role: 'teacher' | 'student') => {
    console.log(`[WordVolley] Session ready: ${newSessionId} as ${role}`);
    setSessionId(newSessionId);
    setUserRole(role);
    setGameMode('playing');
  };

  // Synchronized Word Volley Game Component
  const SynchronizedWordVolleyGame: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const lastUpdateTime = useRef<number>(0);

    // Game constants (from original Word Volley)
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;
    const BALL_RADIUS = 10;
    const PADDLE_WIDTH = 20;

    // Game loop with synchronized rendering
    const gameLoop = useCallback((currentTime: number) => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const deltaTime = currentTime - lastUpdateTime.current;
      lastUpdateTime.current = currentTime;

      // Clear canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw game objects using synced state
      drawGame(ctx);

      // Physics updates (teacher only)
      if (userRole === 'teacher' && gameState.game.state === 'playing') {
        updateGamePhysics(deltaTime);
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    }, [gameState, userRole]);

    // Draw the complete game state
    const drawGame = (ctx: CanvasRenderingContext2D) => {
      const { ball, playerPaddle, aiPaddle } = gameState.gameObjects;
      const { scores } = gameState;

      // Draw center line
      ctx.strokeStyle = '#ddd';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 0);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw ball
      ctx.fillStyle = '#FF6B35';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw word on ball
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ball.word, ball.x, ball.y);

      // Draw player paddle (blue for student control)
      ctx.fillStyle = userRole === 'student' ? '#0066CC' : '#4A90E2';
      ctx.fillRect(playerPaddle.x, playerPaddle.y, playerPaddle.width, playerPaddle.height);

      // Draw AI paddle (orange for teacher control)
      ctx.fillStyle = userRole === 'teacher' ? '#CC6600' : '#E2904A';
      ctx.fillRect(aiPaddle.x, aiPaddle.y, aiPaddle.width, aiPaddle.height);

      // Draw score
      ctx.fillStyle = '#333';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${scores.player} - ${scores.ai}`, CANVAS_WIDTH / 2, 50);
      
      // Draw time remaining
      ctx.font = '16px Arial';
      ctx.fillText(`Time: ${scores.timeRemaining}s`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);

      // Draw role indicators
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = userRole === 'student' ? '#0066CC' : '#666';
      ctx.fillText('Student Paddle', playerPaddle.x, playerPaddle.y - 10);
      
      ctx.textAlign = 'right';
      ctx.fillStyle = userRole === 'teacher' ? '#CC6600' : '#666';
      ctx.fillText('AI Paddle', aiPaddle.x + aiPaddle.width, aiPaddle.y - 10);
    };

    // Physics updates (teacher controls ball and AI)
    const updateGamePhysics = (deltaTime: number) => {
      const { ball, playerPaddle, aiPaddle } = gameState.gameObjects;
      
      if (!gameState.game.ballMoving) return;

      // Ball movement
      const newBall = {
        ...ball,
        x: ball.x + ball.vx,
        y: ball.y + ball.vy
      };

      // Boundary collisions (top/bottom)
      if (newBall.y <= BALL_RADIUS || newBall.y >= CANVAS_HEIGHT - BALL_RADIUS) {
        newBall.vy = -newBall.vy;
      }

      // Paddle collisions
      // Player paddle (right side)
      if (newBall.x + BALL_RADIUS >= playerPaddle.x && 
          newBall.x - BALL_RADIUS <= playerPaddle.x + PADDLE_WIDTH &&
          newBall.y >= playerPaddle.y && 
          newBall.y <= playerPaddle.y + playerPaddle.height) {
        newBall.vx = -Math.abs(newBall.vx); // Ensure ball goes left
        
        // Add some vertical angle based on where it hit the paddle
        const hitPos = (newBall.y - playerPaddle.y) / playerPaddle.height;
        newBall.vy = (hitPos - 0.5) * 4;
      }

      // AI paddle (left side)
      if (newBall.x - BALL_RADIUS <= aiPaddle.x + PADDLE_WIDTH && 
          newBall.x + BALL_RADIUS >= aiPaddle.x &&
          newBall.y >= aiPaddle.y && 
          newBall.y <= aiPaddle.y + aiPaddle.height) {
        newBall.vx = Math.abs(newBall.vx); // Ensure ball goes right
        
        const hitPos = (newBall.y - aiPaddle.y) / aiPaddle.height;
        newBall.vy = (hitPos - 0.5) * 4;
      }

      // Ball out of bounds (scoring)
      if (newBall.x < 0) {
        // Player scores
        updateGameState('scores.player', gameState.scores.player + 1);
        resetBall();
        return;
      } else if (newBall.x > CANVAS_WIDTH) {
        // AI scores
        updateGameState('scores.ai', gameState.scores.ai + 1);
        resetBall();
        return;
      }

      // Update AI paddle (simple AI)
      const aiTargetY = newBall.y - aiPaddle.height / 2;
      const aiSpeed = 3;
      const newAiY = aiPaddle.y + Math.sign(aiTargetY - aiPaddle.y) * Math.min(aiSpeed, Math.abs(aiTargetY - aiPaddle.y));
      
      const newAiPaddle = {
        ...aiPaddle,
        y: Math.max(0, Math.min(CANVAS_HEIGHT - aiPaddle.height, newAiY))
      };

      // Sync ball and AI paddle positions (teacher-only, throttled)
      batchUpdateGameState([
        { path: 'gameObjects.ball', value: newBall },
        { path: 'gameObjects.aiPaddle', value: newAiPaddle }
      ]);
    };

    const resetBall = () => {
      const newBall = {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        vx: gameState.game.serveToAI ? -5 : 5,
        vy: (Math.random() - 0.5) * 2,
        radius: BALL_RADIUS,
        word: 'PLAY' // In real game, this would be a random word
      };
      
      updateGameState('gameObjects.ball', newBall);
      updateGameState('game.serveToAI', !gameState.game.serveToAI);
    };

    // Mouse movement for student paddle
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (userRole !== 'student') return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      
      const newPaddle = {
        ...gameState.gameObjects.playerPaddle,
        y: Math.max(0, Math.min(CANVAS_HEIGHT - gameState.gameObjects.playerPaddle.height, y - gameState.gameObjects.playerPaddle.height / 2))
      };

      // Sync paddle position (student-only, 20fps throttling)
      updateGameState('gameObjects.playerPaddle', newPaddle);
    };

    // Game controls
    const startGame = () => {
      if (userRole === 'teacher') {
        updateGameState('game.state', 'playing');
        updateGameState('game.ballMoving', true);
        resetBall();
      }
    };

    const pauseGame = () => {
      if (userRole === 'teacher') {
        updateGameState('game.state', 'paused');
        updateGameState('game.ballMoving', false);
      }
    };

    // Start game loop
    useEffect(() => {
      if (gameMode === 'playing') {
        animationRef.current = requestAnimationFrame(gameLoop);
      }
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [gameMode, gameLoop]);

    return (
      <VStack spacing={4} w="full">
        {/* Connection Status Bar */}
        <HStack spacing={4} w="full" justify="space-between" bg="gray.50" p={3} borderRadius="md">
          <Text fontSize="sm">
            <strong>Role:</strong> {userRole === 'teacher' ? '👩‍🏫 Teacher (Controls Game)' : '🎓 Student (Controls Paddle)'}
          </Text>
          <HStack spacing={2}>
            <Badge colorScheme={isConnected ? 'green' : 'red'} variant="solid">
              {isConnected ? '🟢 Synced' : '🔴 Disconnected'}
            </Badge>
            {remoteConnectionStatus && (
              <Badge colorScheme={remoteConnectionStatus.isConnected ? 'blue' : 'gray'} variant="outline">
                {remoteConnectionStatus.role === 'teacher' ? 'Teacher' : 'Student'}: {remoteConnectionStatus.isConnected ? 'Online' : 'Offline'}
              </Badge>
            )}
          </HStack>
        </HStack>

        {/* Game Canvas */}
        <Box position="relative" border="2px solid #333" borderRadius="lg" overflow="hidden">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ 
              display: 'block',
              cursor: userRole === 'student' ? 'none' : 'default'
            }}
            onMouseMove={handleMouseMove}
          />
          
          {/* Student Instructions Overlay */}
          {userRole === 'student' && gameState.game.state === 'idle' && (
            <Box
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              bg="rgba(0,0,0,0.8)"
              color="white"
              p={6}
              borderRadius="lg"
              textAlign="center"
              zIndex={10}
            >
              <Text fontSize="lg" fontWeight="bold" mb={2}>🎮 Move your mouse to control the blue paddle!</Text>
              <Text fontSize="sm">Waiting for teacher to start the game...</Text>
            </Box>
          )}

          {/* Connection Warning Overlay */}
          {!isConnected && (
            <Box
              position="absolute"
              top="20px"
              left="50%"
              transform="translateX(-50%)"
              zIndex={10}
            >
              <Alert status="warning" size="sm" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">Connection lost - reconnecting...</Text>
              </Alert>
            </Box>
          )}
        </Box>

        {/* Game Controls */}
        <HStack spacing={4} w="full" justify="center">
          {userRole === 'teacher' && (
            <>
              <Button
                colorScheme="green"
                onClick={startGame}
                isDisabled={gameState.game.state === 'playing' || !isConnected}
                size="lg"
              >
                {gameState.game.state === 'idle' ? 'Start Game' : 'Resume'}
              </Button>
              
              {gameState.game.state === 'playing' && (
                <Button
                  colorScheme="orange"
                  onClick={pauseGame}
                  size="lg"
                >
                  Pause Game
                </Button>
              )}
            </>
          )}
          
          <Text fontSize="lg" fontWeight="bold" color="blue.600">
            Score: {gameState.scores.player} - {gameState.scores.ai}
          </Text>
        </HStack>

        {/* Real-time Sync Debug Info */}
        <Box bg="gray.50" p={3} borderRadius="md" w="full" fontSize="xs" color="gray.600">
          <Text fontWeight="bold" mb={1}>🔄 Real-time Sync Status:</Text>
          <HStack spacing={4} wrap="wrap">
            <Text>Ball: ({Math.round(gameState.gameObjects.ball.x)}, {Math.round(gameState.gameObjects.ball.y)})</Text>
            <Text>Student Paddle: Y={Math.round(gameState.gameObjects.playerPaddle.y)}</Text>
            <Text>Game State: {gameState.game.state}</Text>
            <Text>Ball Moving: {gameState.game.ballMoving ? '✅' : '❌'}</Text>
          </HStack>
        </Box>
      </VStack>
    );
  };

  // Show session manager until session is active
  if (gameMode === 'session-setup') {
    return (
      <SessionManager
        onSessionReady={handleSessionReady}
        connectionStatus={connectionStatus}
        remoteConnectionStatus={remoteConnectionStatus}
        isConnected={isConnected}
      />
    );
  }

  // Show synchronized game
  return <SynchronizedWordVolleyGame />;
};

export default WordVolleySessionSync; 