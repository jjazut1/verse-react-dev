import { PlaceValueShowdownConfig } from '../../../types/game';
import { Card } from './types';

/**
 * Get the place value label for a given position
 */
export const getPlaceValueLabel = (position: number, totalSlots: number, config: PlaceValueShowdownConfig): string => {
  const wholeNumberSlots = config.numberOfCards;
  const hasDecimal = config.includeDecimal;
  const decimalPlaces = hasDecimal ? config.decimalPlaces : 0;
  
  // Determine if this position is in whole number section or decimal section
  if (position < wholeNumberSlots) {
    // Whole number places (from left to right: ten thousands, thousands, hundreds, tens, ones)
    const wholeNumberPosition = wholeNumberSlots - 1 - position;
    const placeValues = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands'];
    return placeValues[wholeNumberPosition] || `10^${wholeNumberPosition}`;
  } else {
    // Decimal places (from left to right: tenths, hundredths, thousandths)
    const decimalPosition = position - wholeNumberSlots;
    const decimalPlaceValues = ['tenths', 'hundredths', 'thousandths'];
    return decimalPlaceValues[decimalPosition] || `10^${-(decimalPosition + 1)}`;
  }
};

/**
 * Get expanded notation for a set of cards (e.g., "50,000 + 5,000 + 800" or "123.45 = 100 + 20 + 3 + 0.4 + 0.05")
 */
export const getExpandedNotation = (cards: Card[], config: PlaceValueShowdownConfig): string => {
  const slottedCards = cards
    .filter(card => card.position === 'slot')
    .sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
  
  if (slottedCards.length === 0) return '';
  
  const parts: string[] = [];
  const wholeNumberSlots = config.numberOfCards;
  const hasDecimal = config.includeDecimal;
  
  slottedCards.forEach((card, index) => {
    let value: number;
    
    if (index < wholeNumberSlots) {
      // Whole number places
      const placeValue = Math.pow(10, wholeNumberSlots - 1 - index);
      value = card.digit * placeValue;
    } else {
      // Decimal places
      const decimalPosition = index - wholeNumberSlots + 1;
      const placeValue = Math.pow(10, -decimalPosition);
      value = card.digit * placeValue;
    }
    
    if (value > 0) {
      if (value >= 1) {
        parts.push(value.toLocaleString());
      } else {
        // For decimal values, show without scientific notation
        parts.push(value.toString());
      }
    }
  });
  
  return parts.join(' + ');
};

/**
 * Get expanded notation in words for a set of cards
 */
export const getExpandedNotationWords = (cards: Card[], config: PlaceValueShowdownConfig): string => {
  const slottedCards = cards
    .filter(card => card.position === 'slot')
    .sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
  
  if (slottedCards.length === 0) return '';
  
  const number = calculateNumber(cards, config);
  return convertNumberToWords(number, config);
};

/**
 * Convert a number to words following standard check-writing format, including decimals
 */
export const convertNumberToWords = (num: number, config: PlaceValueShowdownConfig): string => {
  if (num === 0) return 'zero';
  
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  
  // Handle decimal numbers
  if (config.includeDecimal && num % 1 !== 0) {
    const wholeNumber = Math.floor(num);
    const decimalPart = num - wholeNumber;
    
    let result = '';
    
    // Convert whole number part
    if (wholeNumber > 0) {
      result += convertWholeNumberToWords(wholeNumber, ones, teens, tens);
    } else {
      result += 'zero';
    }
    
    // Add decimal part
    result += ' and ';
    
    // Convert decimal part based on number of decimal places
    const decimalString = decimalPart.toFixed(config.decimalPlaces).slice(2); // Remove "0."
    const decimalNumber = parseInt(decimalString);
    
    if (decimalNumber > 0) {
      result += convertWholeNumberToWords(decimalNumber, ones, teens, tens);
      
      // Add appropriate decimal place name
      if (config.decimalPlaces === 1) {
        result += decimalNumber === 1 ? ' tenth' : ' tenths';
      } else if (config.decimalPlaces === 2) {
        result += decimalNumber === 1 ? ' hundredth' : ' hundredths';
      } else if (config.decimalPlaces === 3) {
        result += decimalNumber === 1 ? ' thousandth' : ' thousandths';
      }
    } else {
      result += 'zero';
      if (config.decimalPlaces === 1) {
        result += ' tenths';
      } else if (config.decimalPlaces === 2) {
        result += ' hundredths';
      } else if (config.decimalPlaces === 3) {
        result += ' thousandths';
      }
    }
    
    return result;
  }
  
  // Handle whole numbers (existing logic)
  return convertWholeNumberToWords(Math.floor(num), ones, teens, tens);
};

/**
 * Convert whole number to words (extracted from original function)
 */
const convertWholeNumberToWords = (num: number, ones: string[], teens: string[], tens: string[]): string => {
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
export const generateCards = (config: PlaceValueShowdownConfig): Card[] => {
  const totalCards = config.numberOfCards + (config.includeDecimal ? config.decimalPlaces : 0);
  const cards: Card[] = [];
  
  for (let i = 0; i < totalCards; i++) {
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
  
  console.log(`🤖 TEACHER MOVE:`, {
    objective,
    aiDifficulty,
    originalCards: cards.map(c => c.digit),
    includeDecimal: config.includeDecimal,
    decimalPlaces: config.decimalPlaces
  });
  
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
  
  console.log(`🤖 TEACHER ARRANGED:`, sortedCards.map(c => c.digit));
  
  return sortedCards.map((card, index) => ({
    ...card,
    position: 'slot' as const,
    slotIndex: index
  }));
};

/**
 * Calculate the numeric value of cards in slots, including decimal support
 */
export const calculateNumber = (cards: Card[], config: PlaceValueShowdownConfig): number => {
  const slottedCards = cards
    .filter(card => card.position === 'slot')
    .sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
  
  if (slottedCards.length === 0) return 0;
  
  const wholeNumberSlots = config.numberOfCards;
  const hasDecimal = config.includeDecimal;
  
  if (!hasDecimal) {
    // Original logic for whole numbers
    return parseInt(slottedCards.map(card => card.digit).join(''));
  }
  
  // Calculate with decimal support
  let result = 0;
  
  slottedCards.forEach((card, index) => {
    if (index < wholeNumberSlots) {
      // Whole number places
      const placeValue = Math.pow(10, wholeNumberSlots - 1 - index);
      result += card.digit * placeValue;
    } else {
      // Decimal places
      const decimalPosition = index - wholeNumberSlots + 1;
      const placeValue = Math.pow(10, -decimalPosition);
      result += card.digit * placeValue;
    }
  });
  
  return result;
};

/**
 * Determine the winner of a round based on objective
 */
export const determineRoundWinner = (
  studentNumber: number, 
  teacherNumber: number, 
  objective: 'largest' | 'smallest'
): 'student' | 'teacher' | 'tie' => {
  console.log(`🎯 WINNER DETERMINATION:`, {
    studentNumber,
    teacherNumber,
    objective,
    studentWins: objective === 'smallest' ? studentNumber < teacherNumber : studentNumber > teacherNumber
  });
  
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
export const areAllCardsPlaced = (cards: Card[], config: PlaceValueShowdownConfig): boolean => {
  const totalSlots = config.numberOfCards + (config.includeDecimal ? config.decimalPlaces : 0);
  const slottedCards = cards.filter(card => card.position === 'slot');
  return slottedCards.length === totalSlots;
};

/**
 * Get a formatted comma-separated number string
 */
export const formatNumberWithCommas = (num: number): string => {
  return num.toLocaleString();
}; 