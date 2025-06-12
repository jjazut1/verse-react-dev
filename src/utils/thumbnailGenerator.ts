import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

interface ThumbnailGenerationOptions {
  type: 'sort-categories-egg' | 'whack-a-mole' | 'spinner-wheel' | 'anagram' | 'place-value-showdown';
  title: string;
  categories?: Array<{ name: string; items: string[] }>;
  wordCategories?: Array<{ title: string; words: string[] }>;
  spinnerItems?: Array<{ text: string; color?: string }>;
  anagrams?: Array<{ original: string; definition?: string; type: 'word' | 'sentence' }>;
  placeValueConfig?: {
    numberOfCards: number;
    objective: 'largest' | 'smallest';
    winningScore: number;
  };
}

/**
 * Generates a thumbnail image for a game configuration
 * Uses HTML canvas to create a visual representation of the game
 */
export function generateThumbnailDataUrl(options: ThumbnailGenerationOptions): string {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 300;
  canvas.height = 200;
  
  if (!ctx) return getDefaultThumbnail(options.type);
  
  // Set background color based on game type
  const backgroundColors = {
    'sort-categories-egg': '#e1c3ff', // More vibrant purple
    'whack-a-mole': '#b8ffcc',  // More vibrant green
    'spinner-wheel': '#ffe1b3',  // Light orange for spinner wheel
    'anagram': '#b3d4ff',  // Light blue for anagram
    'place-value-showdown': '#ffe6e6'  // Light red for place value showdown
  };
  
  // Fill background
  ctx.fillStyle = backgroundColors[options.type] || '#f0f0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add game-specific visuals
  if (options.type === 'sort-categories-egg') {
    drawSortCategoriesPreview(ctx, options, canvas.width, canvas.height);
  } else if (options.type === 'whack-a-mole') {
    drawWhackAMolePreview(ctx, options, canvas.width, canvas.height);
  } else if (options.type === 'spinner-wheel') {
    drawSpinnerWheelPreview(ctx, options, canvas.width, canvas.height);
  } else if (options.type === 'anagram') {
    drawAnagramPreview(ctx, options, canvas.width, canvas.height);
  } else if (options.type === 'place-value-showdown') {
    drawPlaceValueShowdownPreview(ctx, options, canvas.width, canvas.height);
  }
  
  // Add title text
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(shortenText(options.title, 20), canvas.width / 2, 30);
  
  // Convert canvas to data URL
  return canvas.toDataURL('image/png');
}

/**
 * Uploads a data URL to Firebase Storage and returns the download URL
 */
export async function uploadThumbnail(
  dataUrl: string, 
  gameId: string, 
  gameType: string
): Promise<string> {
  try {
    const storage = getStorage();
    const storagePath = `thumbnails/${gameType}/${gameId}.png`;
    const storageRef = ref(storage, storagePath);
    
    // Upload the data URL
    await uploadString(storageRef, dataUrl, 'data_url');
    
    // Get the download URL
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    return '';
  }
}

/**
 * Creates a thumbnail for the Sort Categories Egg game
 */
function drawSortCategoriesPreview(
  ctx: CanvasRenderingContext2D,
  options: ThumbnailGenerationOptions,
  width: number, 
  height: number
) {
  // Draw egg icons
  drawEggs(ctx, width, height);
  
  // Draw categories if available
  if (options.categories && options.categories.length > 0) {
    drawCategories(ctx, options.categories, width, height);
  }
}

/**
 * Creates a thumbnail for the Whack-a-Mole game
 */
function drawWhackAMolePreview(
  ctx: CanvasRenderingContext2D,
  options: ThumbnailGenerationOptions,
  width: number, 
  height: number
) {
  // Draw mole icons
  drawMoles(ctx, width, height);
  
  // Draw word categories if available
  if (options.wordCategories && options.wordCategories.length > 0) {
    const wordList = options.wordCategories.flatMap(cat => cat.words).slice(0, 8);
    drawWordCloud(ctx, wordList, width, height);
  }
}

/**
 * Creates a thumbnail for the Anagram game
 */
function drawAnagramPreview(
  ctx: CanvasRenderingContext2D,
  options: ThumbnailGenerationOptions,
  width: number, 
  height: number
) {
  // Draw puzzle piece icon
  drawPuzzlePieces(ctx, width, height);
  
  // Draw anagram words if available
  if (options.anagrams && options.anagrams.length > 0) {
    drawAnagramWords(ctx, options.anagrams, width, height);
  }
}

/**
 * Creates a thumbnail for the Spinner Wheel game
 */
function drawSpinnerWheelPreview(
  ctx: CanvasRenderingContext2D,
  options: ThumbnailGenerationOptions,
  width: number, 
  height: number
) {
  // Draw spinner wheel
  const centerX = width * 0.5;
  const centerY = height * 0.6;
  const radius = 60;
  
  // Draw wheel segments
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFD93D', '#DDA0DD'];
  const segments = options.spinnerItems?.length || 6;
  const anglePerSegment = (2 * Math.PI) / segments;
  
  for (let i = 0; i < segments; i++) {
    const startAngle = i * anglePerSegment;
    const endAngle = (i + 1) * anglePerSegment;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  // Draw center circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
  ctx.fillStyle = '#333';
  ctx.fill();
  
  // Draw pointer
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - radius - 20);
  ctx.lineTo(centerX - 8, centerY - radius - 5);
  ctx.lineTo(centerX + 8, centerY - radius - 5);
  ctx.closePath();
  ctx.fillStyle = '#333';
  ctx.fill();
  
  // Draw sample items if available
  if (options.spinnerItems && options.spinnerItems.length > 0) {
    const displayItems = options.spinnerItems.slice(0, 4);
    ctx.fillStyle = '#555555';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    displayItems.forEach((item, index) => {
      const angle = (index * anglePerSegment) + (anglePerSegment / 2);
      const textRadius = radius * 0.7;
      const textX = centerX + textRadius * Math.cos(angle);
      const textY = centerY + textRadius * Math.sin(angle);
      
      ctx.fillText(shortenText(item.text, 6), textX, textY);
    });
  }
}

/**
 * Creates a thumbnail for the Place Value Showdown game
 */
function drawPlaceValueShowdownPreview(
  ctx: CanvasRenderingContext2D,
  options: ThumbnailGenerationOptions,
  width: number, 
  height: number
) {
  // Draw playing cards with numbers
  const cardWidth = 30;
  const cardHeight = 40;
  const cardSpacing = 35;
  const numberOfCards = options.placeValueConfig?.numberOfCards || 3;
  const startX = (width - (numberOfCards * cardSpacing)) / 2;
  
  // Draw digit cards
  for (let i = 0; i < numberOfCards; i++) {
    const cardX = startX + (i * cardSpacing);
    const cardY = height * 0.4;
    
    // Draw card background
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
    ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);
    
    // Draw sample digit
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    const digit = Math.floor(Math.random() * 10);
    ctx.fillText(digit.toString(), cardX + cardWidth/2, cardY + cardHeight/2 + 6);
  }
  
  // Draw VS symbol
  ctx.fillStyle = '#ff6b6b';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('VS', width * 0.5, height * 0.7);
  
  // Draw objective indicator
  const objective = options.placeValueConfig?.objective || 'largest';
  ctx.fillStyle = '#666666';
  ctx.font = '12px Arial';
  ctx.fillText(`Create ${objective} number`, width * 0.5, height * 0.8);
  
  // Draw trophy icon
  ctx.fillStyle = '#ffd700';
  ctx.font = '24px Arial';
  ctx.fillText('🏆', width * 0.5, height * 0.25);
  
  // Draw place value positions
  ctx.fillStyle = '#888888';
  ctx.font = '10px Arial';
  const positions = numberOfCards === 2 ? ['10s', '1s'] : 
                   numberOfCards === 3 ? ['100s', '10s', '1s'] :
                   numberOfCards === 4 ? ['1000s', '100s', '10s', '1s'] : 
                   ['10000s', '1000s', '100s', '10s', '1s'];
  
  for (let i = 0; i < numberOfCards; i++) {
    const cardX = startX + (i * cardSpacing);
    const cardY = height * 0.4;
    ctx.fillText(positions[i], cardX + cardWidth/2, cardY - 5);
  }
}

/**
 * Draws egg icons for Sort Categories Egg game
 */
function drawEggs(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Draw multiple eggs
  const eggPositions = [
    { x: width * 0.2, y: height * 0.5 },
    { x: width * 0.5, y: height * 0.4 },
    { x: width * 0.8, y: height * 0.6 }
  ];
  
  eggPositions.forEach(pos => {
    // Draw egg
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, 30, 40, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Add crack to one egg
    if (pos.x === width * 0.5) {
      ctx.strokeStyle = '#888888';
      ctx.beginPath();
      ctx.moveTo(pos.x - 15, pos.y - 20);
      ctx.lineTo(pos.x + 5, pos.y);
      ctx.lineTo(pos.x - 5, pos.y + 10);
      ctx.stroke();
    }
  });
}

/**
 * Draws moles for Whack-a-Mole game
 */
function drawMoles(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Draw a mole peeking out
  const moleX = width * 0.5;
  const moleY = height * 0.6;
  
  // Draw hole
  ctx.fillStyle = '#654321';
  ctx.beginPath();
  ctx.ellipse(moleX, moleY + 10, 40, 20, 0, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw mole
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.arc(moleX, moleY - 20, 30, 0, Math.PI, false);
  ctx.fill();
  
  // Draw face
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(moleX - 10, moleY - 30, 5, 0, 2 * Math.PI);
  ctx.arc(moleX + 10, moleY - 30, 5, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw hammer
  ctx.fillStyle = '#A0522D';
  ctx.fillRect(width * 0.7, height * 0.3, 10, 50);
  
  ctx.fillStyle = '#708090';
  ctx.fillRect(width * 0.65, height * 0.2, 20, 30);
}

/**
 * Draws categories for Sort Categories Egg game
 */
function drawCategories(
  ctx: CanvasRenderingContext2D,
  categories: Array<{ name: string; items: string[] }>,
  width: number,
  height: number
) {
  // Draw up to 3 category boxes
  const displayCategories = categories.slice(0, 3);
  
  ctx.fillStyle = '#555555';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  
  displayCategories.forEach((category, index) => {
    const boxWidth = width * 0.25;
    const boxHeight = 30;
    const boxX = 30 + (index * (boxWidth + 20));
    const boxY = height * 0.8;
    
    // Draw category box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    
    // Draw category name
    ctx.fillStyle = '#333333';
    ctx.fillText(shortenText(category.name, 10), boxX + boxWidth/2, boxY + 20);
  });
  
  // If there are more categories, add indicator
  if (categories.length > 3) {
    ctx.fillStyle = '#555555';
    ctx.textAlign = 'center';
    ctx.fillText(`+${categories.length - 3} more`, width * 0.8, height * 0.85);
  }
}

/**
 * Draws a word cloud for Whack-a-Mole game
 */
function drawWordCloud(
  ctx: CanvasRenderingContext2D,
  words: string[],
  width: number,
  height: number
) {
  const displayWords = words.slice(0, 8);
  
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  
  // Randomly position words
  displayWords.forEach((word, index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    
    const xPos = (width * 0.2) + (col * width * 0.2);
    const yPos = (height * 0.4) + (row * 30);
    
    // Random subtle color
    const hue = (index * 40) % 360;
    ctx.fillStyle = `hsla(${hue}, 70%, 40%, 0.8)`;
    
    ctx.fillText(shortenText(word, 8), xPos, yPos);
  });
  
  // If there are more words, add indicator
  if (words.length > 8) {
    ctx.fillStyle = '#555555';
    ctx.fillText(`+${words.length - 8} more words`, width * 0.5, height * 0.9);
  }
}

/**
 * Draws puzzle pieces for Anagram game
 */
function drawPuzzlePieces(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Draw scattered puzzle pieces
  const piecePositions = [
    { x: width * 0.3, y: height * 0.5, rotation: 0 },
    { x: width * 0.7, y: height * 0.4, rotation: Math.PI / 6 },
    { x: width * 0.5, y: height * 0.6, rotation: -Math.PI / 4 }
  ];
  
  piecePositions.forEach(pos => {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(pos.rotation);
    
    // Draw puzzle piece shape
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.roundRect(-20, -15, 40, 30, 5);
    ctx.fill();
    ctx.stroke();
    
    // Add puzzle piece notch
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.arc(20, 0, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.restore();
  });
  
  // Add connecting lines to show relationship
  ctx.strokeStyle = '#aaaaaa';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(width * 0.3, height * 0.5);
  ctx.lineTo(width * 0.7, height * 0.4);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Draws anagram words for preview
 */
function drawAnagramWords(
  ctx: CanvasRenderingContext2D,
  anagrams: Array<{ original: string; definition?: string; type: 'word' | 'sentence' }>,
  width: number,
  height: number
) {
  const displayAnagrams = anagrams.slice(0, 3);
  
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  
  displayAnagrams.forEach((anagram, index) => {
    const xPos = (width * 0.2) + (index * width * 0.3);
    const yPos = height * 0.8;
    
    // Scramble the letters/words for visual effect
    const scrambled = anagram.type === 'word' 
      ? scrambleText(anagram.original)
      : scrambleWords(anagram.original);
    
    // Draw scrambled text
    ctx.fillStyle = '#666666';
    ctx.fillText(shortenText(scrambled, 8), xPos, yPos);
    
    // Draw arrow
    ctx.fillStyle = '#888888';
    ctx.fillText('↓', xPos, yPos + 15);
    
    // Draw original text
    ctx.fillStyle = '#333333';
    ctx.fillText(shortenText(anagram.original, 8), xPos, yPos + 30);
  });
  
  // If there are more anagrams, add indicator
  if (anagrams.length > 3) {
    ctx.fillStyle = '#555555';
    ctx.fillText(`+${anagrams.length - 3} more`, width * 0.85, height * 0.85);
  }
}

/**
 * Simple text scrambling for preview
 */
function scrambleText(text: string): string {
  const chars = text.split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/**
 * Simple word scrambling for preview
 */
function scrambleWords(text: string): string {
  const words = text.split(' ');
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  return words.join(' ');
}

/**
 * Helper function to shorten text with ellipsis
 */
function shortenText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Returns a default thumbnail URL based on game type
 */
function getDefaultThumbnail(type: string): string {
  // These would be replaced with actual URLs to default images
  const defaults: Record<string, string> = {
    'sort-categories-egg': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2QM1kHwAAAABJRU5ErkJggg==',
    'whack-a-mole': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2QM1kHwAAAABJRU5ErkJggg==',
    'spinner-wheel': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2QM1kHwAAAABJRU5ErkJggg==',
    'anagram': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2QM1kHwAAAABJRU5ErkJggg==',
    'place-value-showdown': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2QM1kHwAAAABJRU5ErkJggg==',
  };
  
  return defaults[type] || defaults['sort-categories-egg'];
}

/**
 * Main function to generate and upload a thumbnail for a game
 */
export async function generateAndUploadThumbnail(
  gameId: string,
  gameData: any
): Promise<string> {
  try {
    // Extract relevant data based on game type
    const options: ThumbnailGenerationOptions = {
      type: gameData.type as 'sort-categories-egg' | 'whack-a-mole' | 'spinner-wheel' | 'anagram' | 'place-value-showdown',
      title: gameData.title || 'Game',
    };
    
    // Add game-specific data
    if (options.type === 'sort-categories-egg' && gameData.categories) {
      options.categories = gameData.categories;
    } else if (options.type === 'whack-a-mole' && gameData.categories) {
      options.wordCategories = gameData.categories;
    } else if (options.type === 'spinner-wheel' && gameData.items) {
      options.spinnerItems = gameData.items;
    } else if (options.type === 'anagram' && gameData.anagrams) {
      options.anagrams = gameData.anagrams;
    } else if (options.type === 'place-value-showdown') {
      options.placeValueConfig = {
        numberOfCards: gameData.numberOfCards || 3,
        objective: gameData.objective || 'largest',
        winningScore: gameData.winningScore || 5
      };
    }
    
    // Generate thumbnail
    const dataUrl = generateThumbnailDataUrl(options);
    
    // Upload to Firebase Storage
    return await uploadThumbnail(dataUrl, gameId, options.type);
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return '';
  }
} 