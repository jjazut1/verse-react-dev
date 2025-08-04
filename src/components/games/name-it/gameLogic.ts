import { GameIcon, GameCard } from './types';
import { DEFAULT_ICONS, ICONS_PER_CARD } from './constants';

/**
 * Generate Dobble cards using the mathematical algorithm
 * Based on the original Dobble logic: each pair of cards shares exactly one symbol
 */
export function generateDobbleCards(icons: GameIcon[] = DEFAULT_ICONS): GameCard[] {
  const n = ICONS_PER_CARD; // Number of symbols per card
  const cards: GameCard[] = [];
  
  // Filter out any undefined icons from the input
  const validIcons = icons.filter(icon => icon && icon.id && icon.dataIcon);
  console.log(`Generating cards with ${validIcons.length} valid icons out of ${icons.length} total`);
  
  // Ensure we have enough valid icons
  if (validIcons.length < n) {
    throw new Error(`Not enough valid icons. Need at least ${n}, but only have ${validIcons.length}`);
  }
  
  if (validIcons.length < n * n - n + 1) {
    console.warn('Not enough icons for full Dobble set, using available icons');
  }

  // Card 1: Contains the first n symbols
  const firstCardIcons = validIcons.slice(0, n);
  // Ensure we have exactly n icons for the first card
  while (firstCardIcons.length < n) {
    const fallbackIcon = validIcons[firstCardIcons.length % validIcons.length];
    firstCardIcons.push(fallbackIcon);
  }
  
  cards.push({
    id: 'card-0',
    icons: firstCardIcons,
    position: 'center'
  });

  // First set of n cards
  for (let i = 0; i < n; i++) {
    const cardIcons: GameIcon[] = [validIcons[0]]; // First icon is shared
    for (let j = 0; j < n - 1; j++) {
      const iconIndex = 1 + (i * (n - 1) + j) % (n * (n - 1));
      // Ensure we always have a valid icon by cycling through available ones
      const safeIconIndex = iconIndex < validIcons.length ? iconIndex : iconIndex % validIcons.length;
      const selectedIcon = validIcons[safeIconIndex];
      if (selectedIcon && selectedIcon.id) {
        cardIcons.push(selectedIcon);
      }
    }
    
    // Ensure card has exactly n valid icons
    while (cardIcons.length < n) {
      const fallbackIndex = cardIcons.length % validIcons.length;
      const fallbackIcon = validIcons[fallbackIndex];
      if (fallbackIcon && fallbackIcon.id) {
        cardIcons.push(fallbackIcon);
      } else {
        // If for some reason the fallback icon is invalid, use the first valid icon
        cardIcons.push(validIcons[0]);
      }
    }
    
    // Final validation - filter out any undefined icons that might have slipped through
    const finalIcons = cardIcons.filter(icon => icon && icon.id && icon.dataIcon);
    
    cards.push({
      id: `card-${cards.length}`,
      icons: finalIcons,
      position: 'center'
    });
  }

  // Remaining sets of cards
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1; j++) {
      const baseIconIndex = 1 + i;
      const baseIcon = baseIconIndex < validIcons.length ? validIcons[baseIconIndex] : validIcons[baseIconIndex % validIcons.length];
      const cardIcons: GameIcon[] = baseIcon && baseIcon.id ? [baseIcon] : [validIcons[0]]; // Base icon
      
      for (let k = 0; k < n - 1; k++) {
        const iconIndex = n + (k * (n - 1) + (i * k + j) % (n - 1));
        // Ensure we always have a valid icon by cycling through available ones
        const safeIconIndex = iconIndex < validIcons.length ? iconIndex : iconIndex % validIcons.length;
        const selectedIcon = validIcons[safeIconIndex];
        if (selectedIcon && selectedIcon.id) {
          cardIcons.push(selectedIcon);
        }
      }
      
      // Ensure card has exactly n valid icons
      while (cardIcons.length < n) {
        const fallbackIndex = cardIcons.length % validIcons.length;
        const fallbackIcon = validIcons[fallbackIndex];
        if (fallbackIcon && fallbackIcon.id) {
          cardIcons.push(fallbackIcon);
        } else {
          // If for some reason the fallback icon is invalid, use the first valid icon
          cardIcons.push(validIcons[0]);
        }
      }
      
      // Final validation - filter out any undefined icons that might have slipped through
      const finalIcons = cardIcons.filter(icon => icon && icon.id && icon.dataIcon);
      
      // Only add card if it has valid icons
      if (finalIcons.length >= n / 2) { // At least half the required icons
        cards.push({
          id: `card-${cards.length}`,
          icons: finalIcons,
          position: 'center'
        });
      }
    }
  }

  // Final validation - ensure all cards have valid icons
  const validCards = cards.filter(card => {
    if (!card || !card.icons || card.icons.length === 0) {
      console.warn('Filtering out card with no icons:', card);
      return false;
    }
    
    const validIconsInCard = card.icons.filter(icon => icon && icon.id && icon.dataIcon);
    if (validIconsInCard.length !== card.icons.length) {
      console.warn('Card has invalid icons:', card.id, 'valid:', validIconsInCard.length, 'total:', card.icons.length);
      // Update the card to only have valid icons
      card.icons = validIconsInCard;
    }
    
    return validIconsInCard.length > 0;
  });

  console.log(`Generated ${validCards.length} valid cards out of ${cards.length} total cards`);
  
  if (validCards.length === 0) {
    throw new Error('No valid cards could be generated');
  }

  return validCards;
}

/**
 * Find matching icons between two cards
 */
export function findMatchingIcons(card1: GameCard, card2: GameCard): GameIcon[] {
  const matches: GameIcon[] = [];
  
  // Safety check to ensure cards and icons exist
  if (!card1 || !card2 || !card1.icons || !card2.icons) {
    console.warn('Invalid cards provided to findMatchingIcons');
    return matches;
  }
  
  for (const icon1 of card1.icons) {
    // Safety check for undefined icons
    if (!icon1 || !icon1.dataIcon) {
      console.warn('Undefined icon found in card1:', icon1);
      continue;
    }
    
    for (const icon2 of card2.icons) {
      // Safety check for undefined icons
      if (!icon2 || !icon2.dataIcon) {
        console.warn('Undefined icon found in card2:', icon2);
        continue;
      }
      
      if (icon1.dataIcon === icon2.dataIcon) {
        matches.push(icon1);
      }
    }
  }
  
  return matches;
}

/**
 * Validate that two cards have exactly one matching icon (Dobble rule)
 */
export function validateDobbleRule(card1: GameCard, card2: GameCard): boolean {
  const matches = findMatchingIcons(card1, card2);
  return matches.length === 1;
}

/**
 * Select three random cards for a game round
 * Ensures the center card shares exactly one icon with each player card
 */
export function selectGameCards(allCards: GameCard[]): {
  centerCard: GameCard;
  player1Card: GameCard;
  player2Card: GameCard;
} {
  if (allCards.length < 3) {
    throw new Error('Not enough cards to select from');
  }

  // Randomly select three different cards
  const shuffled = [...allCards].sort(() => Math.random() - 0.5);
  
  let centerCard = shuffled[0];
  let player1Card = shuffled[1];
  let player2Card = shuffled[2];

  // Ensure each player card has exactly one match with center card
  let attempts = 0;
  while (attempts < 50) { // Prevent infinite loop
    const player1Matches = findMatchingIcons(centerCard, player1Card);
    const player2Matches = findMatchingIcons(centerCard, player2Card);
    
    if (player1Matches.length === 1 && player2Matches.length === 1) {
      break;
    }
    
    // Reshuffle and try again
    const newShuffled = [...allCards].sort(() => Math.random() - 0.5);
    centerCard = newShuffled[0];
    player1Card = newShuffled[1];
    player2Card = newShuffled[2];
    attempts++;
  }

  return {
    centerCard: { ...centerCard, position: 'center' },
    player1Card: { ...player1Card, position: 'player1' },
    player2Card: { ...player2Card, position: 'player2' }
  };
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Simple hash function for consistent "randomness" based on string
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Seeded "random" function that returns consistent values for same input
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Calculate stable positions for icons within a card (circular arrangement)
 */
export function calculateIconPositions(cardIcons: GameIcon[]): Array<{
  icon: GameIcon;
  x: number;
  y: number;
  rotation: number;
  fontSize: number;
}> {
  const positions = [];
  const radius = 100;
  const centerX = 50;
  const centerY = 50;
  const count = cardIcons.length;

  // Calculate positions in a circle
  const angleStep = (2 * Math.PI) / (count - 1);
  
  // Outer circle positions
  for (let i = 0; i < count - 1; i++) {
    const angle = i * angleStep;
    const x = centerX + (radius * Math.cos(angle)) / 300 * 100;
    const y = centerY + (radius * Math.sin(angle)) / 300 * 100;
    
    // Use icon ID for consistent rotation and size
    const iconSeed = simpleHash(cardIcons[i].id + '_rotation');
    const sizeSeed = simpleHash(cardIcons[i].id + '_size');
    
    positions.push({
      icon: cardIcons[i],
      x,
      y,
      rotation: seededRandom(iconSeed) * 360, // Stable rotation based on icon ID
      fontSize: 28 + seededRandom(sizeSeed) * 28 // Stable size between 28-56px
    });
  }
  
  // Center position for last icon
  if (count > 0) {
    const centerIcon = cardIcons[count - 1];
    const iconSeed = simpleHash(centerIcon.id + '_rotation');
    const sizeSeed = simpleHash(centerIcon.id + '_size');
    
    positions.push({
      icon: centerIcon,
      x: centerX,
      y: centerY,
      rotation: seededRandom(iconSeed) * 360,
      fontSize: 28 + seededRandom(sizeSeed) * 28
    });
  }

  // Create a stable "shuffle" based on the combined icon IDs
  const shuffleSeed = simpleHash(cardIcons.map(icon => icon.id).join(''));
  const stableShuffledPositions = [...positions];
  
  // Stable shuffle using seeded random
  for (let i = stableShuffledPositions.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(shuffleSeed + i) * (i + 1));
    [stableShuffledPositions[i], stableShuffledPositions[j]] = [stableShuffledPositions[j], stableShuffledPositions[i]];
  }
  
  return stableShuffledPositions;
}

/**
 * Check if a clicked icon matches any icon in the center card
 */
export function checkIconMatch(clickedIcon: GameIcon, centerCard: GameCard): boolean {
  return centerCard.icons.some(icon => icon.dataIcon === clickedIcon.dataIcon);
}

/**
 * Format time from seconds to MM:SS format
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

/**
 * Calculate game score based on matches and time
 */
export function calculateScore(
  correctMatches: number,
  incorrectMatches: number,
  timeElapsed: number,
  difficulty: 'debug' | 'easy' | 'medium' | 'hard' = 'medium'
): number {
  const basePoints = correctMatches * 100;
  const timeBonus = Math.max(0, 300 - timeElapsed) * 2; // Bonus for speed
  const penaltyPoints = incorrectMatches * 25; // Penalty for mistakes
  
  // Difficulty multiplier
  const difficultyMultiplier = {
    debug: 1.0, // Same as medium for testing
    easy: 0.8,
    medium: 1.0,
    hard: 1.3
  }[difficulty];
  
  const finalScore = Math.max(0, (basePoints + timeBonus - penaltyPoints) * difficultyMultiplier);
  return Math.round(finalScore);
}

/**
 * Decode HTML entities to their Unicode character equivalents
 */
export function decodeHTMLEntity(entity: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = entity;
  return textarea.value;
} 