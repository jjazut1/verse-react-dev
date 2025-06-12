import React, { useState, useEffect, useRef } from 'react';
import { PlaceValueShowdownConfig } from '../../../types/game';
import './PlaceValueShowdown.css';

interface PlaceValueShowdownProps {
  playerName: string;
  onGameComplete: (score: number) => void;
  config: PlaceValueShowdownConfig;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
}

interface Card {
  id: string;
  digit: number;
  position: 'deck' | 'slot';
  slotIndex?: number;
}

interface GameState {
  phase: 'dealing' | 'arranging' | 'revealing' | 'gameComplete';
  round: number;
  studentScore: number;
  teacherScore: number;
  studentCards: Card[];
  teacherCards: Card[];
  studentNumber: number | null;
  teacherNumber: number | null;
  roundWinner: 'student' | 'teacher' | 'tie' | null;
  message: string;
  isStudentReady: boolean;
  isTeacherReady: boolean;
}

interface SelectionState {
  selectedCard: Card | null;
  isCardSelected: boolean;
  ghostPosition: { x: number; y: number };
}

const PlaceValueShowdown: React.FC<PlaceValueShowdownProps> = ({
  playerName,
  onGameComplete,
  config,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
}) => {
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

  // Feature toggle states
  const [showPlaceValueLabels, setShowPlaceValueLabels] = useState(false);
  const [showExpandedNumbers, setShowExpandedNumbers] = useState(false);
  const [showExpandedWords, setShowExpandedWords] = useState(false);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameStartedRef = useRef(false);

  // Helper functions for place value features
  const getPlaceValueLabel = (position: number, totalSlots: number): string => {
    const placeValues = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands'];
    const index = totalSlots - 1 - position;
    return placeValues[index] || `10^${index}`;
  };

  const getExpandedNotation = (cards: Card[]): string => {
    const slottedCards = cards
      .filter(card => card.position === 'slot')
      .sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
    
    if (slottedCards.length === 0) return '';
    
    const parts: string[] = [];
    slottedCards.forEach((card, index) => {
      const placeValue = Math.pow(10, slottedCards.length - 1 - index);
      const value = card.digit * placeValue;
      if (value > 0) {
        parts.push(value.toString());
      }
    });
    
    return parts.join(' + ');
  };

  const getExpandedNotationWords = (cards: Card[]): string => {
    const slottedCards = cards
      .filter(card => card.position === 'slot')
      .sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
    
    if (slottedCards.length === 0) return '';
    
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    
    const number = parseInt(slottedCards.map(card => card.digit).join(''));
    
    const convertToWords = (num: number): string => {
      if (num === 0) return 'zero';
      
      const parts: string[] = [];
      let remaining = num;
      
      // Handle ten thousands
      if (remaining >= 10000) {
        const tenThousandsPlace = Math.floor(remaining / 10000);
        const thousandsPlace = Math.floor((remaining % 10000) / 1000);
        
        if (tenThousandsPlace >= 1 && thousandsPlace >= 1) {
          // e.g., "fifty-five thousand"
          if (tenThousandsPlace * 10 + thousandsPlace >= 20) {
            parts.push(tens[tenThousandsPlace] + '-' + ones[thousandsPlace] + ' thousand,');
          } else if (tenThousandsPlace * 10 + thousandsPlace >= 10) {
            parts.push(teens[(tenThousandsPlace * 10 + thousandsPlace) - 10] + ' thousand,');
          }
        } else if (tenThousandsPlace >= 1 && thousandsPlace === 0) {
          // e.g., "fifty thousand"
          parts.push(tens[tenThousandsPlace] + ' thousand,');
        }
        remaining = remaining % 1000;
      } else if (remaining >= 1000) {
        // Handle thousands only
        const thousandsPlace = Math.floor(remaining / 1000);
        if (thousandsPlace >= 1) {
          parts.push(ones[thousandsPlace] + ' thousand,');
        }
        remaining = remaining % 1000;
      }
      
      // Handle hundreds
      if (remaining >= 100) {
        const hundredsPlace = Math.floor(remaining / 100);
        const hasRemainder = remaining % 100 > 0;
        if (hasRemainder) {
          parts.push(ones[hundredsPlace] + ' hundred,');
        } else {
          parts.push(ones[hundredsPlace] + ' hundred');
        }
        remaining = remaining % 100;
      }
      
      // Handle tens and ones with "and"
      if (remaining > 0) {
        if (parts.length > 0) {
          parts.push('and');
        }
        
        if (remaining >= 20) {
          const tensPlace = Math.floor(remaining / 10);
          const onesPlace = remaining % 10;
          if (onesPlace > 0) {
            parts.push(tens[tensPlace] + '-' + ones[onesPlace]);
          } else {
            parts.push(tens[tensPlace]);
          }
        } else if (remaining >= 10) {
          parts.push(teens[remaining - 10]);
        } else {
          parts.push(ones[remaining]);
        }
      }
      
      // Clean up trailing comma if it's the last part
      const result = parts.join(' ');
      return result.replace(/,$/, '');
    };
    
    return convertToWords(number);
  };

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
  }, []);

  // Handle clicking on empty areas to deselect
  const handleGameAreaClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && selectionState.isCardSelected) {
      setSelectionState({
        selectedCard: null,
        isCardSelected: false,
        ghostPosition: { x: 0, y: 0 }
      });
    }
  };

  // Generate random cards for a round
  const generateCards = (count: number): Card[] => {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      cards.push({
        id: `card-${Math.random().toString(36).substring(7)}`,
        digit: Math.floor(Math.random() * 10), // 0-9
        position: 'deck'
      });
    }
    return cards;
  };

  // AI logic for teacher moves
  const makeTeacherMove = (cards: Card[]): Card[] => {
    const { objective, aiDifficulty } = config;
    
    // Sort cards based on objective and difficulty
    let sortedCards = [...cards];
    
    if (aiDifficulty === 'easy') {
      // Easy: Random arrangement
      sortedCards = cards.sort(() => Math.random() - 0.5);
    } else if (aiDifficulty === 'medium') {
      // Medium: Sometimes optimal, sometimes not
      if (Math.random() > 0.3) {
        sortedCards = cards.sort((a, b) => 
          objective === 'largest' ? b.digit - a.digit : a.digit - b.digit
        );
      } else {
        sortedCards = cards.sort(() => Math.random() - 0.5);
      }
    } else {
      // Hard: Always optimal
      sortedCards = cards.sort((a, b) => 
        objective === 'largest' ? b.digit - a.digit : a.digit - b.digit
      );
    }
    
    // Place cards in slots
    return sortedCards.map((card, index) => ({
      ...card,
      position: 'slot' as const,
      slotIndex: index
    }));
  };

  // Calculate number from arranged cards
  const calculateNumber = (cards: Card[]): number => {
    const slottedCards = cards
      .filter(card => card.position === 'slot')
      .sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
    
    if (slottedCards.length === 0) return 0;
    
    return parseInt(slottedCards.map(card => card.digit).join(''));
  };

  // Start a new round
  const startNewRound = () => {
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

    // Simulate dealing animation
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        phase: 'arranging',
        message: `Now, arrange your cards to make the ${config.objective} number possible! Just click and drag your cards into the number slots.`
      }));

      // AI makes its move after a delay
      setTimeout(() => {
        setGameState(prev => {
          const arrangedTeacherCards = makeTeacherMove(prev.teacherCards);
          return {
            ...prev,
            teacherCards: arrangedTeacherCards,
            isTeacherReady: true
          };
        });
      }, 2000 + Math.random() * 3000); // Random delay 2-5 seconds
    }, 1500);
  };

  // Check if round is complete
  useEffect(() => {
    if (gameState.isStudentReady && gameState.isTeacherReady && gameState.phase === 'arranging') {
      const studentNum = calculateNumber(gameState.studentCards);
      const teacherNum = calculateNumber(gameState.teacherCards);
      
      let winner: 'student' | 'teacher' | 'tie';
      if (config.objective === 'largest') {
        winner = studentNum > teacherNum ? 'student' : teacherNum > studentNum ? 'teacher' : 'tie';
      } else {
        winner = studentNum < teacherNum ? 'student' : teacherNum < studentNum ? 'teacher' : 'tie';
      }

      setGameState(prev => ({
        ...prev,
        phase: 'revealing',
        studentNumber: studentNum,
        teacherNumber: teacherNum,
        roundWinner: winner,
        message: "Let's see who made the better number!"
      }));
    }
  }, [gameState.isStudentReady, gameState.isTeacherReady, gameState.phase]);

  // Handle manual advancement to next round
  const handleAdvanceToNextRound = () => {
    const winner = gameState.roundWinner;
    if (!winner) return;

    const updatedStudentScore = gameState.studentScore + (winner === 'student' ? 1 : 0);
    const updatedTeacherScore = gameState.teacherScore + (winner === 'teacher' ? 1 : 0);
    
    // Check for game end
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
      // Update scores and immediately start next round
      setGameState(prev => ({
        ...prev,
        studentScore: updatedStudentScore,
        teacherScore: updatedTeacherScore
      }));
      
      // Start the next round directly
      setTimeout(() => {
        startNewRound();
      }, 500);
    }
  };

  // Handle card click for selection
  const handleCardClick = (card: Card, e: React.MouseEvent) => {
    if (gameState.phase !== 'arranging') return;
    
    if (selectionState.isCardSelected && selectionState.selectedCard?.id === card.id) {
      // If clicking the same card, deselect it
      setSelectionState({
        selectedCard: null,
        isCardSelected: false,
        ghostPosition: { x: 0, y: 0 }
      });
    } else {
      // Select the card and set initial ghost position
      setSelectionState({
        selectedCard: card,
        isCardSelected: true,
        ghostPosition: { x: e.clientX, y: e.clientY }
      });
    }
  };

  // Handle mouse move for ghost tracking
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!selectionState.isCardSelected) return;
      
      // Use global coordinates since ghost card uses position: 'fixed'
      setSelectionState(prev => ({
        ...prev,
        ghostPosition: { x: e.clientX, y: e.clientY }
      }));
    };

    if (selectionState.isCardSelected) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [selectionState.isCardSelected]);

  // Handle slot click for placing cards
  const handleSlotClick = (slotIndex: number) => {
    if (!selectionState.selectedCard || gameState.phase !== 'arranging') return;

    setGameState(prev => {
      const newCards = prev.studentCards.map(card => {
        if (card.id === selectionState.selectedCard!.id) {
          return { ...card, position: 'slot' as const, slotIndex };
        }
        // Remove any other card from this slot
        if (card.slotIndex === slotIndex) {
          return { ...card, position: 'deck' as const, slotIndex: undefined };
        }
        return card;
      });

      return { ...prev, studentCards: newCards };
    });

    // Deselect the card after placing
    setSelectionState({
      selectedCard: null,
      isCardSelected: false,
      ghostPosition: { x: 0, y: 0 }
    });
  };

  // Handle card return to deck
  const handleReturnToDeck = (card: Card) => {
    if (gameState.phase !== 'arranging') return;

    setGameState(prev => ({
      ...prev,
      studentCards: prev.studentCards.map(c => 
        c.id === card.id ? { ...c, position: 'deck', slotIndex: undefined } : c
      )
    }));
  };

  // Check if student is ready
  const checkStudentReady = () => {
    const slottedCards = gameState.studentCards.filter(card => card.position === 'slot');
    if (slottedCards.length === config.numberOfCards && !gameState.isStudentReady) {
      setGameState(prev => ({ ...prev, isStudentReady: true }));
    }
  };

  useEffect(() => {
    checkStudentReady();
  }, [gameState.studentCards]);





  // Handle game completion
  useEffect(() => {
    if (gameState.phase === 'gameComplete') {
      const finalScore = gameState.studentScore;
      setTimeout(() => {
        onGameComplete(finalScore);
      }, 3000);
    }
  }, [gameState.phase]);

  return (
          <div className="place-value-showdown" ref={gameAreaRef} onClick={handleGameAreaClick}>
      <div className="game-header">
        <h2>🏆 Place Value Showdown</h2>
        <div className="header-content">
          <div className="scoreboard">
            <div className="score">
              <span className="player-name">{config.teacherName}</span>
              <span className="points">{gameState.teacherScore}</span>
            </div>
            <div className="vs">VS</div>
            <div className="score">
              <span className="player-name">{config.playerName}</span>
              <span className="points">{gameState.studentScore}</span>
            </div>
          </div>
          
          {/* Feature Toggle Buttons in Header */}
          <div className="header-controls">
            <button 
              onClick={() => setShowPlaceValueLabels(!showPlaceValueLabels)}
              className={`feature-button compact ${showPlaceValueLabels ? 'active' : ''}`}
              title="Show Place Values"
            >
              📊
            </button>
            <button 
              onClick={() => setShowExpandedNumbers(!showExpandedNumbers)}
              className={`feature-button compact ${showExpandedNumbers ? 'active' : ''}`}
              title="Show Expanded Numbers"
            >
              🔢
            </button>
            <button 
              onClick={() => setShowExpandedWords(!showExpandedWords)}
              className={`feature-button compact ${showExpandedWords ? 'active' : ''}`}
              title="Show Expanded Words"
            >
              📝
            </button>
          </div>
          
          {/* Continue Button during Revealing Phase */}
          {gameState.phase === 'revealing' && (
            <button 
              onClick={handleAdvanceToNextRound}
              className="continue-button compact"
            >
              🎲 Next Round
            </button>
          )}
        </div>
      </div>

      {(gameState.phase === 'dealing' || gameState.phase === 'gameComplete') && (
        <div className="game-message">
          <p>{gameState.message}</p>
        </div>
      )}

      {(gameState.phase === 'dealing' || gameState.phase === 'arranging' || gameState.phase === 'revealing') && (
        <div className="game-area">
          {/* Teacher's Area */}
          <div className="player-area teacher-area">
            <h3>{config.teacherName}'s Turn</h3>
            <div className="number-slots">
              {Array.from({ length: config.numberOfCards }, (_, i) => {
                const cardInSlot = gameState.teacherCards.find(card => card.slotIndex === i);
                return (
                  <React.Fragment key={i}>
                    <div className="slot-container">
                      <div className="number-slot teacher-slot">
                        {cardInSlot && (
                          <div className={`card teacher-card ${gameState.phase === 'revealing' ? 'revealed' : ''}`}>
                            {gameState.phase === 'revealing' ? cardInSlot.digit : '?'}
                          </div>
                        )}
                      </div>
                      {/* Place value label */}
                      {showPlaceValueLabels && (
                        <div className="place-value-label">
                          {getPlaceValueLabel(i, config.numberOfCards)}
                        </div>
                      )}
                    </div>
                    {/* Add comma after second slot if more than 3 cards */}
                    {config.numberOfCards > 3 && i === 1 && (
                      <div className="comma-separator">,</div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            {/* Spacer to match student deck height */}
            <div className="teacher-spacer"></div>
            
            <div className="ready-indicator" style={{
              opacity: gameState.isTeacherReady && gameState.phase === 'arranging' ? 1 : 0,
              visibility: gameState.isTeacherReady && gameState.phase === 'arranging' ? 'visible' : 'hidden'
            }}>
              ✅ Ready!
            </div>
            
            {/* Inline Expanded Notation for Teacher */}
            {gameState.phase === 'revealing' && gameState.teacherNumber !== null && (
              <div className="inline-notation">
                {showExpandedNumbers && (
                  <div className="notation-line">
                    <strong>{gameState.teacherNumber} =</strong> {getExpandedNotation(gameState.teacherCards)}
                  </div>
                )}
                {showExpandedWords && (
                  <div className="notation-line">
                    <strong>In Words:</strong> {getExpandedNotationWords(gameState.teacherCards)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Student's Area */}
          <div className="player-area student-area">
            <h3>{config.playerName}'s Turn</h3>
            <div className="number-slots">
              {Array.from({ length: config.numberOfCards }, (_, i) => {
                const cardInSlot = gameState.studentCards.find(card => card.slotIndex === i);
                return (
                  <React.Fragment key={i}>
                    <div className="slot-container">
                      <div 
                        className={`number-slot student-slot ${selectionState.isCardSelected ? 'can-drop' : ''}`}
                        onClick={() => handleSlotClick(i)}
                      >
                        {cardInSlot && (
                          <div 
                            className="card student-card"
                            onClick={() => handleReturnToDeck(cardInSlot)}
                          >
                            {cardInSlot.digit}
                          </div>
                        )}
                      </div>
                      {/* Place value label */}
                      {showPlaceValueLabels && (
                        <div className="place-value-label">
                          {getPlaceValueLabel(i, config.numberOfCards)}
                        </div>
                      )}
                    </div>
                    {/* Add comma after second slot if more than 3 cards */}
                    {config.numberOfCards > 3 && i === 1 && (
                      <div className="comma-separator">,</div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            
            <div className="student-deck-container">
              <div className="student-deck">
                {gameState.studentCards
                  .filter(card => card.position === 'deck')
                  .map(card => (
                    <div
                      key={card.id}
                      className={`card student-card deck-card ${selectionState.selectedCard?.id === card.id ? 'selected' : ''}`}
                      onClick={(e) => handleCardClick(card, e)}
                      style={{
                        opacity: selectionState.selectedCard?.id === card.id ? 0.5 : 1
                      }}
                    >
                      {card.digit}
                    </div>
                  ))}
              </div>
            </div>

            <div className="ready-indicator" style={{
              opacity: gameState.isStudentReady && gameState.phase === 'arranging' ? 1 : 0,
              visibility: gameState.isStudentReady && gameState.phase === 'arranging' ? 'visible' : 'hidden'
            }}>
              ✅ Ready!
            </div>
            
            {/* Inline Expanded Notation for Student */}
            {gameState.phase === 'revealing' && gameState.studentNumber !== null && (
              <div className="inline-notation">
                {showExpandedNumbers && (
                  <div className="notation-line">
                    <strong>{gameState.studentNumber} =</strong> {getExpandedNotation(gameState.studentCards)}
                  </div>
                )}
                {showExpandedWords && (
                  <div className="notation-line">
                    <strong>In Words:</strong> {getExpandedNotationWords(gameState.studentCards)}
                  </div>
                )}
              </div>
            )}
          </div>


        </div>
      )}



      {gameState.phase === 'gameComplete' && (
        <div className="game-complete">
          <h2>🎉 Game Complete!</h2>
          <div className="final-scores">
            <p><strong>Final Score:</strong></p>
            <p>{config.teacherName}: {gameState.teacherScore}</p>
            <p>{config.playerName}: {gameState.studentScore}</p>
          </div>
        </div>
      )}

      {/* Ghost card that follows mouse */}
      {selectionState.isCardSelected && selectionState.selectedCard && (
        <div
          className="ghost-card"
          style={{
            position: 'fixed',
            left: selectionState.ghostPosition.x - 30,
            top: selectionState.ghostPosition.y - 40,
            pointerEvents: 'none',
            zIndex: 1000,
            opacity: 0.8
          }}
        >
          <div className="card student-card">
            {selectionState.selectedCard.digit}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaceValueShowdown; 