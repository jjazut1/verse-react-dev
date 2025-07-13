import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, SelectionState, Card } from './types';
import { PlaceValueShowdownConfig } from '../../../types/game';
import { 
  generateCards, 
  makeTeacherMove, 
  calculateNumber, 
  determineRoundWinner,
  areAllCardsPlaced 
} from './utils';

/**
 * Custom hook for managing Place Value Showdown game logic and state
 */
export const useGameLogic = (
  config: PlaceValueShowdownConfig,
  onGameComplete: (score: number) => void
) => {
  // DEBUG: Log the actual config values being used
  console.log('🔧 [PlaceValueShowdown] Config values received:', {
    numberOfCards: config.numberOfCards,
    includeDecimal: config.includeDecimal,
    decimalPlaces: config.decimalPlaces,
    totalSlots: config.numberOfCards + (config.includeDecimal ? config.decimalPlaces : 0),
    fullConfig: config
  });

  const [gameState, setGameState] = useState<GameState>({
    phase: 'dealing',
    round: 0,
    studentScore: 0,
    teacherScore: 0,
    studentCards: [],
    teacherCards: [],
    studentNumber: null,
    teacherNumber: null,
    roundWinner: null,
    message: `🟢 In this game, each of you will be dealt ${config.numberOfCards}${config.includeDecimal ? ` + ${config.decimalPlaces} decimal` : ''} digit cards. Your mission is to drag and drop them into the slots to create the ${config.objective} number possible! The winner of each round earns 1 point! First to ${config.winningScore} points wins!`,
    isStudentReady: false,
    isTeacherReady: false,
  });

  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedCard: null,
    isCardSelected: false,
    ghostPosition: { x: 0, y: 0 }
  });

  const gameStartedRef = useRef(false);

  // Start a new round
  const startNewRound = useCallback(() => {
    const studentCards = generateCards(config);
    const teacherCards = generateCards(config);
    
    setGameState(prev => ({
      ...prev,
      phase: 'dealing',
      round: prev.round + 1,
      studentCards,
      teacherCards,
      studentNumber: null,
      teacherNumber: null,
      roundWinner: null,
      isStudentReady: false,
      isTeacherReady: false,
      message: '🎴 Shuffling the cards...'
    }));

    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        phase: 'arranging',
        message: `Now, arrange your cards to make the ${config.objective} number possible! Just click and drag your cards into the number slots.`
      }));

      // AI teacher makes move after random delay
      setTimeout(() => {
        setGameState(prev => {
          const arrangedTeacherCards = makeTeacherMove(prev.teacherCards, config);
          return {
            ...prev,
            teacherCards: arrangedTeacherCards,
            isTeacherReady: true
          };
        });
      }, 2000 + Math.random() * 3000);
    }, 1500);
  }, [config]);

  // Auto-start the first round when component mounts
  useEffect(() => {
    if (!gameStartedRef.current) {
      gameStartedRef.current = true;
      setTimeout(() => {
        const totalCards = config.numberOfCards + (config.includeDecimal ? config.decimalPlaces : 0);
        setGameState(prev => ({
          ...prev,
          message: `📣 Let's get started! ${config.includeDecimal ? `We'll be working with ${config.numberOfCards} whole number cards and ${config.decimalPlaces} decimal place cards.` : `We'll be working with ${config.numberOfCards} digit cards.`}`
        }));
        
        setTimeout(() => {
          startNewRound();
        }, 1500);
      }, 3000);
    }
  }, [startNewRound, config]);

  // Check if round is complete and reveal results
  useEffect(() => {
    if (gameState.isStudentReady && gameState.isTeacherReady && gameState.phase === 'arranging') {
      const studentNum = calculateNumber(gameState.studentCards, config);
      const teacherNum = calculateNumber(gameState.teacherCards, config);
      const winner = determineRoundWinner(studentNum, teacherNum, config.objective);

      // Update scores immediately when round is complete
      const updatedStudentScore = gameState.studentScore + (winner === 'student' ? 1 : 0);
      const updatedTeacherScore = gameState.teacherScore + (winner === 'teacher' ? 1 : 0);

      setGameState(prev => ({
        ...prev,
        phase: 'revealing',
        studentNumber: studentNum,
        teacherNumber: teacherNum,
        roundWinner: winner,
        studentScore: updatedStudentScore,
        teacherScore: updatedTeacherScore,
        message: "Let's see who made the better number!"
      }));

      // Check if game is complete
      if (updatedStudentScore >= config.winningScore || updatedTeacherScore >= config.winningScore) {
        setTimeout(() => {
          const gameWinner = updatedStudentScore > updatedTeacherScore ? config.playerName : config.teacherName;
          setGameState(prev => ({
            ...prev,
            phase: 'gameComplete',
            message: `🎉 That's game! The final score is: ${config.teacherName} ${updatedTeacherScore}, ${config.playerName} ${updatedStudentScore}. And the grand winner is... ${gameWinner}! Great job practicing place value!`
          }));
        }, 2000); // Give time to see the round results before showing game complete message
      }
    }
  }, [gameState.isStudentReady, gameState.isTeacherReady, gameState.phase, gameState.studentScore, gameState.teacherScore, config]);

  // Check if student is ready when all cards are placed
  useEffect(() => {
    const isReady = areAllCardsPlaced(gameState.studentCards, config);
    if (isReady && !gameState.isStudentReady) {
      setGameState(prev => ({ ...prev, isStudentReady: true }));
    }
  }, [gameState.studentCards, config, gameState.isStudentReady]);

  // Handle game completion
  useEffect(() => {
    if (gameState.phase === 'gameComplete') {
      const finalScore = gameState.studentScore;
      setTimeout(() => {
        onGameComplete(finalScore);
      }, 3000);
    }
  }, [gameState.phase, gameState.studentScore, onGameComplete]);

  // Handle card click for selection
  const handleCardClick = useCallback((card: Card, e: React.MouseEvent) => {
    if (gameState.phase !== 'arranging') return;
    
    if (selectionState.isCardSelected && selectionState.selectedCard?.id === card.id) {
      setSelectionState({
        selectedCard: null,
        isCardSelected: false,
        ghostPosition: { x: 0, y: 0 }
      });
    } else {
      setSelectionState({
        selectedCard: card,
        isCardSelected: true,
        ghostPosition: { x: e.clientX, y: e.clientY }
      });
    }
  }, [gameState.phase, selectionState.isCardSelected, selectionState.selectedCard?.id]);

  // Handle slot click for placing cards
  const handleSlotClick = useCallback((slotIndex: number) => {
    if (!selectionState.selectedCard || gameState.phase !== 'arranging') return;

    setGameState(prev => {
      const newCards = prev.studentCards.map(card => {
        if (card.id === selectionState.selectedCard!.id) {
          return { ...card, position: 'slot' as const, slotIndex };
        }
        if (card.slotIndex === slotIndex) {
          return { ...card, position: 'deck' as const, slotIndex: undefined };
        }
        return card;
      });

      return { ...prev, studentCards: newCards };
    });

    setSelectionState({
      selectedCard: null,
      isCardSelected: false,
      ghostPosition: { x: 0, y: 0 }
    });
  }, [selectionState.selectedCard, gameState.phase]);

  // Handle card return to deck
  const handleReturnToDeck = useCallback((card: Card) => {
    if (gameState.phase !== 'arranging') return;

    setGameState(prev => ({
      ...prev,
      studentCards: prev.studentCards.map(c => 
        c.id === card.id ? { ...c, position: 'deck', slotIndex: undefined } : c
      )
    }));
  }, [gameState.phase]);

  // Handle clicking on empty areas to deselect
  const handleGameAreaClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && selectionState.isCardSelected) {
      setSelectionState({
        selectedCard: null,
        isCardSelected: false,
        ghostPosition: { x: 0, y: 0 }
      });
    }
  }, [selectionState.isCardSelected]);

  // Handle advancement to next round
  const handleAdvanceToNextRound = useCallback(() => {
    if (!gameState.roundWinner) return;

    // Check if game is already complete (scores have been updated in the round completion effect)
    if (gameState.studentScore >= config.winningScore || gameState.teacherScore >= config.winningScore) {
      // Game is complete, scores are already updated, no need to start new round
      return;
    } else {
      // Start the next round after a brief delay
      setTimeout(() => {
        startNewRound();
      }, 500);
    }
  }, [gameState.roundWinner, gameState.studentScore, gameState.teacherScore, config.winningScore, startNewRound]);

  // Update ghost position on mouse move
  const updateGhostPosition = useCallback((position: { x: number; y: number }) => {
    if (selectionState.isCardSelected) {
      setSelectionState(prev => ({
        ...prev,
        ghostPosition: position
      }));
    }
  }, [selectionState.isCardSelected]);

  return {
    gameState,
    selectionState,
    handlers: {
      handleCardClick,
      handleSlotClick,
      handleReturnToDeck,
      handleGameAreaClick,
      handleAdvanceToNextRound,
      updateGhostPosition
    }
  };
}; 