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
    message: `🟢 In this game, each of you will be dealt ${config.numberOfCards} digit cards. Your mission is to drag and drop them into the slots to create the ${config.objective} number possible! The winner of each round earns 1 point! First to ${config.winningScore} points wins!`,
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
    const studentCards = generateCards(config.numberOfCards);
    const teacherCards = generateCards(config.numberOfCards);
    
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
        setGameState(prev => ({
          ...prev,
          message: "📣 Let's get started!"
        }));
        
        setTimeout(() => {
          startNewRound();
        }, 1500);
      }, 3000);
    }
  }, [startNewRound]);

  // Check if round is complete and reveal results
  useEffect(() => {
    if (gameState.isStudentReady && gameState.isTeacherReady && gameState.phase === 'arranging') {
      const studentNum = calculateNumber(gameState.studentCards);
      const teacherNum = calculateNumber(gameState.teacherCards);
      const winner = determineRoundWinner(studentNum, teacherNum, config.objective);

      setGameState(prev => ({
        ...prev,
        phase: 'revealing',
        studentNumber: studentNum,
        teacherNumber: teacherNum,
        roundWinner: winner,
        message: "Let's see who made the better number!"
      }));
    }
  }, [gameState.isStudentReady, gameState.isTeacherReady, gameState.phase, config.objective]);

  // Check if student is ready when all cards are placed
  useEffect(() => {
    const isReady = areAllCardsPlaced(gameState.studentCards, config.numberOfCards);
    if (isReady && !gameState.isStudentReady) {
      setGameState(prev => ({ ...prev, isStudentReady: true }));
    }
  }, [gameState.studentCards, config.numberOfCards, gameState.isStudentReady]);

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
    const winner = gameState.roundWinner;
    if (!winner) return;

    const updatedStudentScore = gameState.studentScore + (winner === 'student' ? 1 : 0);
    const updatedTeacherScore = gameState.teacherScore + (winner === 'teacher' ? 1 : 0);
    
    if (updatedStudentScore >= config.winningScore || updatedTeacherScore >= config.winningScore) {
      const gameWinner = updatedStudentScore > updatedTeacherScore ? config.playerName : config.teacherName;
      setGameState(prev => ({
        ...prev,
        phase: 'gameComplete',
        studentScore: updatedStudentScore,
        teacherScore: updatedTeacherScore,
        message: `🎉 That's game! The final score is: ${config.teacherName} ${updatedTeacherScore}, ${config.playerName} ${updatedStudentScore}. And the grand winner is... ${gameWinner}! Great job practicing place value!`
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        studentScore: updatedStudentScore,
        teacherScore: updatedTeacherScore
      }));
      
      setTimeout(() => {
        startNewRound();
      }, 500);
    }
  }, [gameState.roundWinner, gameState.studentScore, gameState.teacherScore, config, startNewRound]);

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