import { PlaceValueShowdownConfig } from '../../../types/game';
import { Card } from './types';

/**
 * Get the place value label for a given position
 */
export const getPlaceValueLabel = (position: number, totalSlots: number): string => {
  const placeValues = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands'];
  const index = totalSlots - 1 - position;
  return placeValues[index] || `10^${index}`;
};

/**
 * Get expanded notation for a set of cards (e.g., "50,000 + 5,000 + 800")
 */
export const getExpandedNotation = (cards: Card[]): string => {
  const slottedCards = cards
    .filter(card => card.position === 'slot')
    .sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
  
  if (slottedCards.length === 0) return '';
  
  const parts: string[] = [];
  slottedCards.forEach((card, index) => {
    const placeValue = Math.pow(10, slottedCards.length - 1 - index);
    const value = card.digit * placeValue;
    if (value > 0) {
      parts.push(value.toLocaleString());
    }
  });
  
  return parts.join(' + ');
};

/**
 * Get expanded notation in words for a set of cards
 */
export const getExpandedNotationWords = (cards: Card[]): string => {
  const slottedCards = cards
    .filter(card => card.position === 'slot')
    .sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
  
  if (slottedCards.length === 0) return '';
  
  const number = parseInt(slottedCards.map(card => card.digit).join(''));
  return convertNumberToWords(number);
};

/**
 * Convert a number to words following standard check-writing format
 */
export const convertNumberToWords = (num: number): string => {
  if (num === 0) return 'zero';
  
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  
  const parts: string[] = [];
  let remaining = num;
  
  // Handle ten thousands
  if (remaining >= 10000) {
    const tenThousandsPlace = Math.floor(remaining / 10000);
    const thousandsPlace = Math.floor((remaining % 10000) / 1000);
    
    if (tenThousandsPlace >= 1 && thousandsPlace >= 1) {
      if (tenThousandsPlace * 10 + thousandsPlace >= 20) {
        parts.push(tens[tenThousandsPlace] + '-' + ones[thousandsPlace] + ' thousand,');
      } else if (tenThousandsPlace * 10 + thousandsPlace >= 10) {
        parts.push(teens[(tenThousandsPlace * 10 + thousandsPlace) - 10] + ' thousand,');
      }
    } else if (tenThousandsPlace >= 1 && thousandsPlace === 0) {
      parts.push(tens[tenThousandsPlace] + ' thousand,');
    }
    remaining = remaining % 1000;
  } else if (remaining >= 1000) {
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
  
  const result = parts.join(' ');
  return result.replace(/,$/, '');
};

/**
 * Generate random cards for a new round
 */
export const generateCards = (count: number): Card[] => {
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    cards.push({
      id: `card-${Math.random().toString(36).substring(7)}`,
      digit: Math.floor(Math.random() * 10),
      position: 'deck'
    });
  }
  return cards;
};

/**
 * Make an AI move for the teacher based on difficulty and objective
 */
export const makeTeacherMove = (cards: Card[], config: PlaceValueShowdownConfig): Card[] => {
  const { objective, aiDifficulty } = config;
  
  let sortedCards = [...cards];
  
  if (aiDifficulty === 'easy') {
    // Random arrangement
    sortedCards = cards.sort(() => Math.random() - 0.5);
  } else if (aiDifficulty === 'medium') {
    // 70% chance of optimal play
    if (Math.random() > 0.3) {
      sortedCards = cards.sort((a, b) => 
        objective === 'largest' ? b.digit - a.digit : a.digit - b.digit
      );
    } else {
      sortedCards = cards.sort(() => Math.random() - 0.5);
    }
  } else {
    // Always optimal play
    sortedCards = cards.sort((a, b) => 
      objective === 'largest' ? b.digit - a.digit : a.digit - b.digit
    );
  }
  
  return sortedCards.map((card, index) => ({
    ...card,
    position: 'slot' as const,
    slotIndex: index
  }));
};

/**
 * Calculate the numeric value of cards in slots
 */
export const calculateNumber = (cards: Card[]): number => {
  const slottedCards = cards
    .filter(card => card.position === 'slot')
    .sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
  
  if (slottedCards.length === 0) return 0;
  
  return parseInt(slottedCards.map(card => card.digit).join(''));
};

/**
 * Determine the winner of a round based on objective
 */
export const determineRoundWinner = (
  studentNumber: number, 
  teacherNumber: number, 
  objective: 'largest' | 'smallest'
): 'student' | 'teacher' | 'tie' => {
  if (objective === 'largest') {
    return studentNumber > teacherNumber ? 'student' : 
           teacherNumber > studentNumber ? 'teacher' : 'tie';
  } else {
    return studentNumber < teacherNumber ? 'student' : 
           teacherNumber < studentNumber ? 'teacher' : 'tie';
  }
};

/**
 * Check if all cards are placed in slots
 */
export const areAllCardsPlaced = (cards: Card[], totalSlots: number): boolean => {
  const slottedCards = cards.filter(card => card.position === 'slot');
  return slottedCards.length === totalSlots;
};

/**
 * Get a formatted comma-separated number string
 */
export const formatNumberWithCommas = (num: number): string => {
  return num.toLocaleString();
}; 