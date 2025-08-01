import { Timestamp } from 'firebase/firestore';
import { SortCategoriesConfig, EggType, BasketType, Word } from './types';

// Generate eggs with grid-like positioning
export const generateEggs = (config: SortCategoriesConfig): EggType[] => {
  // Determine which categories format to use
  let categoriesToUse = config.categories;
  let isRichTextAvailable = false;
  
  if ((config as any).richCategories && Array.isArray((config as any).richCategories)) {
    // Use rich text categories if available
    categoriesToUse = (config as any).richCategories;
    isRichTextAvailable = true;
  }
  
  // Create words from categories
  const allWords: Word[] = [];
  categoriesToUse.forEach((category: any) => {
    if (isRichTextAvailable && category.items && Array.isArray(category.items)) {
      // Rich text format: each item has content and text fields
      category.items.forEach((item: any) => {
        allWords.push({ 
          text: item.content || item.text || item, // Prefer rich content for display
          category: category.name 
        });
      });
    } else if (Array.isArray(category.items)) {
      // Legacy format: items are strings
      category.items.forEach((item: string) => {
        allWords.push({ text: item, category: category.name });
      });
    }
  });
  
  // Generate container positions with random placement and collision detection
  const newEggs: EggType[] = [];
  const numEggs = Math.min(config.eggQty, allWords.length);
  
  // Define safe zones for container placement - optimized for landscape with baskets in game area
  const titleHeight = 3; // Small top reserve for spacing
  const bottomReserve = 30; // Reserve space for baskets at bottom (reduced from 35% for more space)
  const usableHeight = 100 - titleHeight - bottomReserve; // Available space for eggs
  
  const horizontalPadding = 4; // Balanced horizontal padding
  const usableWidth = 100 - (2 * horizontalPadding);
  
  // Container size estimates for collision detection (in percentage units) - optimized for landscape
  const containerWidth = 3.5; // Balanced container width for good density
  const containerHeight = 5; // Balanced container height
  const minDistance = 6.5; // Good minimum distance for landscape density without overlap
  
  // Shuffle allWords array before creating eggs
  const shuffledWords = [...allWords].sort(() => Math.random() - 0.5);
  
  // Store all generated positions for collision detection
  const usedPositions: { x: number; y: number }[] = [];
  
  // Function to check if a position collides with existing positions
  const checkCollision = (x: number, y: number): boolean => {
    return usedPositions.some(pos => {
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      return distance < minDistance;
    });
  };
  
  // Function to generate a random position within safe bounds
  const generateRandomPosition = (): { x: number; y: number } => {
    const x = horizontalPadding + (Math.random() * usableWidth);
    const y = titleHeight + (Math.random() * usableHeight);
    return { x, y };
  };
  
  // Generate positions for each container
  for (let i = 0; i < numEggs; i++) {
    const randomWord = shuffledWords[i];
    let position: { x: number; y: number };
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loops
    
    // Try to find a non-colliding position
    do {
      position = generateRandomPosition();
      attempts++;
    } while (checkCollision(position.x, position.y) && attempts < maxAttempts);
    
    // If we couldn't find a good position after many attempts, use fallback grid
    if (attempts >= maxAttempts) {
      const gridCols = Math.ceil(Math.sqrt(numEggs));
      const row = Math.floor(i / gridCols);
      const col = i % gridCols;
      const cellWidth = usableWidth / gridCols;
      const cellHeight = usableHeight / Math.ceil(numEggs / gridCols);
      
      position = {
        x: horizontalPadding + (col * cellWidth) + (cellWidth / 2),
        y: titleHeight + (row * cellHeight) + (cellHeight / 2)
      };
    }
    
    // Add small random variation to make it look more natural
    const variation = 2; // 2% variation
    const finalX = Math.max(
      horizontalPadding + containerWidth/2, 
      Math.min(
        100 - horizontalPadding - containerWidth/2, 
        position.x + (Math.random() - 0.5) * variation
      )
    );
    const finalY = Math.max(
      titleHeight + containerHeight/2, 
      Math.min(
        titleHeight + usableHeight - containerHeight/2, 
        position.y + (Math.random() - 0.5) * variation
      )
    );
    
    // Store the position for collision detection
    usedPositions.push({ x: finalX, y: finalY });
    
    newEggs.push({
      id: `egg-${Date.now()}-${i}`,
      word: randomWord,
      cracked: false,
      position: {
        x: finalX,
        y: finalY,
      },
    });
  }
  
  return newEggs;
};

// Generate baskets from config categories
export const generateBaskets = (config: SortCategoriesConfig): BasketType[] => {
  // Determine which categories format to use
  let categoriesToUse = config.categories;
  
  if ((config as any).richCategories && Array.isArray((config as any).richCategories)) {
    // Use rich text categories if available
    categoriesToUse = (config as any).richCategories;
  }
  
  return categoriesToUse.map((category: any, index: number) => ({
    id: `basket-${index}`,
    name: category.name,
    items: [],
  }));
};

// Check if word belongs to basket category
export const isWordCorrectForBasket = (word: Word, basket: BasketType): boolean => {
  return word.category === basket.name;
};

// Calculate score for correct placement
export const calculateScoreForPlacement = (word: Word, basket: BasketType): number => {
  return isWordCorrectForBasket(word, basket) ? 10 : 0;
};

// Check if game is complete
export const isGameComplete = (eggs: EggType[], baskets: BasketType[]): boolean => {
  // Game is complete when all eggs are cracked and all words are placed
  const allEggsCracked = eggs.every(egg => egg.cracked);
  const totalWordsPlaced = baskets.reduce((total, basket) => total + basket.items.length, 0);
  const totalCrackedEggs = eggs.filter(egg => egg.cracked).length;
  
  return allEggsCracked && totalWordsPlaced === totalCrackedEggs;
};

// Get fallback configurations
export const getFallbackConfigs = (): SortCategoriesConfig[] => {
  return [
    {
      id: 'fallback1',
      type: 'sort-categories-egg',
      title: 'Animals',
      description: 'Sort animals into categories',
      difficulty: 'medium',
      timeLimit: 300,
      targetScore: 100,
      eggQty: 12,
      categories: [
        { name: 'Mammals', items: ['dog', 'cat', 'elephant', 'giraffe'] },
        { name: 'Birds', items: ['eagle', 'parrot', 'penguin', 'owl'] },
        { name: 'Reptiles', items: ['snake', 'lizard', 'turtle', 'crocodile'] }
      ],
      share: true,
      createdAt: Timestamp.fromDate(new Date())
    },
    {
      id: 'fallback2',
      type: 'sort-categories-egg',
      title: 'Colors',
      description: 'Sort items by color',
      difficulty: 'easy',
      timeLimit: 240,
      targetScore: 80,
      eggQty: 9,
      categories: [
        { name: 'Red', items: ['apple', 'strawberry', 'fire truck'] },
        { name: 'Blue', items: ['sky', 'ocean', 'blueberry'] },
        { name: 'Green', items: ['grass', 'leaf', 'frog'] }
      ],
      share: true,
      createdAt: Timestamp.fromDate(new Date())
    }
  ];
};

// Check if score qualifies as high score
export const checkHighScore = (newScore: number, highScores: any[]): boolean => {
  if (highScores.length < 10) return true;
  return newScore > Math.min(...highScores.map(hs => hs.score));
}; 