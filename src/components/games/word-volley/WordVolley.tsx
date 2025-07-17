import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { PWAGameHeader } from '../PWAGameHeader';
import { HighScoreModal } from '../../common/HighScoreModal';
import { useHighScore } from '../../../hooks/useHighScore';
import { HighScoreService } from '../../../services/highScoreService';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { GameControls } from './GameControls';
import { useGameLogic } from './useGameLogic';
import { useAudio } from './useAudio';
import { GameTheme, GameSettings, GameState, GameWord, Position, Ball, Paddle, ThemeType } from './types';
import { THEMES, DEFAULT_SETTINGS, CANVAS_WIDTH, CANVAS_HEIGHT, speakWord } from './utils';
import { defaultTextRenderer } from '../../../utils/textRenderer';
import './WordVolley.css';

interface WordVolleyProps {
  gameConfig?: Partial<GameSettings>;
  onGameComplete?: (score: number, timeElapsed: number) => void;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
  onGameExit?: () => void;
  configId?: string;
  playerName?: string;
}

export const WordVolley: React.FC<WordVolleyProps> = ({
  gameConfig = {},
  onGameComplete,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
  onGameExit,
  configId,
  playerName = 'Student'
}) => {
  const { currentUser, isTeacher } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const [mouseY, setMouseY] = useState(CANVAS_HEIGHT / 2);
  
  // Reference to track theme changes for cache clearing
  const lastThemeRef = useRef<string>('');
  
  // Initialize modularized high score system
  const {
    highScores,
    isNewHighScore,
    showHighScoreModal,
    setShowHighScoreModal,
    saveHighScore,
    isSubmittingScore
  } = useHighScore({
    gameType: 'word-volley',
    configId: configId || 'default',
    scoringSystem: 'points-based',
    enableRateLimit: true,
    onHighScoreProcessStart,
    onHighScoreProcessComplete
  });
  
  // Additional state for general leaderboard viewing (for teachers)
  const [showGeneralLeaderboard, setShowGeneralLeaderboard] = useState(false);
  const [generalHighScores, setGeneralHighScores] = useState<any[]>([]);
  const [loadingGeneralScores, setLoadingGeneralScores] = useState(false);
  
  // Function to load general high scores for teachers
  const loadGeneralLeaderboard = useCallback(async () => {
    setLoadingGeneralScores(true);
    try {
      const wordVolleyScoresRef = collection(db, 'highScores');
      const q = query(
        wordVolleyScoresRef,
        where('gameType', '==', 'word-volley'),
        orderBy('score', 'desc'),
        limit(10) // Limit to top 10 scores
      );
      const querySnapshot = await getDocs(q);
      const scores: any[] = [];
      querySnapshot.forEach((doc) => {
        scores.push({ id: doc.id, ...doc.data() });
      });
      setGeneralHighScores(scores);
      setShowGeneralLeaderboard(true);
    } catch (error) {
      console.error('Error loading general leaderboard:', error);
      // Fallback to empty array if loading fails
      setGeneralHighScores([]);
      setShowGeneralLeaderboard(true);
    } finally {
      setLoadingGeneralScores(false);
    }
  }, []);
  
  // Enhanced paddle control state
  const [paddleEngaged, setPaddleEngaged] = useState(false);
  const [cursorOnScreen, setCursorOnScreen] = useState(false);
  const [showPaddleHint, setShowPaddleHint] = useState(true);
  const [showScoringModal, setShowScoringModal] = useState(false);
  
  // Speed debugging state
  const [showSpeedDebug, setShowSpeedDebug] = useState(true); // Enable by default to measure speeds
  const [currentBallSpeed, setCurrentBallSpeed] = useState(0);
  
  // Theme state
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('classic');
  
  // Text-to-speech state - use config setting or default to true
  const [isTextToSpeechEnabled, setIsTextToSpeechEnabled] = useState(
    gameConfig.enableTextToSpeech ?? true
  );
  
  // Toggle text-to-speech
  const toggleTextToSpeech = useCallback(() => {
    setIsTextToSpeechEnabled(prev => !prev);
  }, []);
  
  // Clear word cache when theme changes
  useEffect(() => {
    if (lastThemeRef.current !== currentTheme) {
      defaultTextRenderer.clearCache();
      lastThemeRef.current = currentTheme;
    }
  }, [currentTheme]);
  
  // Cat animation state for Enchanted Forest theme
  const [catVisible, setCatVisible] = useState(false);
  const [catPosition, setCatPosition] = useState(-100);
  const [catFrame, setCatFrame] = useState(0);
  const catAnimationRef = useRef<number>();
  const catTimerRef = useRef<NodeJS.Timeout>();
  
  // Dolphin animation state for Ocean Depths theme
  const [dolphinVisible, setDolphinVisible] = useState(false);
  const [dolphinPosition, setDolphinPosition] = useState(-100);
  const [dolphinFrame, setDolphinFrame] = useState(0);
  const dolphinAnimationRef = useRef<number>();
  const dolphinTimerRef = useRef<NodeJS.Timeout>();
  
  // Rocket animation state for Space Adventure theme
  const [rocketVisible, setRocketVisible] = useState(false);
  const [rocketPosition, setRocketPosition] = useState(CANVAS_HEIGHT + 100);
  const [rocketFrame, setRocketFrame] = useState(0);
  const [rocketX, setRocketX] = useState(0); // Random X position for each launch
  const rocketAnimationRef = useRef<number>();
  const rocketTimerRef = useRef<NodeJS.Timeout>();
  
  // Game state from custom hook
  const {
    gameState,
    settings,
    ball,
    playerPaddle,
    aiPaddle,
    ballMoving,
    score,
    aiScore,
    level,
    timeElapsed,
    timeRemaining,
    wordsProcessed,
    correctHits,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    updateBall,
    updatePlayerPaddle,
    startBallMovement,
    handleBallHit,
    isGameActive
  } = useGameLogic({
    ...DEFAULT_SETTINGS,
    ...gameConfig
  });

  // Audio hooks - only using bounce sound for wall hits
  const {
    playBounceSound,
    toggleMute,
    isMuted
  } = useAudio();

  // Speak word when it changes (if TTS is enabled)
  useEffect(() => {
    if (isTextToSpeechEnabled && ball.word && gameState === 'playing') {
      speakWord(ball.word.text, ball.word.isTarget);
    }
  }, [ball.word, isTextToSpeechEnabled, gameState]);

  // Check if mouse is over paddle area
  const isMouseOverPaddle = useCallback((mouseX: number, mouseY: number) => {
    const paddleBuffer = 20; // Extra clickable area around paddle
    return mouseX >= playerPaddle.x - paddleBuffer &&
           mouseX <= playerPaddle.x + playerPaddle.width + paddleBuffer &&
           mouseY >= playerPaddle.y - paddleBuffer &&
           mouseY <= playerPaddle.y + playerPaddle.height + paddleBuffer;
  }, [playerPaddle]);

  // Enhanced mouse movement handler with click-to-engage system
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isGameActive) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const containerRect = container.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    // Calculate mouse position relative to canvas
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    
    // Update cursor position for visual indicator
    setMouseY(mouseY);
    
    // Check if mouse is within canvas bounds
    const isInCanvas = mouseX >= 0 && mouseX <= CANVAS_WIDTH && mouseY >= 0 && mouseY <= CANVAS_HEIGHT;
    setCursorOnScreen(isInCanvas);
    
    // Only update paddle if it's engaged and cursor is on screen
    if (paddleEngaged && isInCanvas) {
      // Hide the hint once user starts controlling
      if (showPaddleHint) {
        setShowPaddleHint(false);
      }
      
      // Update paddle position - clamp to canvas bounds
      let effectiveY = mouseY;
      
      // Clamp to canvas bounds
      if (mouseY < 0) {
        effectiveY = 0;
      } else if (mouseY > CANVAS_HEIGHT) {
        effectiveY = CANVAS_HEIGHT;
      }
      
      setMouseY(effectiveY);
      updatePlayerPaddle(effectiveY);
    }
  }, [isGameActive, updatePlayerPaddle, paddleEngaged, showPaddleHint]);

  // Handle clicks to engage/disengage paddle control
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isGameActive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    
    if (!paddleEngaged) {
      // Check if clicking on or near the paddle to engage
      if (isMouseOverPaddle(mouseX, mouseY)) {
        setPaddleEngaged(true);
        setShowPaddleHint(false);
        
        // Start ball movement when player first engages
        startBallMovement();
        
        // Immediately update paddle position to mouse location
        const effectiveY = Math.max(0, Math.min(CANVAS_HEIGHT, mouseY));
        setMouseY(effectiveY);
        updatePlayerPaddle(effectiveY);
      }
    } else {
      // Already engaged - click anywhere to disengage (optional)
      // For now, we'll keep it engaged until mouse leaves screen
      // setPaddleEngaged(false);
    }
  }, [isGameActive, paddleEngaged, isMouseOverPaddle, updatePlayerPaddle, startBallMovement]);

  // Enhanced touch support for mobile
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isGameActive) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const touch = e.touches[0];
    const canvasRect = canvas.getBoundingClientRect();
    const touchX = touch.clientX - canvasRect.left;
    const touchY = touch.clientY - canvasRect.top;
    
    // Update cursor position for visual indicator
    setMouseY(touchY);
    setCursorOnScreen(true);
    
    // For touch, automatically engage on first touch
    if (!paddleEngaged) {
      setPaddleEngaged(true);
      setShowPaddleHint(false);
    }
    
    // Update paddle position if engaged
    if (paddleEngaged) {
      const effectiveY = Math.max(0, Math.min(CANVAS_HEIGHT, touchY));
      setMouseY(effectiveY);
      updatePlayerPaddle(effectiveY);
    }
  }, [isGameActive, updatePlayerPaddle, paddleEngaged]);

  // Handle touch start to engage paddle
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isGameActive) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const touch = e.touches[0];
    const canvasRect = canvas.getBoundingClientRect();
    const touchY = touch.clientY - canvasRect.top;
    
    // Engage paddle control on touch
    setPaddleEngaged(true);
    setShowPaddleHint(false);
    setCursorOnScreen(true);
    
    // Start ball movement when player first engages
    startBallMovement();
    
    // Immediately update paddle position
    const effectiveY = Math.max(0, Math.min(CANVAS_HEIGHT, touchY));
    setMouseY(effectiveY);
    updatePlayerPaddle(effectiveY);
  }, [isGameActive, updatePlayerPaddle, startBallMovement]);

  // Handle mouse enter/leave for paddle control
  const handleMouseEnter = useCallback(() => {
    if (isGameActive) {
      setCursorOnScreen(true);
    }
  }, [isGameActive]);

  const handleMouseLeave = useCallback(() => {
    setCursorOnScreen(false);
    // Optionally disengage paddle when mouse leaves (more forgiving UX)
    // setPaddleEngaged(false);
  }, []);

  // Reset paddle engagement when game starts/resets and auto-start game
  useEffect(() => {
    if (gameState === 'idle') {
      // Auto-start the game when component loads
      startGame();
      setPaddleEngaged(false);
      setShowPaddleHint(true);
    } else if (gameState === 'gameOver') {
      setPaddleEngaged(false);
      setShowPaddleHint(true);
    }
  }, [gameState, startGame]);

  // Cat animation system for Enchanted Forest theme
  useEffect(() => {
    if (currentTheme === 'forest' && isGameActive) {
      // Set up random cat appearances
      const scheduleNextCat = () => {
        const delay = Math.random() * 30000 + 20000; // 20-50 seconds
        catTimerRef.current = setTimeout(() => {
          if (currentTheme === 'forest' && isGameActive) {
            triggerCatAnimation();
          }
          scheduleNextCat();
        }, delay);
      };
      
      scheduleNextCat();
      
      return () => {
        if (catTimerRef.current) {
          clearTimeout(catTimerRef.current);
        }
        if (catAnimationRef.current) {
          cancelAnimationFrame(catAnimationRef.current);
        }
      };
    }
  }, [currentTheme, isGameActive]);

  // Dolphin animation system for Ocean Depths theme
  useEffect(() => {
    if (currentTheme === 'ocean' && isGameActive) {
      // Set up random dolphin appearances
      const scheduleNextDolphin = () => {
        const delay = Math.random() * 25000 + 15000; // 15-40 seconds
        dolphinTimerRef.current = setTimeout(() => {
          if (currentTheme === 'ocean' && isGameActive) {
            triggerDolphinAnimation();
          }
          scheduleNextDolphin();
        }, delay);
      };
      
      scheduleNextDolphin();
      
      return () => {
        if (dolphinTimerRef.current) {
          clearTimeout(dolphinTimerRef.current);
        }
        if (dolphinAnimationRef.current) {
          cancelAnimationFrame(dolphinAnimationRef.current);
        }
      };
    }
  }, [currentTheme, isGameActive]);

  // Rocket animation system for Space Adventure theme
  useEffect(() => {
    if (currentTheme === 'space' && isGameActive) {
      // Set up random rocket launches
      const scheduleNextRocket = () => {
        const delay = Math.random() * 20000 + 10000; // 10-30 seconds
        rocketTimerRef.current = setTimeout(() => {
          if (currentTheme === 'space' && isGameActive) {
            triggerRocketAnimation();
          }
          scheduleNextRocket();
        }, delay);
      };
      
      scheduleNextRocket();
      
      return () => {
        if (rocketTimerRef.current) {
          clearTimeout(rocketTimerRef.current);
        }
        if (rocketAnimationRef.current) {
          cancelAnimationFrame(rocketAnimationRef.current);
        }
      };
    }
  }, [currentTheme, isGameActive]);

  // Cat walking animation function
  const triggerCatAnimation = useCallback(() => {
    setCatVisible(true);
    setCatPosition(-100);
    setCatFrame(0);
    
    const animateCat = () => {
      setCatPosition(prev => {
        const newPos = prev + 1.5; // Walking speed
        if (newPos > CANVAS_WIDTH + 100) {
          setCatVisible(false);
          return -100;
        }
        return newPos;
      });
      
      // Animate walking frames (4 frame cycle)
      setCatFrame(prev => (prev + 1) % 4);
      
      if (catPosition < CANVAS_WIDTH + 100) {
        catAnimationRef.current = requestAnimationFrame(animateCat);
      }
    };
    
    catAnimationRef.current = requestAnimationFrame(animateCat);
  }, [catPosition]);

  // Dolphin swimming animation function
  const triggerDolphinAnimation = useCallback(() => {
    setDolphinVisible(true);
    setDolphinPosition(-120);
    setDolphinFrame(0);
    
    const animateDolphin = () => {
      setDolphinPosition(prev => {
        const newPos = prev + 2.5; // Swimming speed (faster than cat)
        if (newPos > CANVAS_WIDTH + 120) {
          setDolphinVisible(false);
          return -120;
        }
        return newPos;
      });
      
      // Animate swimming frames (6 frame cycle for smoother motion)
      setDolphinFrame(prev => (prev + 1) % 6);
      
      if (dolphinPosition < CANVAS_WIDTH + 120) {
        dolphinAnimationRef.current = requestAnimationFrame(animateDolphin);
      }
    };
    
    dolphinAnimationRef.current = requestAnimationFrame(animateDolphin);
  }, [dolphinPosition]);

  // Rocket launch animation function
  const triggerRocketAnimation = useCallback(() => {
    setRocketVisible(true);
    setRocketPosition(CANVAS_HEIGHT + 50); // Start below canvas
    setRocketFrame(0);
    // Random X position for launch (avoid edges)
    setRocketX(Math.random() * (CANVAS_WIDTH - 80) + 40);
    
    const animateRocket = () => {
      setRocketPosition(prev => {
        const newPos = prev - 4; // Launch speed (upward movement)
        if (newPos < -100) {
          setRocketVisible(false);
          return CANVAS_HEIGHT + 50;
        }
        return newPos;
      });
      
      // Animate rocket flames (8 frame cycle for flickering effect)
      setRocketFrame(prev => (prev + 1) % 8);
      
      if (rocketPosition > -100) {
        rocketAnimationRef.current = requestAnimationFrame(animateRocket);
      }
    };
    
    rocketAnimationRef.current = requestAnimationFrame(animateRocket);
  }, [rocketPosition]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      if (catTimerRef.current) {
        clearTimeout(catTimerRef.current);
      }
      if (catAnimationRef.current) {
        cancelAnimationFrame(catAnimationRef.current);
      }
      if (dolphinTimerRef.current) {
        clearTimeout(dolphinTimerRef.current);
      }
      if (dolphinAnimationRef.current) {
        cancelAnimationFrame(dolphinAnimationRef.current);
      }
      if (rocketTimerRef.current) {
        clearTimeout(rocketTimerRef.current);
      }
      if (rocketAnimationRef.current) {
        cancelAnimationFrame(rocketAnimationRef.current);
      }
    };
  }, []);

  // Game rendering function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const theme = THEMES[currentTheme];
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw background
    if (theme.background.type === 'gradient') {
      const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      gradient.addColorStop(0, theme.background.primary);
      gradient.addColorStop(1, theme.background.secondary || theme.background.primary);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = theme.background.primary;
    }
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw center line
    ctx.strokeStyle = theme.ui.centerLine;
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw AI paddle (left side) with rounded ends
    ctx.fillStyle = theme.paddles.ai;
    const aiPaddleRadius = Math.min(aiPaddle.width, aiPaddle.height) / 2;
    drawRoundedRect(ctx, aiPaddle.x, aiPaddle.y, aiPaddle.width, aiPaddle.height, aiPaddleRadius);
    ctx.fill();
    
    // Draw player paddle with enhanced visual feedback based on engagement state
    const isTargetApproaching = ball.word.isTarget && ball.vx > 0 && ball.x > CANVAS_WIDTH / 2;
    
    // Different visual states based on paddle engagement
    if (paddleEngaged && cursorOnScreen) {
      // Engaged and active - bright highlight
      ctx.fillStyle = theme.paddles.player;
      ctx.strokeStyle = '#00FF00'; // Bright green for engaged
      ctx.lineWidth = 3;
      const highlightRadius = Math.min(playerPaddle.width + 4, playerPaddle.height + 4) / 2;
      drawRoundedRect(ctx, playerPaddle.x - 2, playerPaddle.y - 2, playerPaddle.width + 4, playerPaddle.height + 4, highlightRadius);
      ctx.stroke();
      
      // Add glow effect
      ctx.shadowColor = '#00FF00';
      ctx.shadowBlur = 10;
    } else if (paddleEngaged && !cursorOnScreen) {
      // Engaged but cursor off screen - yellow warning
      ctx.fillStyle = theme.paddles.player;
      ctx.strokeStyle = '#FFD700'; // Yellow warning
      ctx.lineWidth = 3;
      const warningRadius = Math.min(playerPaddle.width + 4, playerPaddle.height + 4) / 2;
      drawRoundedRect(ctx, playerPaddle.x - 2, playerPaddle.y - 2, playerPaddle.width + 4, playerPaddle.height + 4, warningRadius);
      ctx.stroke();
    } else {
      // Not engaged - subtle hint
      ctx.fillStyle = theme.paddles.player;
      if (showPaddleHint && isGameActive) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        const hintRadius = Math.min(playerPaddle.width + 2, playerPaddle.height + 2) / 2;
        drawRoundedRect(ctx, playerPaddle.x - 1, playerPaddle.y - 1, playerPaddle.width + 2, playerPaddle.height + 2, hintRadius);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    
    // Add glow effect for target words
    if (isTargetApproaching && paddleEngaged) {
      ctx.shadowColor = theme.effects.targetGlow;
      ctx.shadowBlur = 20;
    }
    
    // Draw player paddle with rounded ends
    const playerPaddleRadius = Math.min(playerPaddle.width, playerPaddle.height) / 2;
    drawRoundedRect(ctx, playerPaddle.x, playerPaddle.y, playerPaddle.width, playerPaddle.height, playerPaddleRadius);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ensure pixel-perfect ball positioning for crisp rendering
    const ballX = Math.round(ball.x);
    const ballY = Math.round(ball.y);
    
    // Draw ball (same color regardless of word type to not give away answer)
    ctx.fillStyle = theme.ball.target;
    ctx.beginPath();
    ctx.arc(ballX, ballY, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Pre-rendered text approach for crisp, non-blurry text at high speeds
    const maxWidth = ball.radius * 1.6;
    let fontSize = Math.max(14, Math.min(24, ball.radius * 0.7));
    fontSize = Math.round(fontSize); // Pixel-perfect size

    // Use the reusable text renderer utility for crisp text
    defaultTextRenderer.drawPreRenderedText(
      ctx,
      ball.word.text,
      ballX,
      ballY,
      {
        fontSize,
        color: theme.text.target, // Always use same color to not give away answer
        fontFamily: theme.text.fontFamily,
        maxWidth,
        bold: true
      },
      true // centered
    );

    // Draw UI elements
    drawUI(ctx, theme);

    // Draw particle effects if any
    drawParticleEffects(ctx, theme);

    // Draw cat animation for Enchanted Forest theme
    if (currentTheme === 'forest' && catVisible) {
      drawCat(ctx);
    }

    // Draw dolphin animation for Ocean Depths theme
    if (currentTheme === 'ocean' && dolphinVisible) {
      drawDolphin(ctx);
    }

    // Draw rocket animation for Space Adventure theme
    if (currentTheme === 'space' && rocketVisible) {
      drawRocket(ctx);
    }

  }, [ball, playerPaddle, aiPaddle, currentTheme, score, level, paddleEngaged, cursorOnScreen, showPaddleHint, isGameActive, catVisible, catPosition, catFrame, dolphinVisible, dolphinPosition, dolphinFrame, rocketVisible, rocketPosition, rocketFrame, rocketX]);

  // Helper function to draw rounded rectangles
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  // Draw UI function
  const drawUI = (ctx: CanvasRenderingContext2D, theme: GameTheme) => {
    // Only draw paddle control status and hints
    ctx.font = `14px ${theme.text.fontFamily}`;
    ctx.fillStyle = theme.text.primary;
    ctx.textAlign = 'center';
    
    if (!ballMoving && isGameActive) {
      // Ball hasn't started yet - show start hint
      ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
      ctx.fillText('🚀 Click on your paddle to start the ball!', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);
    } else if (!paddleEngaged && showPaddleHint && isGameActive) {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
      ctx.fillText('👆 Click on your paddle to start controlling it!', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);
    } else if (paddleEngaged && !cursorOnScreen && isGameActive) {
      ctx.fillStyle = 'rgba(255, 165, 0, 0.9)';
      ctx.fillText('⚠️ Move mouse back over game area to control paddle', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);
    } else if (paddleEngaged && cursorOnScreen && isGameActive) {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
      ctx.fillText('✅ Paddle engaged - following your cursor', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
    }
  };

  // Particle effects placeholder
  const drawParticleEffects = (ctx: CanvasRenderingContext2D, theme: GameTheme) => {
    // This would be expanded to show particle effects on hits, misses, etc.
    // For now, just a placeholder
  };

  // Cat sprite drawing function for Enchanted Forest theme
  const drawCat = (ctx: CanvasRenderingContext2D) => {
    const catWidth = 60;
    const catHeight = 40;
    const catY = CANVAS_HEIGHT - catHeight - 10; // Near bottom of canvas
    
    // Cat body (main shape)
    ctx.fillStyle = '#8B4513'; // Brown cat
    ctx.fillRect(catPosition, catY, catWidth * 0.7, catHeight * 0.6);
    
    // Cat head
    ctx.beginPath();
    ctx.arc(catPosition + catWidth * 0.8, catY + catHeight * 0.3, catHeight * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Cat ears
    ctx.beginPath();
    ctx.moveTo(catPosition + catWidth * 0.65, catY + catHeight * 0.1);
    ctx.lineTo(catPosition + catWidth * 0.75, catY - catHeight * 0.1);
    ctx.lineTo(catPosition + catWidth * 0.85, catY + catHeight * 0.1);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(catPosition + catWidth * 0.75, catY + catHeight * 0.1);
    ctx.lineTo(catPosition + catWidth * 0.85, catY - catHeight * 0.1);
    ctx.lineTo(catPosition + catWidth * 0.95, catY + catHeight * 0.1);
    ctx.fill();
    
    // Cat tail (animated swish)
    const tailSway = Math.sin(catFrame * 0.5) * 10;
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(catPosition - catWidth * 0.1, catY + catHeight * 0.3);
    ctx.quadraticCurveTo(
      catPosition - catWidth * 0.3 + tailSway, 
      catY - catHeight * 0.2, 
      catPosition - catWidth * 0.2, 
      catY - catHeight * 0.4
    );
    ctx.stroke();
    
    // Walking legs animation (4 frame cycle)
    const legOffset = Math.sin(catFrame * 0.8) * 5;
    ctx.fillStyle = '#654321'; // Darker brown for legs
    
    // Front legs
    ctx.fillRect(catPosition + catWidth * 0.15 + legOffset, catY + catHeight * 0.5, 6, catHeight * 0.4);
    ctx.fillRect(catPosition + catWidth * 0.25 - legOffset, catY + catHeight * 0.5, 6, catHeight * 0.4);
    
    // Back legs
    ctx.fillRect(catPosition + catWidth * 0.45 - legOffset, catY + catHeight * 0.5, 6, catHeight * 0.4);
    ctx.fillRect(catPosition + catWidth * 0.55 + legOffset, catY + catHeight * 0.5, 6, catHeight * 0.4);
    
    // Cat eyes
    ctx.fillStyle = '#FFD700'; // Golden eyes
    ctx.beginPath();
    ctx.arc(catPosition + catWidth * 0.75, catY + catHeight * 0.25, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(catPosition + catWidth * 0.85, catY + catHeight * 0.25, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Cat pupils
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(catPosition + catWidth * 0.75, catY + catHeight * 0.25, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(catPosition + catWidth * 0.85, catY + catHeight * 0.25, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Cat stripes (tabby pattern)
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(catPosition + catWidth * 0.1 + i * 15, catY + catHeight * 0.2);
      ctx.lineTo(catPosition + catWidth * 0.2 + i * 15, catY + catHeight * 0.5);
      ctx.stroke();
    }
    
    // Whiskers
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    // Left whiskers
    ctx.beginPath();
    ctx.moveTo(catPosition + catWidth * 0.65, catY + catHeight * 0.35);
    ctx.lineTo(catPosition + catWidth * 0.5, catY + catHeight * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(catPosition + catWidth * 0.65, catY + catHeight * 0.4);
    ctx.lineTo(catPosition + catWidth * 0.5, catY + catHeight * 0.4);
    ctx.stroke();
    
    // Right whiskers
    ctx.beginPath();
    ctx.moveTo(catPosition + catWidth * 0.95, catY + catHeight * 0.35);
    ctx.lineTo(catPosition + catWidth * 1.1, catY + catHeight * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(catPosition + catWidth * 0.95, catY + catHeight * 0.4);
    ctx.lineTo(catPosition + catWidth * 1.1, catY + catHeight * 0.4);
    ctx.stroke();
  };

  // Dolphin sprite drawing function for Ocean Depths theme
  const drawDolphin = (ctx: CanvasRenderingContext2D) => {
    const dolphinWidth = 80;
    const dolphinHeight = 40;
    const dolphinY = CANVAS_HEIGHT / 2 - dolphinHeight / 2; // Middle of canvas
    
    // Swimming motion - gentle up and down movement
    const swimOffset = Math.sin(dolphinFrame * 0.3) * 8;
    const currentY = dolphinY + swimOffset;
    
    // Dolphin body (main torpedo shape)
    ctx.fillStyle = '#4682B4'; // Steel blue dolphin
    ctx.beginPath();
    ctx.ellipse(
      dolphinPosition + dolphinWidth * 0.5, 
      currentY + dolphinHeight * 0.5, 
      dolphinWidth * 0.4, 
      dolphinHeight * 0.25, 
      0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Dolphin head/snout
    ctx.beginPath();
    ctx.ellipse(
      dolphinPosition + dolphinWidth * 0.8, 
      currentY + dolphinHeight * 0.5, 
      dolphinWidth * 0.15, 
      dolphinHeight * 0.15, 
      0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Dorsal fin
    ctx.beginPath();
    ctx.moveTo(dolphinPosition + dolphinWidth * 0.4, currentY + dolphinHeight * 0.25);
    ctx.lineTo(dolphinPosition + dolphinWidth * 0.5, currentY - dolphinHeight * 0.1);
    ctx.lineTo(dolphinPosition + dolphinWidth * 0.6, currentY + dolphinHeight * 0.25);
    ctx.fill();
    
    // Tail fin (animated with swimming motion)
    const tailSway = Math.sin(dolphinFrame * 0.4) * 15;
    ctx.beginPath();
    ctx.moveTo(dolphinPosition + dolphinWidth * 0.1, currentY + dolphinHeight * 0.5);
    ctx.lineTo(dolphinPosition - dolphinWidth * 0.1, currentY + dolphinHeight * 0.3 + tailSway);
    ctx.lineTo(dolphinPosition - dolphinWidth * 0.05, currentY + dolphinHeight * 0.5);
    ctx.lineTo(dolphinPosition - dolphinWidth * 0.1, currentY + dolphinHeight * 0.7 - tailSway);
    ctx.closePath();
    ctx.fill();
    
    // Pectoral fins
    ctx.beginPath();
    ctx.ellipse(
      dolphinPosition + dolphinWidth * 0.45, 
      currentY + dolphinHeight * 0.65, 
      dolphinWidth * 0.12, 
      dolphinHeight * 0.08, 
      0.3, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Dolphin eye
    ctx.fillStyle = '#000080'; // Dark blue eye
    ctx.beginPath();
    ctx.arc(dolphinPosition + dolphinWidth * 0.7, currentY + dolphinHeight * 0.4, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye highlight
    ctx.fillStyle = '#87CEEB'; // Light blue highlight
    ctx.beginPath();
    ctx.arc(dolphinPosition + dolphinWidth * 0.72, currentY + dolphinHeight * 0.38, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Dolphin stripes/markings
    ctx.strokeStyle = '#5F9EA0'; // Cadet blue
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dolphinPosition + dolphinWidth * 0.3, currentY + dolphinHeight * 0.35);
    ctx.quadraticCurveTo(
      dolphinPosition + dolphinWidth * 0.5, 
      currentY + dolphinHeight * 0.25, 
      dolphinPosition + dolphinWidth * 0.7, 
      currentY + dolphinHeight * 0.35
    );
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(dolphinPosition + dolphinWidth * 0.25, currentY + dolphinHeight * 0.65);
    ctx.quadraticCurveTo(
      dolphinPosition + dolphinWidth * 0.45, 
      currentY + dolphinHeight * 0.75, 
      dolphinPosition + dolphinWidth * 0.65, 
      currentY + dolphinHeight * 0.65
    );
    ctx.stroke();
    
    // Bubble trail (swimming effect)
    if (dolphinFrame % 8 === 0) { // Create bubbles periodically
      for (let i = 0; i < 3; i++) {
        const bubbleX = dolphinPosition - 20 - (i * 15);
        const bubbleY = currentY + dolphinHeight * 0.3 + (Math.random() - 0.5) * 20;
        
        ctx.fillStyle = 'rgba(173, 216, 230, 0.6)'; // Light blue bubbles
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, 2 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
             }
     }
   };

  // Rocket sprite drawing function for Space Adventure theme
  const drawRocket = (ctx: CanvasRenderingContext2D) => {
    const rocketWidth = 30;
    const rocketHeight = 80;
    const currentX = rocketX;
    const currentY = rocketPosition;
    
    // Rocket body (main cylinder)
    ctx.fillStyle = '#C0C0C0'; // Silver rocket body
    ctx.fillRect(currentX, currentY, rocketWidth, rocketHeight * 0.7);
    
    // Rocket nose cone
    ctx.fillStyle = '#FF4500'; // Orange red nose
    ctx.beginPath();
    ctx.moveTo(currentX, currentY);
    ctx.lineTo(currentX + rocketWidth / 2, currentY - rocketHeight * 0.3);
    ctx.lineTo(currentX + rocketWidth, currentY);
    ctx.closePath();
    ctx.fill();
    
    // Rocket fins
    ctx.fillStyle = '#8B0000'; // Dark red fins
    // Left fin
    ctx.beginPath();
    ctx.moveTo(currentX - rocketWidth * 0.2, currentY + rocketHeight * 0.5);
    ctx.lineTo(currentX, currentY + rocketHeight * 0.7);
    ctx.lineTo(currentX, currentY + rocketHeight * 0.4);
    ctx.closePath();
    ctx.fill();
    
    // Right fin
    ctx.beginPath();
    ctx.moveTo(currentX + rocketWidth + rocketWidth * 0.2, currentY + rocketHeight * 0.5);
    ctx.lineTo(currentX + rocketWidth, currentY + rocketHeight * 0.7);
    ctx.lineTo(currentX + rocketWidth, currentY + rocketHeight * 0.4);
    ctx.closePath();
    ctx.fill();
    
    // Rocket window/porthole
    ctx.fillStyle = '#87CEEB'; // Sky blue window
    ctx.beginPath();
    ctx.arc(currentX + rocketWidth / 2, currentY + rocketHeight * 0.25, rocketWidth * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Window frame
    ctx.strokeStyle = '#2F4F4F'; // Dark slate gray
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(currentX + rocketWidth / 2, currentY + rocketHeight * 0.25, rocketWidth * 0.15, 0, Math.PI * 2);
    ctx.stroke();
    
    // Rocket details/panels
    ctx.strokeStyle = '#696969'; // Dim gray
    ctx.lineWidth = 1;
    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(currentX + rocketWidth * 0.1, currentY + rocketHeight * 0.15);
    ctx.lineTo(currentX + rocketWidth * 0.9, currentY + rocketHeight * 0.15);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(currentX + rocketWidth * 0.1, currentY + rocketHeight * 0.45);
    ctx.lineTo(currentX + rocketWidth * 0.9, currentY + rocketHeight * 0.45);
    ctx.stroke();
    
    // Exhaust flames (animated)
    const flameHeight = 40 + Math.sin(rocketFrame * 0.8) * 15; // Flickering height
    const flameIntensity = 0.7 + Math.sin(rocketFrame * 1.2) * 0.3; // Flickering intensity
    
    // Main flame (orange/red)
    ctx.fillStyle = `rgba(255, 69, 0, ${flameIntensity})`; // Orange red
    ctx.beginPath();
    ctx.moveTo(currentX + rocketWidth * 0.2, currentY + rocketHeight * 0.7);
    ctx.lineTo(currentX + rocketWidth / 2, currentY + rocketHeight * 0.7 + flameHeight);
    ctx.lineTo(currentX + rocketWidth * 0.8, currentY + rocketHeight * 0.7);
    ctx.closePath();
    ctx.fill();
    
    // Inner flame (yellow/white)
    ctx.fillStyle = `rgba(255, 255, 0, ${flameIntensity * 0.8})`; // Yellow
    ctx.beginPath();
    ctx.moveTo(currentX + rocketWidth * 0.3, currentY + rocketHeight * 0.7);
    ctx.lineTo(currentX + rocketWidth / 2, currentY + rocketHeight * 0.7 + flameHeight * 0.7);
    ctx.lineTo(currentX + rocketWidth * 0.7, currentY + rocketHeight * 0.7);
    ctx.closePath();
    ctx.fill();
    
    // Core flame (white hot)
    ctx.fillStyle = `rgba(255, 255, 255, ${flameIntensity * 0.6})`; // White
    ctx.beginPath();
    ctx.moveTo(currentX + rocketWidth * 0.4, currentY + rocketHeight * 0.7);
    ctx.lineTo(currentX + rocketWidth / 2, currentY + rocketHeight * 0.7 + flameHeight * 0.4);
    ctx.lineTo(currentX + rocketWidth * 0.6, currentY + rocketHeight * 0.7);
    ctx.closePath();
    ctx.fill();
    
    // Exhaust particles/sparks
    if (rocketFrame % 3 === 0) { // Create sparks periodically
      for (let i = 0; i < 5; i++) {
        const sparkX = currentX + rocketWidth * 0.3 + Math.random() * rocketWidth * 0.4;
        const sparkY = currentY + rocketHeight * 0.8 + Math.random() * 30;
        
        ctx.fillStyle = `rgba(255, ${100 + Math.random() * 155}, 0, 0.8)`; // Random orange sparks
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 1 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Smoke trail (fading particles)
    if (rocketFrame % 4 === 0) {
      for (let i = 0; i < 3; i++) {
        const smokeX = currentX + rocketWidth / 2 + (Math.random() - 0.5) * 20;
        const smokeY = currentY + rocketHeight + 20 + (i * 15);
        
        ctx.fillStyle = `rgba(169, 169, 169, ${0.4 - i * 0.1})`; // Fading gray smoke
        ctx.beginPath();
        ctx.arc(smokeX, smokeY, 3 + i, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameState === 'playing') {
      // Calculate and track ball speed for debugging
      const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      setCurrentBallSpeed(ballSpeed);
      
      // Update ball position and handle collisions
      const hitResult = updateBall();
      
      if (hitResult) {
        if (hitResult.type === 'bounce') {
          playBounceSound();
        }
        // All other hit types (correct, wrong, aiCorrect, aiWrong, aiMiss, levelUp) 
        // now play silently for a more focused audio experience
      }

      render();
    } else if (gameState === 'gameOver') {
      // Handle game completion and high score processing
      if (onGameComplete) {
        onGameComplete(score, timeElapsed);
      }
      // Save high score using the modularized system
      if (configId) {
        saveHighScore(score, playerName);
      }
    }

    if (gameState !== 'idle') {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameState, updateBall, render, score, timeElapsed, onGameComplete, configId, playerName, saveHighScore, playBounceSound, ball]);

  // Start game loop when game becomes active
  useEffect(() => {
    if (gameState === 'playing') {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, gameLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleGameStart = () => {
    startGame();
  };

  const handleGamePause = () => {
    if (gameState === 'playing') {
      pauseGame();
    } else if (gameState === 'paused') {
      resumeGame();
    }
  };

  const handleGameReset = () => {
    resetGame();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="word-volley-game">
      <PWAGameHeader 
        gameTitle="Pong"
        variant="compact"
      />
      
      <div className="game-container">
        {/* Game Info Section - Above Canvas */}
        <div style={{
          padding: '12px 24px',
          background: '#f8f9fa',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '-12px',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Scores and Timer Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#dc2626'
            }}>
              AI: {aiScore}
            </div>
            
            <div style={{
              fontSize: '1.4rem',
              fontWeight: 'bold',
              color: timeRemaining <= 30 ? '#dc2626' : timeRemaining <= 60 ? '#ea580c' : '#1f2937',
              textAlign: 'center',
              animation: timeRemaining <= 30 ? 'pulse 1s ease-in-out infinite' : 'none'
            }}>
              ⏰ {formatCountdown(timeRemaining)}
            </div>
            
            <div style={{
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#2563eb'
            }}>
              Player: {score}
            </div>
          </div>
          
          {/* Category Instruction */}
          <div style={{
            textAlign: 'center',
            fontSize: '0.9rem',
            color: '#6b7280',
            fontWeight: '500',
            padding: '6px 12px',
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '6px',
            border: '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            Hit: <strong style={{ color: '#059669' }}>{settings.categoryName}</strong> words | 
            Avoid: <strong style={{ color: '#dc2626' }}>Non-{settings.categoryName}</strong> words
          </div>

          {/* Speed Debug Information */}
          {showSpeedDebug && (
            <div style={{
              textAlign: 'center',
              fontSize: '0.8rem',
              color: '#374151',
              fontWeight: '500',
              padding: '4px 8px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '4px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              fontFamily: 'monospace'
            }}>
              Speed Debug: <strong>{currentBallSpeed.toFixed(2)} px/frame</strong> | 
              vx: <strong>{ball.vx.toFixed(2)}</strong>, vy: <strong>{ball.vy.toFixed(2)}</strong> | 
              Config: <strong>{settings.initialSpeed.toFixed(2)}</strong>
              <button 
                onClick={() => setShowSpeedDebug(false)}
                style={{
                  marginLeft: '8px',
                  padding: '2px 6px',
                  fontSize: '0.7rem',
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Hide
              </button>
            </div>
          )}
          
          {!showSpeedDebug && (
            <button 
              onClick={() => setShowSpeedDebug(true)}
              style={{
                padding: '4px 8px',
                fontSize: '0.8rem',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '4px',
                cursor: 'pointer',
                color: '#374151'
              }}
            >
              Show Speed Debug
            </button>
          )}
        </div>

        <div 
          className="canvas-container"
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onClick={handleCanvasClick}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchStart}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: paddleEngaged && cursorOnScreen ? 'none' : 'pointer' }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className={`game-canvas ball-text-optimized theme-${currentTheme} ${paddleEngaged ? 'paddle-engaged' : ''}`}
            style={{ touchAction: 'none' }}
          />
          

          
          {gameState === 'paused' && (
            <div className="game-overlay">
              <div className="pause-message">
                <h3>Game Paused</h3>
                <button 
                  className="resume-button"
                  onClick={handleGamePause}
                >
                  Resume
                </button>
              </div>
            </div>
          )}
          
          {gameState === 'gameOver' && !showHighScoreModal && (
            <div className="game-overlay">
              <div className="start-message">
                <h3>Game Complete!</h3>
                <p>Final Score: {score}</p>
                <p>Time: {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}</p>
                <p>Words Processed: {wordsProcessed}</p>
                <p>Level Reached: {level}</p>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '20px' }}>
                  <button 
                    className="start-button"
                    onClick={handleGameReset}
                  >
                    Play Again
                  </button>
                  
                  {/* Show View Leaderboard button for teachers */}
                  {isTeacher && (
                    <button 
                      className="start-button"
                      onClick={loadGeneralLeaderboard}
                      disabled={loadingGeneralScores}
                      style={{ 
                        background: loadingGeneralScores ? '#6c757d' : 'linear-gradient(135deg, #007bff, #0056b3)',
                        cursor: loadingGeneralScores ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {loadingGeneralScores ? '⏳ Loading...' : '🏆 View Leaderboard'}
                    </button>
                  )}
                  
                  {onGameExit && (
                    <button 
                      className="start-button"
                      onClick={onGameExit}
                      style={{ background: '#6c757d' }}
                    >
                      Exit Game
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Unified Game Controls Container */}
        <div style={{
          padding: '16px 24px',
          background: '#f8f9fa',
          borderRadius: '12px',
          marginTop: '0px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Game Control Buttons Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <button
              onClick={handleGamePause}
              disabled={gameState !== 'playing' && gameState !== 'paused'}
              style={{
                background: gameState !== 'playing' && gameState !== 'paused' ? '#6c757d' : 'linear-gradient(135deg, #ffc107, #fd7e14)',
                border: 'none',
                borderRadius: '20px',
                color: 'white',
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: gameState !== 'playing' && gameState !== 'paused' ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: gameState !== 'playing' && gameState !== 'paused' ? 0.6 : 1
              }}
            >
              {gameState === 'paused' ? '▶️ Resume' : '⏸️ Pause'}
            </button>

            <button
              onClick={handleGameReset}
              style={{
                background: 'linear-gradient(135deg, #dc3545, #e83e8c)',
                border: 'none',
                borderRadius: '20px',
                color: 'white',
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🔄 Reset
            </button>

            <button
              onClick={toggleMute}
              style={{
                background: 'linear-gradient(135deg, #6f42c1, #e83e8c)',
                border: 'none',
                borderRadius: '20px',
                color: 'white',
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {isMuted ? '🔇 Unmute' : '🔊 Mute'}
            </button>

            <button
              onClick={toggleTextToSpeech}
              style={{
                background: 'linear-gradient(135deg, #17a2b8, #20c997)',
                border: 'none',
                borderRadius: '20px',
                color: 'white',
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {isTextToSpeechEnabled ? '🗣️ TTS On' : '🔇 TTS Off'}
            </button>

            {/* Leaderboard button for teachers */}
            {isTeacher && (
              <button
                onClick={loadGeneralLeaderboard}
                disabled={loadingGeneralScores}
                style={{
                  background: loadingGeneralScores ? '#6c757d' : 'linear-gradient(135deg, #007bff, #0056b3)',
                  border: 'none',
                  borderRadius: '20px',
                  color: 'white',
                  padding: '10px 20px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: loadingGeneralScores ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {loadingGeneralScores ? '⏳ Loading...' : '🏆 Leaderboard'}
              </button>
            )}
          </div>

                      {/* Second Row: Theme Selector and Scoring Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
            {/* Theme Dropdown */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <label style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#495057'
              }}>
                🎨 Theme:
              </label>
              <select
                value={currentTheme}
                onChange={(e) => {
                  const newTheme = e.target.value as ThemeType;
                  setCurrentTheme(newTheme);
                  console.log('Theme changed to:', newTheme);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '15px',
                  border: '2px solid #dee2e6',
                  background: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#495057',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#dee2e6';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="classic">Classic Pong</option>
                <option value="space">Space Adventure</option>
                <option value="neon">Neon Cyber</option>
                <option value="ocean">Ocean Depths</option>
                <option value="forest">Enchanted Forest</option>
              </select>
            </div>

            {/* Scoring Button */}
            <button 
              onClick={() => setShowScoringModal(true)}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '20px',
                color: 'white',
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
              }}
            >
              📊 How Scoring Works
            </button>
          </div>
        </div>


      </div>

      {/* Scoring Modal */}
      {showScoringModal && (
        <div className="game-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
          <div className="start-message" style={{ maxWidth: '700px', width: '95%' }}>
            <h3>📊 How Scoring Works</h3>
            
            <div style={{ 
              display: 'flex', 
              gap: '20px', 
              marginBottom: '20px',
              flexWrap: 'wrap'
            }}>
              {/* Player Scoring Column */}
              <div style={{ flex: '1', minWidth: '300px', textAlign: 'left' }}>
                <h4 style={{ color: '#4CAF50', marginBottom: '10px' }}>🎯 Player Scoring</h4>
                <div style={{ marginBottom: '15px' }}>
                  <strong style={{ color: '#4CAF50' }}>Positive Points:</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li><strong>+10 points</strong> - When you hit a target word (correct category)</li>
                    <li><strong>+10 points</strong> - When the AI misses a target word (bonus for AI mistakes)</li>
                  </ul>
                </div>
                <div>
                  <strong style={{ color: '#f44336' }}>Negative Points:</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li><strong>-5 points</strong> - When you hit a non-target word (wrong category)</li>
                    <li><strong>-5 points</strong> - When you miss a target word (ball goes off your side)</li>
                  </ul>
                </div>
              </div>

              {/* AI Scoring Column */}
              <div style={{ flex: '1', minWidth: '300px', textAlign: 'left' }}>
                <h4 style={{ color: '#FF9800', marginBottom: '10px' }}>🤖 AI Scoring</h4>
                <div style={{ marginBottom: '15px' }}>
                  <strong style={{ color: '#4CAF50' }}>Positive Points:</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li><strong>+10 points</strong> - When AI hits a target word (AI plays correctly)</li>
                  </ul>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong style={{ color: '#f44336' }}>Negative Points:</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li><strong>-5 points</strong> - When AI hits a non-target word (AI makes mistake)</li>
                  </ul>
                </div>
                <div>
                  <strong style={{ color: '#757575' }}>No penalty:</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li>When AI misses a target word (you get the bonus instead)</li>
                    <li>When AI correctly avoids a non-target word</li>
                  </ul>
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'rgba(33, 150, 243, 0.1)', 
              border: '1px solid rgba(33, 150, 243, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <strong style={{ color: '#2196F3' }}>💡 Pro Tip:</strong> You score best by hitting target words and capitalizing on AI mistakes!
            </div>

            <button 
              className="start-button"
              onClick={() => setShowScoringModal(false)}
              style={{ marginTop: '10px' }}
            >
              Got It!
            </button>
          </div>
        </div>
      )}

      {/* Modularized High Score Modal */}
      <HighScoreModal
        isOpen={showHighScoreModal}
        onClose={() => setShowHighScoreModal(false)}
        score={score}
        isNewHighScore={isNewHighScore}
        highScores={highScores}
        scoringSystem="points-based"
        gameTitle="Word Volley"
        timeElapsed={timeElapsed}
        additionalStats={[
          { label: 'Words Processed', value: wordsProcessed, colorScheme: 'blue' },
          { label: 'Level Reached', value: level, colorScheme: 'purple' },
          { label: 'Category', value: settings.categoryName || 'Words', colorScheme: 'green' }
        ]}
        isSubmittingScore={isSubmittingScore}
        onPlayAgain={handleGameReset}
        customActions={onGameExit ? [
          {
            label: 'Exit Game',
            onClick: onGameExit,
            colorScheme: 'gray',
            variant: 'outline'
          }
        ] : undefined}
      />

      {/* General Leaderboard Modal for Teachers */}
      <HighScoreModal
        isOpen={showGeneralLeaderboard}
        onClose={() => setShowGeneralLeaderboard(false)}
        score={score}
        isNewHighScore={false} // Teachers viewing general leaderboard won't have new high score
        highScores={generalHighScores}
        scoringSystem="points-based"
        gameTitle="Word Volley - General Leaderboard"
        timeElapsed={timeElapsed}
        additionalStats={[
          { label: 'Words Processed', value: wordsProcessed, colorScheme: 'blue' },
          { label: 'Level Reached', value: level, colorScheme: 'purple' },
          { label: 'Your Score', value: score, colorScheme: 'orange' }
        ]}
        isSubmittingScore={false}
        onPlayAgain={handleGameReset}
        customActions={[
          {
            label: 'Close Leaderboard',
            onClick: () => setShowGeneralLeaderboard(false),
            colorScheme: 'blue',
            variant: 'solid'
          },
          ...(onGameExit ? [
            {
              label: 'Exit Game',
              onClick: onGameExit,
              colorScheme: 'gray',
              variant: 'outline'
            }
          ] : [])
        ]}
      />
    </div>
  );
}; 