import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameSettings, Ball, Paddle, HitResult, GameWord } from './types';
import { 
  getRandomWord, 
  calculateCollision, 
  calculateBounceAngle,
  clamp,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PADDLE_WIDTH,
  AI_PADDLE_HEIGHT,
  BALL_RADIUS,
  MIN_PADDLE_HEIGHT,
  POINTS_CORRECT_HIT,
  POINTS_WRONG_HIT,
  POINTS_LEVEL_BONUS,
  MAX_BALL_SPEED,
  MIN_BALL_SPEED
} from './utils';

interface UseGameLogicProps {
  settings: GameSettings;
}

export const useGameLogic = (initialSettings: GameSettings) => {
  // Game state
  const [gameState, setGameState] = useState<GameState>('idle');
  const [settings, setSettings] = useState<GameSettings>(initialSettings);
  const [score, setScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [lives, setLives] = useState(initialSettings.maxLives);
  const [level, setLevel] = useState(1);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(initialSettings.gameTime || 180); // Default 3 minutes
  const [wordsProcessed, setWordsProcessed] = useState(0);
  const [correctHits, setCorrectHits] = useState(0);
  const [wrongHits, setWrongHits] = useState(0);
  const [missedTargets, setMissedTargets] = useState(0);
  const [aiCorrectHits, setAiCorrectHits] = useState(0);
  const [aiWrongHits, setAiWrongHits] = useState(0);
  const [serveToAI, setServeToAI] = useState(true); // Track which side gets next serve
  const [lastCollisionFrame, setLastCollisionFrame] = useState(0); // Prevent rapid consecutive collisions
  const [ballMoving, setBallMoving] = useState(false); // Track if ball should be moving
  
  // Game objects - ensure pixel-perfect initial positioning
  const [ball, setBall] = useState<Ball>({
    x: Math.round(CANVAS_WIDTH / 2),
    y: Math.round(CANVAS_HEIGHT / 2),
    vx: 0, // Start stationary
    vy: 0, // Start stationary
    radius: BALL_RADIUS,
    word: getRandomWord(settings)
  });

  const [playerPaddle, setPlayerPaddle] = useState<Paddle>({
    x: CANVAS_WIDTH - PADDLE_WIDTH,
    y: CANVAS_HEIGHT / 2 - settings.paddleSize / 2,
    width: PADDLE_WIDTH,
    height: settings.paddleSize
  });

  const [aiPaddle, setAiPaddle] = useState<Paddle>({
    x: 0,
    y: CANVAS_HEIGHT / 2 - AI_PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: AI_PADDLE_HEIGHT
  });

  // Refs for intervals and current state
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const ballRef = useRef(ball);
  const aiPaddleRef = useRef(aiPaddle);

  // Update refs when state changes
  ballRef.current = ball;
  aiPaddleRef.current = aiPaddle;

  // Computed properties
  const isGameActive = gameState === 'playing';

  // Helper function to serve ball alternating between sides
  const serveBall = useCallback(() => {
    const speed = settings.initialSpeed;
    const vx = serveToAI ? -speed : speed; // Negative = toward AI (left), Positive = toward player (right)
    const vy = (Math.random() - 0.5) * 2; // Small random vertical velocity
    
    // Toggle serve direction for next time
    setServeToAI(prev => !prev);
    
    return {
      x: Math.round(CANVAS_WIDTH / 2),
      y: Math.round(CANVAS_HEIGHT / 2),
      vx,
      vy,
      radius: BALL_RADIUS,
      word: getRandomWord(settings)
    };
  }, [settings, serveToAI]);

  // Game initialization
  const initializeGame = useCallback(() => {
    setScore(0);
    setAiScore(0);
    setLives(settings.maxLives);
    setLevel(1);
    setTimeElapsed(0);
    setTimeRemaining(settings.gameTime || 180);
    setWordsProcessed(0);
    setCorrectHits(0);
    setWrongHits(0);
    setMissedTargets(0);
    setAiCorrectHits(0);
    setAiWrongHits(0);
    setServeToAI(true); // Reset serve to start with AI
    setBallMoving(false); // Ball starts stationary
    
    // Reset ball stationary at center with pixel-perfect positioning
    setBall({
      x: Math.round(CANVAS_WIDTH / 2),
      y: Math.round(CANVAS_HEIGHT / 2),
      vx: 0, // Stationary until player engages
      vy: 0, // Stationary until player engages
      radius: BALL_RADIUS,
      word: getRandomWord(settings)
    });

    // Reset player paddle
    setPlayerPaddle({
      x: CANVAS_WIDTH - PADDLE_WIDTH,
      y: CANVAS_HEIGHT / 2 - settings.paddleSize / 2,
      width: PADDLE_WIDTH,
      height: settings.paddleSize
    });

    // Reset AI paddle
    setAiPaddle({
      x: 0,
      y: CANVAS_HEIGHT / 2 - AI_PADDLE_HEIGHT / 2,
      width: PADDLE_WIDTH,
      height: AI_PADDLE_HEIGHT
    });
  }, [settings]);

  // Game controls
  const startGame = useCallback(() => {
    initializeGame();
    setGameState('playing');
  }, [initializeGame]);

  const pauseGame = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('paused');
    }
  }, [gameState]);

  const resumeGame = useCallback(() => {
    if (gameState === 'paused') {
      setGameState('playing');
    }
  }, [gameState]);

  const resetGame = useCallback(() => {
    setGameState('idle');
    initializeGame();
  }, [initializeGame]);

  const endGame = useCallback(() => {
    setGameState('gameOver');
  }, []);

  // Player paddle control
  const updatePlayerPaddle = useCallback((mouseY: number) => {
    const paddleY = clamp(
      mouseY - playerPaddle.height / 2,
      0,
      CANVAS_HEIGHT - playerPaddle.height
    );
    setPlayerPaddle(prev => ({ ...prev, y: paddleY }));
  }, [playerPaddle.height]);

  // Start ball movement when player engages paddle
  const startBallMovement = useCallback(() => {
    if (!ballMoving && gameState === 'playing') {
      setBallMoving(true);
      setBall(prev => ({
        ...prev,
        x: Math.round(prev.x), // Ensure pixel-perfect positioning
        y: Math.round(prev.y), // Ensure pixel-perfect positioning
        vx: -settings.initialSpeed, // Start by serving to AI
        vy: (Math.random() - 0.5) * 2
      }));
    }
  }, [ballMoving, gameState, settings.initialSpeed]);

  // AI paddle movement (strategic AI that plays the game correctly)
  const updateAiPaddle = useCallback(() => {
    if (gameState !== 'playing') return;

    setAiPaddle(prevAiPaddle => {
      const currentBall = ballRef.current;
      const aiPaddleCenter = prevAiPaddle.y + prevAiPaddle.height / 2;
      const ballCenter = currentBall.y;
      const aiSpeed = 3;
      
      // AI strategy: Hit target words, avoid non-target words
      const shouldHitBall = currentBall.word.isTarget;
      const ballComingToAI = currentBall.vx < 0; // Ball moving toward AI
      
      let targetY = prevAiPaddle.y;
      
      if (ballComingToAI && shouldHitBall) {
        // Try to hit target words - follow the ball closely
        if (ballCenter < aiPaddleCenter - 10) {
          targetY = Math.max(0, prevAiPaddle.y - aiSpeed);
        } else if (ballCenter > aiPaddleCenter + 10) {
          targetY = Math.min(CANVAS_HEIGHT - prevAiPaddle.height, prevAiPaddle.y + aiSpeed);
        }
      } else if (ballComingToAI && !shouldHitBall) {
        // Try to avoid non-target words - move away from ball with some randomness
        const avoidanceChance = 0.8; // 80% chance to avoid correctly
        if (Math.random() < avoidanceChance) {
          // Move away from the ball
          if (ballCenter < aiPaddleCenter) {
            targetY = Math.min(CANVAS_HEIGHT - prevAiPaddle.height, prevAiPaddle.y + aiSpeed * 1.5);
          } else {
            targetY = Math.max(0, prevAiPaddle.y - aiSpeed * 1.5);
          }
        } else {
          // Sometimes make mistakes and follow the ball anyway
          if (ballCenter < aiPaddleCenter - 10) {
            targetY = Math.max(0, prevAiPaddle.y - aiSpeed * 0.5);
          } else if (ballCenter > aiPaddleCenter + 10) {
            targetY = Math.min(CANVAS_HEIGHT - prevAiPaddle.height, prevAiPaddle.y + aiSpeed * 0.5);
          }
        }
      } else {
        // Ball not coming to AI or neutral position - stay centered
        const centerY = CANVAS_HEIGHT / 2 - prevAiPaddle.height / 2;
        if (Math.abs(aiPaddleCenter - CANVAS_HEIGHT / 2) > 20) {
          if (aiPaddleCenter < CANVAS_HEIGHT / 2) {
            targetY = Math.min(centerY, prevAiPaddle.y + aiSpeed * 0.5);
          } else {
            targetY = Math.max(centerY, prevAiPaddle.y - aiSpeed * 0.5);
          }
        }
      }

      return { ...prevAiPaddle, y: targetY };
    });
  }, [gameState]); // Only depend on gameState, not changing ball values

  // Ball movement and collision detection
  const updateBall = useCallback(() => {
    if (!isGameActive) return null;
    
    // Don't move ball until player engages paddle
    if (!ballMoving) return null;

    const currentFrame = performance.now();
    const minCollisionInterval = 100; // Minimum time between collisions in ms
    
    let hitResult: HitResult | null = null;
    const newBall = { ...ball };

    // Update ball position with integer-only velocity for pixel-perfect movement
    // Force velocity to whole numbers only - no fractional pixels
    const integerVx = Math.round(newBall.vx); // Force to integer
    const integerVy = Math.round(newBall.vy); // Force to integer
    
    // Calculate new position with integer movements only
    newBall.x = Math.round(newBall.x + integerVx);
    newBall.y = Math.round(newBall.y + integerVy);
    
    // Update velocity to maintain integer values
    newBall.vx = integerVx;
    newBall.vy = integerVy;

    // Bounce off top and bottom walls with minimum angle
    if (newBall.y <= BALL_RADIUS || newBall.y >= CANVAS_HEIGHT - BALL_RADIUS) {
      const wall = newBall.y <= BALL_RADIUS ? 'top' : 'bottom';
      const originalVx = newBall.vx;
      const originalVy = newBall.vy;
      const originalSpeed = Math.sqrt(originalVx * originalVx + originalVy * originalVy);
      const originalAngleDegrees = Math.abs(Math.atan2(originalVy, originalVx) * 180 / Math.PI);
      
      console.log(`🏐 Ball hit ${wall} wall:`);
      console.log(`  Original velocity: vx=${originalVx.toFixed(2)}, vy=${originalVy.toFixed(2)}`);
      console.log(`  Original speed: ${originalSpeed.toFixed(2)}`);
      console.log(`  Original angle: ${originalAngleDegrees.toFixed(1)}°`);
      
      newBall.vy *= -1;
      newBall.y = clamp(newBall.y, BALL_RADIUS, CANVAS_HEIGHT - BALL_RADIUS);
      
      // Ensure minimum rebound angle of 25 degrees from vertical (not horizontal)
      const speed = Math.sqrt(newBall.vx * newBall.vx + newBall.vy * newBall.vy);
      const minAngleFromVerticalRadians = (25 * Math.PI) / 180; // 25 degrees from vertical
      const minVx = speed * Math.sin(minAngleFromVerticalRadians); // Minimum horizontal velocity
      const maxVy = speed * Math.cos(minAngleFromVerticalRadians); // Maximum vertical velocity
      
      console.log(`  After initial bounce: vx=${newBall.vx.toFixed(2)}, vy=${newBall.vy.toFixed(2)}`);
      console.log(`  Required min |vx| for 25° from vertical: ${minVx.toFixed(2)}, actual |vx|: ${Math.abs(newBall.vx).toFixed(2)}`);
      console.log(`  Required max |vy| for 25° from vertical: ${maxVy.toFixed(2)}, actual |vy|: ${Math.abs(newBall.vy).toFixed(2)}`);
      
      // Check if the ball is bouncing too vertically (not enough horizontal movement)
      if (Math.abs(newBall.vx) < minVx) {
        console.log(`  ⚠️  Too vertical! Adding horizontal velocity...`);
        
        // Ensure minimum horizontal velocity
        newBall.vx = newBall.vx >= 0 ? minVx : -minVx;
        
        // Limit vertical velocity to maintain the minimum angle
        const maxAllowedVy = Math.sqrt(speed * speed - newBall.vx * newBall.vx);
        if (Math.abs(newBall.vy) > maxAllowedVy) {
          newBall.vy = newBall.vy > 0 ? maxAllowedVy : -maxAllowedVy;
        }
        
        const finalSpeed = Math.sqrt(newBall.vx * newBall.vx + newBall.vy * newBall.vy);
        const finalAngleFromVertical = Math.atan2(Math.abs(newBall.vx), Math.abs(newBall.vy)) * 180 / Math.PI;
        console.log(`  ✅ Adjusted velocity: vx=${newBall.vx.toFixed(2)}, vy=${newBall.vy.toFixed(2)}`);
        console.log(`  ✅ Final speed: ${finalSpeed.toFixed(2)}`);
        console.log(`  ✅ Final angle from vertical: ${finalAngleFromVertical.toFixed(1)}°`);
      } else {
        const finalAngleFromVertical = Math.atan2(Math.abs(newBall.vx), Math.abs(newBall.vy)) * 180 / Math.PI;
        console.log(`  ✅ Angle OK: ${finalAngleFromVertical.toFixed(1)}° from vertical`);
      }
      
      hitResult = { type: 'bounce' };
    }

    // Check collision with player paddle (right side)
    if (newBall.vx > 0 && 
        currentFrame - lastCollisionFrame > minCollisionInterval &&
        calculateCollision(
          newBall.x, newBall.y, newBall.radius,
          playerPaddle.x, playerPaddle.y, playerPaddle.width, playerPaddle.height
        )) {
      console.log(`🏓 Player Paddle hit at ball position: x=${newBall.x.toFixed(1)}, y=${newBall.y.toFixed(1)}`);
      console.log(`  Paddle position: x=${playerPaddle.x}, y=${playerPaddle.y.toFixed(1)}, height=${playerPaddle.height}`);
      console.log(`  Ball velocity before: vx=${newBall.vx.toFixed(2)}, vy=${newBall.vy.toFixed(2)}`);
      
      const bounceAngle = calculateBounceAngle(newBall.y, playerPaddle.y, playerPaddle.height);
      const currentSpeed = Math.sqrt(newBall.vx * newBall.vx + newBall.vy * newBall.vy); // Actual speed magnitude
      const speed = Math.max(currentSpeed, settings.initialSpeed); // Ensure minimum speed
      
      newBall.vx = -speed * Math.cos(bounceAngle);
      newBall.vy = speed * Math.sin(bounceAngle);
      
      // Ensure ball doesn't get stuck in paddle - move it further away
      newBall.x = playerPaddle.x - newBall.radius - 2;
      
      // Prevent ball from going off screen due to paddle collision near edges
      if (newBall.y - newBall.radius < 0) {
        newBall.y = newBall.radius + 1;
        console.log(`  ⚠️  Ball too close to top edge after paddle hit, adjusting y position`);
      }
      if (newBall.y + newBall.radius > CANVAS_HEIGHT) {
        newBall.y = CANVAS_HEIGHT - newBall.radius - 1;
        console.log(`  ⚠️  Ball too close to bottom edge after paddle hit, adjusting y position`);
      }
      
      console.log(`  Ball velocity after: vx=${newBall.vx.toFixed(2)}, vy=${newBall.vy.toFixed(2)}`);
      console.log(`  Ball position after: x=${newBall.x.toFixed(1)}, y=${newBall.y.toFixed(1)}`);
      
      setLastCollisionFrame(currentFrame); // Update collision timestamp

      // Check if it was a target word
      if (newBall.word.isTarget) {
        // Correct hit
        setScore(prev => prev + POINTS_CORRECT_HIT);
        setCorrectHits(prev => prev + 1);
        setWordsProcessed(prev => prev + 1);
        
        // Increase difficulty - ensure speed never goes below configuration
        const newSpeed = clamp(speed + settings.speedIncrement, settings.initialSpeed, MAX_BALL_SPEED);
        newBall.vx = -newSpeed * Math.cos(bounceAngle);
        newBall.vy = newSpeed * Math.sin(bounceAngle);

        hitResult = { type: 'correct', points: POINTS_CORRECT_HIT, word: newBall.word };
        
        // Check for level up
        if (wordsProcessed + 1 >= level * settings.wordsPerLevel) {
          setLevel(prev => prev + 1);
          setScore(prev => prev + POINTS_LEVEL_BONUS);
          hitResult = { type: 'levelUp', points: POINTS_LEVEL_BONUS };
        }
      } else {
        // Wrong hit - hit a non-target word
        setScore(prev => Math.max(0, prev + POINTS_WRONG_HIT));
        setWrongHits(prev => prev + 1);
        setWordsProcessed(prev => prev + 1);
        
        hitResult = { type: 'wrong', points: POINTS_WRONG_HIT, word: newBall.word };
      }

      // Get new word
      newBall.word = getRandomWord(settings);
    }

    // Check collision with AI paddle (left side)
    if (newBall.vx < 0 && 
        currentFrame - lastCollisionFrame > minCollisionInterval &&
        calculateCollision(
          newBall.x, newBall.y, newBall.radius,
          aiPaddle.x, aiPaddle.y, aiPaddle.width, aiPaddle.height
        )) {
      console.log(`🏓 AI Paddle hit at ball position: x=${newBall.x.toFixed(1)}, y=${newBall.y.toFixed(1)}`);
      console.log(`  Paddle position: x=${aiPaddle.x}, y=${aiPaddle.y.toFixed(1)}, height=${aiPaddle.height}`);
      console.log(`  Ball velocity before: vx=${newBall.vx.toFixed(2)}, vy=${newBall.vy.toFixed(2)}`);
      
      const bounceAngle = calculateBounceAngle(newBall.y, aiPaddle.y, aiPaddle.height);
      const currentSpeed = Math.sqrt(newBall.vx * newBall.vx + newBall.vy * newBall.vy); // Actual speed magnitude
      const speed = Math.max(currentSpeed, settings.initialSpeed); // Ensure minimum speed
      
      newBall.vx = speed * Math.cos(bounceAngle);
      newBall.vy = speed * Math.sin(bounceAngle);
      
      // Ensure ball doesn't get stuck in paddle - move it further away
      newBall.x = aiPaddle.x + aiPaddle.width + newBall.radius + 2;
      
      // Prevent ball from going off screen due to paddle collision near edges
      if (newBall.y - newBall.radius < 0) {
        newBall.y = newBall.radius + 1;
        console.log(`  ⚠️  Ball too close to top edge after paddle hit, adjusting y position`);
      }
      if (newBall.y + newBall.radius > CANVAS_HEIGHT) {
        newBall.y = CANVAS_HEIGHT - newBall.radius - 1;
        console.log(`  ⚠️  Ball too close to bottom edge after paddle hit, adjusting y position`);
      }
      
      console.log(`  Ball velocity after: vx=${newBall.vx.toFixed(2)}, vy=${newBall.vy.toFixed(2)}`);
      console.log(`  Ball position after: x=${newBall.x.toFixed(1)}, y=${newBall.y.toFixed(1)}`);
      
      setLastCollisionFrame(currentFrame); // Update collision timestamp

      // AI Scoring Logic
      if (newBall.word.isTarget) {
        // AI correctly hit a target word
        setAiScore(prev => prev + POINTS_CORRECT_HIT);
        setAiCorrectHits(prev => prev + 1);
        setWordsProcessed(prev => prev + 1);
        
        // Increase difficulty - ensure speed never goes below configuration
        const newSpeed = clamp(speed + settings.speedIncrement, settings.initialSpeed, MAX_BALL_SPEED);
        newBall.vx = newSpeed * Math.cos(bounceAngle);
        newBall.vy = newSpeed * Math.sin(bounceAngle);

        hitResult = { type: 'aiCorrect', points: POINTS_CORRECT_HIT, word: newBall.word };
      } else {
        // AI incorrectly hit a non-target word - deduct points
        setAiScore(prev => Math.max(0, prev + POINTS_WRONG_HIT)); // -5 points
        setAiWrongHits(prev => prev + 1);
        setWordsProcessed(prev => prev + 1);
        
        hitResult = { type: 'aiWrong', points: POINTS_WRONG_HIT, word: newBall.word };
      }

      // Get new word
      newBall.word = getRandomWord(settings);
    }

    // Check if ball went off screen (right side - player missed)
    if (newBall.x > CANVAS_WIDTH + BALL_RADIUS) {
      if (newBall.word.isTarget) {
        // Player missed a target word - lose points but no lives
        setMissedTargets(prev => prev + 1);
        setScore(prev => Math.max(0, prev + POINTS_WRONG_HIT)); // -5 points for missing target
        hitResult = { type: 'miss', word: newBall.word };
      } else {
        // Player correctly avoided a non-target word - no penalty
        // This is good play
      }
      setWordsProcessed(prev => prev + 1);
      
      // Reset ball from center with alternating serve and pixel-perfect positioning
      const speed = settings.initialSpeed;
      const vx = serveToAI ? -speed : speed; // Serve alternating between sides
      setServeToAI(prev => !prev); // Toggle for next serve
      
      newBall.x = Math.round(CANVAS_WIDTH / 2);
      newBall.y = Math.round(CANVAS_HEIGHT / 2);
      newBall.vx = vx;
      newBall.vy = (Math.random() - 0.5) * 4;
      newBall.word = getRandomWord(settings);
    }

    // Check if ball went off screen (left side - AI missed)
    if (newBall.x < -BALL_RADIUS) {
      if (newBall.word.isTarget) {
        // AI missed a target word - player gets points
        setScore(prev => prev + POINTS_CORRECT_HIT); // Player gets +10 points when AI misses target
        hitResult = { type: 'aiMiss', word: newBall.word };
      } else {
        // AI correctly avoided a non-target word - no penalty for AI
        // This is good AI play
      }
      setWordsProcessed(prev => prev + 1);
      
      // Reset ball from center with alternating serve and pixel-perfect positioning
      const speed = settings.initialSpeed;
      const vx = serveToAI ? -speed : speed; // Serve alternating between sides
      setServeToAI(prev => !prev); // Toggle for next serve
      
      newBall.x = Math.round(CANVAS_WIDTH / 2);
      newBall.y = Math.round(CANVAS_HEIGHT / 2);
      newBall.vx = vx;
      newBall.vy = (Math.random() - 0.5) * 4;
      newBall.word = getRandomWord(settings);
    }

    setBall(newBall);

    // Game only ends when timer expires - no lives-based ending
    return hitResult;
  }, [
    isGameActive, ballMoving, ball, playerPaddle, aiPaddle, settings, 
    lives, level, wordsProcessed, endGame, serveToAI, lastCollisionFrame
  ]);

  // Game timer
  useEffect(() => {
    if (gameState === 'playing') {
      gameTimerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            // Time's up - end the game
            endGame();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
        gameTimerRef.current = null;
      }
    }

    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    };
  }, [gameState, endGame]);

  // AI paddle update timer
  useEffect(() => {
    if (gameState === 'playing') {
      aiUpdateRef.current = setInterval(updateAiPaddle, 50);
    } else {
      if (aiUpdateRef.current) {
        clearInterval(aiUpdateRef.current);
        aiUpdateRef.current = null;
      }
    }

    return () => {
      if (aiUpdateRef.current) {
        clearInterval(aiUpdateRef.current);
      }
    };
  }, [gameState, updateAiPaddle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
      if (aiUpdateRef.current) {
        clearInterval(aiUpdateRef.current);
      }
    };
  }, []);

  // Handle ball hit (for external trigger)
  const handleBallHit = useCallback(() => {
    return updateBall();
  }, [updateBall]);

  return {
    // Game state
    gameState,
    settings,
    ball,
    playerPaddle,
    aiPaddle,
    ballMoving,
    
    // Statistics
    score,
    aiScore,
    level,
    timeElapsed,
    timeRemaining,
    wordsProcessed,
    correctHits,
    wrongHits,
    missedTargets,
    aiCorrectHits,
    aiWrongHits,
    
    // Controls
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    endGame,
    
    // Updates
    updateBall,
    updatePlayerPaddle,
    startBallMovement,
    handleBallHit,
    
    // Computed
    isGameActive,
    
    // Settings update
    updateSettings: setSettings
  };
}; 