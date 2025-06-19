import React from 'react';
import { PlayerAreaProps, Card } from './types';
import { SlotContainer } from './SlotContainer';
import { getExpandedNotation, getExpandedNotationWords } from './utils';

/**
 * Player area component containing slots, cards, and expanded notation displays
 */
export const PlayerArea: React.FC<PlayerAreaProps> = ({
  isTeacher,
  config,
  gameState,
  showPlaceValueLabels,
  showExpandedNumbers,
  showExpandedWords,
  onSlotClick,
  onCardClick,
  onReturnToDeck,
  selectionState
}) => {
  const cards = isTeacher ? gameState.teacherCards : gameState.studentCards;
  const isReady = isTeacher ? gameState.isTeacherReady : gameState.isStudentReady;
  const number = isTeacher ? gameState.teacherNumber : gameState.studentNumber;
  const playerName = isTeacher ? config.teacherName : config.playerName;
  const areaClass = isTeacher ? 'teacher-area' : 'student-area';
  const slotClass = isTeacher ? 'teacher-slot' : 'student-slot';
  const cardClass = isTeacher ? 'teacher-card' : 'student-card';

  return (
    <div className={`player-area ${areaClass}`}>
      <h3>{playerName}'s Turn</h3>
      
      <div className="number-slots">
        {Array.from({ length: config.numberOfCards }, (_, i) => {
          const cardInSlot = cards.find(card => card.slotIndex === i);
          const hasComma = config.numberOfCards > 3 && i === config.numberOfCards - 4;
          
          return (
            <SlotContainer
              key={i}
              showPlaceValueLabels={showPlaceValueLabels}
              slotIndex={i}
              totalSlots={config.numberOfCards}
              hasComma={hasComma}
            >
              <div 
                className={`number-slot ${slotClass} ${!isTeacher && selectionState?.isCardSelected ? 'can-drop' : ''}`}
                onClick={() => !isTeacher && onSlotClick?.(i)}
              >
                {cardInSlot && (
                  <div 
                    className={`card ${cardClass} ${isTeacher && gameState.phase === 'revealing' ? 'revealed' : ''}`}
                    onClick={() => !isTeacher && onReturnToDeck?.(cardInSlot)}
                  >
                    {isTeacher && gameState.phase !== 'revealing' ? '?' : cardInSlot.digit}
                  </div>
                )}
              </div>
            </SlotContainer>
          );
        })}
      </div>
      
      {!isTeacher && (
        <div className="student-deck-container">
          <div className="student-deck">
            {cards
              .filter(card => card.position === 'deck')
              .map(card => (
                <div
                  key={card.id}
                  className={`card ${cardClass} deck-card ${selectionState?.selectedCard?.id === card.id ? 'selected' : ''}`}
                  onClick={(e) => onCardClick?.(card, e)}
                  style={{
                    opacity: selectionState?.selectedCard?.id === card.id ? 0.5 : 1
                  }}
                >
                  {card.digit}
                </div>
              ))}
          </div>
        </div>
      )}
      
      {isTeacher && <div className="teacher-spacer"></div>}
      
      <div 
        className="ready-indicator" 
        style={{
          opacity: isReady && gameState.phase === 'arranging' ? 1 : 0,
          visibility: isReady && gameState.phase === 'arranging' ? 'visible' : 'hidden'
        }}
      >
        ✅ Ready!
      </div>
      
      {gameState.phase === 'revealing' && number !== null && (
        <div className="inline-notation">
          {showExpandedNumbers && (
            <div className="notation-line">
              <strong>{number.toLocaleString()} =</strong> {getExpandedNotation(cards)}
            </div>
          )}
          {showExpandedWords && (
            <div className="notation-line">
              <strong>In Words:</strong> {getExpandedNotationWords(cards)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 