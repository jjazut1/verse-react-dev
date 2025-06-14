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
  
  // Calculate grid-like positions for eggs
  const newEggs: EggType[] = [];
  const numEggs = Math.min(config.eggQty, allWords.length);
  const gridCols = Math.ceil(Math.sqrt(numEggs));
  
  // Calculate cell dimensions with padding to prevent overlap
  const titleHeight = 20; // Reserve top 20% for title
  const bottomReserve = 30; // Reserve bottom 30% for baskets
  const usableHeight = 100 - titleHeight - bottomReserve; // Remaining space for eggs
  
  const horizontalPadding = 15; // 15% padding from sides
  const usableWidth = 100 - (2 * horizontalPadding);
  
  const cellWidth = usableWidth / gridCols;
  const cellHeight = usableHeight / Math.ceil(numEggs / gridCols);
  
  // Shuffle allWords array before creating eggs
  const shuffledWords = [...allWords].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < numEggs; i++) {
    const randomWord = shuffledWords[i];
    const row = Math.floor(i / gridCols);
    const col = i % gridCols;
    
    // Calculate base position
    const baseX = horizontalPadding + (col * cellWidth) + (cellWidth / 2);
    const baseY = titleHeight + (row * cellHeight) + (cellHeight / 2);
    
    // Add small random offset (max 10% of cell size)
    const maxOffset = Math.min(cellWidth, cellHeight) * 0.1;
    const offsetX = (Math.random() - 0.5) * maxOffset;
    const offsetY = (Math.random() - 0.5) * maxOffset;
    
    newEggs.push({
      id: `egg-${Date.now()}-${i}`,
      word: randomWord,
      cracked: false,
      position: {
        x: baseX + offsetX,
        y: baseY + offsetY,
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