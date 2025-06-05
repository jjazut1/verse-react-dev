import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Text,
  VStack,
  HStack,
  useToast,
  useBreakpointValue,
  FormControl,
  FormLabel,
  Input,
  ResponsiveValue,
} from '@chakra-ui/react';
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import Egg from './Egg';
import Basket from './Basket';
import GameConfig from './GameConfig';
import { GameConfig as GameConfigType, Word, Egg as EggType, Basket as BasketType, HighScore as HighScoreType } from '../../../types/game';
import { motion } from 'framer-motion';
import { sanitizeName, isValidPlayerName } from '../../../utils/profanityFilter';

// Rich text rendering component (same as in Egg.tsx)
const RichText: React.FC<{ content: string; fontSize: any; noPadding?: boolean }> = ({ content, fontSize, noPadding = false }) => {
  // Check if this is rich text (contains HTML tags)
  const isRichText = typeof content === 'string' && content.includes('<');
  
  if (!isRichText) {
    // Plain text
    return (
      <Text
        fontSize={fontSize}
        color="gray.700"
        letterSpacing="0.5px"
        fontWeight="medium"
        px={noPadding ? 0 : 2}
        py={noPadding ? 0 : 1}
        borderRadius="md"
        fontFamily="'Comic Neue', sans-serif"
      >
        {content}
      </Text>
    );
  }
  
  // Rich text - parse HTML and render with styling
  const parseRichText = (htmlContent: string) => {
    // Detect formatting styles
    const textStyles = {
      bold: htmlContent.includes('<strong>') || htmlContent.includes('<b>'),
      italic: htmlContent.includes('<em>') || htmlContent.includes('<i>'),
      underline: htmlContent.includes('<u>') && htmlContent.includes('</u>'),
      superscript: htmlContent.includes('<sup>') && htmlContent.includes('</sup>'),
      subscript: htmlContent.includes('<sub>') && htmlContent.includes('</sub>')
    };
    
    // Extract plain text for simple formatting
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    let displayText = tempDiv.textContent || tempDiv.innerText || htmlContent;
    
    // For super/subscript, we need special handling
    if (textStyles.superscript || textStyles.subscript) {
      // Parse super/subscript text
      let beforeScript = '';
      let scriptText = '';
      let afterScript = '';
      
      if (textStyles.superscript) {
        const supMatch = htmlContent.match(/^(.*?)<sup>(.*?)<\/sup>(.*)$/);
        if (supMatch) {
          beforeScript = supMatch[1].replace(/<[^>]*>/g, '');
          scriptText = supMatch[2];
          afterScript = supMatch[3].replace(/<[^>]*>/g, '');
        }
      } else if (textStyles.subscript) {
        const subMatch = htmlContent.match(/^(.*?)<sub>(.*?)<\/sub>(.*)$/);
        if (subMatch) {
          beforeScript = subMatch[1].replace(/<[^>]*>/g, '');
          scriptText = subMatch[2];
          afterScript = subMatch[3].replace(/<[^>]*>/g, '');
        }
      }
      
      // Render with scripts
      return (
        <Text
          fontSize={fontSize}
          color="gray.700"
          letterSpacing="0.5px"
          fontWeight={textStyles.bold ? "bold" : "medium"}
          fontStyle={textStyles.italic ? "italic" : "normal"}
          textDecoration={textStyles.underline ? "underline" : "none"}
          px={noPadding ? 0 : 2}
          py={noPadding ? 0 : 1}
          borderRadius="md"
          fontFamily="'Comic Neue', sans-serif"
          display="inline-flex"
          alignItems="baseline"
        >
          {beforeScript}
          <Text
            as="span"
            fontSize="0.7em"
            verticalAlign={textStyles.superscript ? "super" : "sub"}
            lineHeight="1"
          >
            {scriptText}
          </Text>
          {afterScript}
        </Text>
      );
    }
    
    // Regular formatting (bold, italic, underline)
    return (
      <Text
        fontSize={fontSize}
        color="gray.700"
        letterSpacing="0.5px"
        fontWeight={textStyles.bold ? "bold" : "medium"}
        fontStyle={textStyles.italic ? "italic" : "normal"}
        textDecoration={textStyles.underline ? "underline" : "none"}
        px={noPadding ? 0 : 2}
        py={noPadding ? 0 : 1}
        borderRadius="md"
        fontFamily="'Comic Neue', sans-serif"
      >
        {displayText}
      </Text>
    );
  };
  
  return parseRichText(content);
};

// Use the specific config type for this game
type SortCategoriesConfig = Extract<GameConfigType, { type: 'sort-categories-egg' }>;

interface SortCategoriesEggRevealProps {
  playerName: string;
  onGameComplete: (score: number) => void;
  config: SortCategoriesConfig;
  onHighScoreProcessStart?: () => void;
  onHighScoreProcessComplete?: () => void;
}

const SortCategoriesEggReveal: React.FC<SortCategoriesEggRevealProps> = ({
  playerName,
  onGameComplete,
  config: initialConfig,
  onHighScoreProcessStart,
  onHighScoreProcessComplete,
}): JSX.Element => {
  // Get the current user from auth context
  const { currentUser } = useAuth();
  
  // Game state
  const [score, setScore] = useState(0);
  const [eggs, setEggs] = useState<EggType[]>([]);
  const [crackedEggs, setCrackedEggs] = useState<EggType[]>([]);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [isWordSelected, setIsWordSelected] = useState(false);
  const [baskets, setBaskets] = useState<BasketType[]>([]);
  const [gameConfig, setGameConfig] = useState<SortCategoriesConfig>({
    title: 'Default Configuration',
    type: 'sort-categories-egg',
    description: 'Sort items into categories by cracking eggs',
    difficulty: 'medium',
    timeLimit: 300,
    targetScore: 100,
    eggQty: 6,
    categories: [
      { name: 'Category 1', items: ['Item 1', 'Item 2', 'Item 3'] },
      { name: 'Category 2', items: ['Item 4', 'Item 5', 'Item 6'] },
    ],
    share: false,
    createdAt: Timestamp.now(),
  });
  const [gameStarted, setGameStarted] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<SortCategoriesConfig[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ghostPosition, setGhostPosition] = useState({ x: 0, y: 0 });
  const [targetBasket, setTargetBasket] = useState<BasketType | null>(null);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [highScores, setHighScores] = useState<HighScoreType[]>([]);
  const [isHighScore, setIsHighScore] = useState(false);
  const [showHighScoreDisplayModal, setShowHighScoreDisplayModal] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  
  const toast = useToast();
  const gameAreaRef = useRef<HTMLDivElement>(null);

  // Responsive values
  const containerPadding = useBreakpointValue({ base: 2, md: 3, lg: 4 });
  const headingSize = useBreakpointValue({ base: "sm", md: "md" });
  const gameHeight = useBreakpointValue({ base: "300px", md: "400px", lg: "450px" });
  const basketStackDirection = useBreakpointValue({ base: "column", md: "row" }) as ResponsiveValue<"column" | "row">;
  const modalSize = useBreakpointValue({ base: "sm", md: "md", lg: "xl" });
  const eggSize = useBreakpointValue({ base: "45px", md: "50px", lg: "55px" });
  const basketWidth = useBreakpointValue({ base: "120px", md: "140px", lg: "160px" });
  const basketSpacing = useBreakpointValue({ base: 2, md: 3, lg: 4 });

  // Load saved configurations
  useEffect(() => {
    loadSavedConfigs();
  }, []);

  const loadSavedConfigs = async () => {
    try {
      setIsLoading(true);
      const q = query(
        collection(db, 'userGameConfigs'),
        where('type', '==', 'sort-categories-egg'),
        where('share', '==', true)
      );
      const querySnapshot = await getDocs(q);
      const configs: SortCategoriesConfig[] = [];
      querySnapshot.forEach((doc) => {
        configs.push({ id: doc.id, ...doc.data() } as SortCategoriesConfig);
      });
      setSavedConfigs(configs);
    } catch (error) {
      console.error('Error loading configurations:', error);
      // Provide fallback data
      const fallbackConfigs: SortCategoriesConfig[] = [
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
        }
      ];
      setSavedConfigs(fallbackConfigs);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize game with provided config
  useEffect(() => {
    console.log('Initializing game with initial config:', initialConfig);
    const emptyBaskets = initialConfig.categories.map((category, index) => ({
      id: `basket-${index}`,
      name: category.name,
      items: [],
    }));
    setBaskets(emptyBaskets);
    initializeGame(initialConfig);
  }, [initialConfig]);

  // Initialize game with selected configuration
  const initializeGame = (config: SortCategoriesConfig) => {
    console.log('Initializing game with config:', config);
    // Ensure we preserve the ID when setting the game config
    setGameConfig({
      ...config,
      id: config.id // Explicitly preserve the ID
    });
    
    // Load high scores for this configuration
    if (config.id) {
      console.log('Loading high scores for config ID:', config.id);
      loadHighScores(config.id);
    } else {
      console.error('No config ID available for game initialization');
    }
    
    // Determine which categories format to use
    let categoriesToUse = config.categories;
    let isRichTextAvailable = false;
    
    if ((config as any).richCategories && Array.isArray((config as any).richCategories)) {
      // Use rich text categories if available
      categoriesToUse = (config as any).richCategories;
      isRichTextAvailable = true;
      console.log('Using rich text categories:', categoriesToUse);
    } else {
      console.log('Using legacy categories format');
    }
    
    // Create baskets from categories
    const newBaskets: BasketType[] = categoriesToUse.map((category: any, index: number) => ({
      id: `basket-${index}`,
      name: category.name,
      items: [],
    }));
    setBaskets(newBaskets);
    
    // Create eggs with random words from categories
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
    
    console.log('Generated words for eggs:', allWords.length, allWords);
    
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
    setEggs(newEggs);
    setCrackedEggs([]);
    setScore(0);
    setGameStarted(true);
  };

  // Handle egg click
  const handleEggClick = (egg: EggType) => {
    if (egg.cracked) return;
    
    const updatedEggs = eggs.map(e => 
      e.id === egg.id ? { ...e, cracked: true } : e
    );
    setEggs(updatedEggs);
    
    const crackedEgg = updatedEggs.find(e => e.id === egg.id);
    if (crackedEgg) {
      setCrackedEggs([...crackedEggs, crackedEgg]);
      // Remove automatic word selection on crack
      setSelectedWord(null);
      setIsWordSelected(false);
    }
  };

  // Handle word click
  const handleWordClick = (word: Word, e: React.MouseEvent) => {
    if (!gameAreaRef.current) return;
    
    if (isWordSelected && selectedWord?.text === word.text) {
      // If clicking the same word, deselect it
      setSelectedWord(null);
      setIsWordSelected(false);
      setTargetBasket(null);
    } else {
      // Select the word
      setSelectedWord(word);
      setIsWordSelected(true);
      
      const rect = gameAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setGhostPosition({ x, y });
    }
  };

  // Handle mouse move
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isWordSelected || !gameAreaRef.current || !selectedWord) return;
    
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setGhostPosition({ x, y });
    
    // Check if hovering over a basket
    const hoveredBasket = baskets.find(basket => {
      const basketElement = document.querySelector(`.basket-${basket.id}`);
      if (!basketElement) return false;
      
      const basketRect = basketElement.getBoundingClientRect();
      return (
        event.clientX >= basketRect.left &&
        event.clientX <= basketRect.right &&
        event.clientY >= basketRect.top &&
        event.clientY <= basketRect.bottom
      );
    });
    
    setTargetBasket(hoveredBasket || null);
  };

  // Handle click anywhere (for dropping)
  const handleGameAreaClick = (event: React.MouseEvent) => {
    if (!isWordSelected || !selectedWord) return;

    // Find clicked basket
    const clickedBasket = baskets.find(basket => {
      // Look for basket element with class name instead of id
      const basketElement = document.querySelector(`.basket-${basket.id}`);
      if (!basketElement) return false;
      
      const basketRect = basketElement.getBoundingClientRect();
      const isInBasket = (
        event.clientX >= basketRect.left &&
        event.clientX <= basketRect.right &&
        event.clientY >= basketRect.top &&
        event.clientY <= basketRect.bottom
      );
      
      if (isInBasket && selectedWord.category === basket.name) {
        return true;
      }
      return false;
    });

    if (clickedBasket) {
      placeWordInBasket(selectedWord, clickedBasket);
      setSelectedWord(null);
      setIsWordSelected(false);
      setTargetBasket(null);
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (!isWordSelected || !gameAreaRef.current) return;
      
      const rect = gameAreaRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setGhostPosition({ x, y });
    };

    if (isWordSelected) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isWordSelected]);

  // Place word in basket
  const placeWordInBasket = (word: Word, basket: BasketType) => {
    const newScore = score + 10;
    setScore(newScore);
    
    // Update baskets
    const updatedBaskets = baskets.map(b => {
      if (b.id === basket.id) {
        return {
          ...b,
          items: [...b.items, word],
        };
      }
      return b;
    });
    setBaskets(updatedBaskets);
    
    // Remove word from cracked eggs
    const updatedCrackedEggs = crackedEggs.filter(
      egg => egg.word.text !== word.text
    );
    setCrackedEggs(updatedCrackedEggs);
    
    // Check if game is complete
    const allEggsCracked = eggs.every(egg => egg.cracked);
    const allWordsPlaced = eggs.length === updatedBaskets.reduce((total, basket) => total + basket.items.length, 0);
    
    if (allEggsCracked && allWordsPlaced) {
      const finalScore = newScore;
      onGameComplete(finalScore);
      setIsGameComplete(true);
      
      // Check for high score
      checkHighScore(finalScore);
      
      // Play celebration sound if it's a high score
      if (isHighScore) {
        const audio = new Audio('/sounds/highscore.mp3');
        audio.volume = 0.5;
        audio.play().catch(console.error);
      }
    }
  };

  // Handle configuration selection
  const handleConfigSelect = (config: SortCategoriesConfig) => {
    initializeGame(config);
    setIsConfigModalOpen(false);
  };

  // Save current configuration
  const handleSaveConfig = async () => {
    if (!auth.currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to save configurations.',
        status: 'error',
        duration: 5000,
      });
      return;
    }

    try {
      // Create a clean categories array with exact structure required by rules
      const formattedCategories = gameConfig.categories.map((category, index) => {
        // Extract only the required fields and ensure correct types
        const cleanCategory = {
          name: String(category.name),
          items: Array.isArray(category.items) 
            ? category.items.map(item => String(item))
            : []
        };
        
        // Validate the category
        if (!cleanCategory.name || cleanCategory.name.trim().length === 0) {
          throw new Error(`Category ${index + 1} must have a name`);
        }
        if (cleanCategory.items.length === 0) {
          throw new Error(`Category ${index + 1} must have at least one item`);
        }
        if (cleanCategory.items.length > 100) {
          throw new Error(`Category ${index + 1} cannot have more than 100 items`);
        }
        
        return cleanCategory;
      });

      // Validate number of categories
      if (formattedCategories.length === 0) {
        throw new Error('At least one category is required');
      }
      if (formattedCategories.length > 20) {
        throw new Error('Cannot have more than 20 categories');
      }

      const configData = {
        type: 'sort-categories-egg',
        title: String(gameConfig.title || '').trim(),
        eggQty: Number(gameConfig.eggQty) || 6,
        categories: formattedCategories,
        share: true,  // Explicitly set to true
        userId: auth.currentUser.uid,
        email: auth.currentUser.email || null,
        createdAt: serverTimestamp()
      };

      // Log the exact data being sent
      console.log('Saving configuration:', JSON.stringify(configData, null, 2));

      await addDoc(collection(db, 'userGameConfigs'), configData);
      toast({
        title: 'Success',
        description: 'Configuration saved successfully',
        status: 'success',
        duration: 3000,
      });
      await loadSavedConfigs();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not save configuration. Please try again.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  // Handle reset game
  const handleResetGame = () => {
    console.log('Resetting game...');
    // Reset all game state
    setScore(0);
    setEggs([]);
    setCrackedEggs([]);
    setSelectedWord(null);
    setIsWordSelected(false);
    setGhostPosition({ x: 0, y: 0 });
    setTargetBasket(null);
    setIsGameComplete(false);
    setIsHighScore(false);
    setShowHighScoreDisplayModal(false);
    
    // Reset baskets
    const emptyBaskets = gameConfig.categories.map((category, index) => ({
      id: `basket-${index}`,
      name: category.name,
      items: [],
    }));
    setBaskets(emptyBaskets);
    
    // Create a fresh copy of the game config while preserving the original ID
    const freshConfig: SortCategoriesConfig = {
      ...gameConfig,
      categories: gameConfig.categories.map(cat => ({
        ...cat,
        items: Array.isArray(cat.items) 
          ? (typeof cat.items[0] === 'string' 
            ? [...(cat.items as string[])]
            : [...(cat.items as Array<{ content: string; text: string; }>)])
          : []
      }))
    };
    
    // Re-initialize game with fresh config
    initializeGame(freshConfig);
  };

  // Handle close game
  const handleCloseGame = () => {
    setGameStarted(false);
    setIsGameComplete(false);
  };

  // Load high scores for current configuration
  const loadHighScores = async (configId: string) => {
    try {
      const q = query(
        collection(db, 'highScores'),
        where('configId', '==', configId),
        orderBy('score', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const scores: HighScoreType[] = [];
      querySnapshot.forEach((doc) => {
        scores.push({ id: doc.id, ...doc.data() } as HighScoreType);
      });
      setHighScores(scores);
    } catch (error) {
      console.error('Error loading high scores:', error);
      setHighScores([]);
      toast({
        title: 'Error Loading High Scores',
        description: 'Could not load high scores. Please try again later.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  // Check if score qualifies for high score
  const checkHighScore = (newScore: number) => {
    console.log('Checking high score:', { 
      newScore, 
      highScores: highScores.length, 
      highScoreThreshold: highScores.length > 0 ? highScores[highScores.length - 1]?.score : 'none',
      isHighScore: highScores.length < 10 || newScore > (highScores[highScores.length - 1]?.score || 0)
    });
    
    if (highScores.length < 10 || newScore > (highScores[highScores.length - 1]?.score || 0)) {
      console.log('New high score detected!');
      setIsHighScore(true);
      if (onHighScoreProcessStart) {
        console.log('Notifying parent: high score process starting');
        onHighScoreProcessStart();
      }
      // Auto-save the high score with the actual final score
      saveHighScore(newScore);
    } else {
      // No high score to save, show high score display immediately
      console.log('Not a high score, showing display modal');
      setShowHighScoreDisplayModal(true);
      // Notify parent that high score process is complete after a delay
      setTimeout(() => {
        console.log('Notifying parent: high score process complete (not a high score)');
        if (onHighScoreProcessComplete) onHighScoreProcessComplete();
      }, 500);
    }
  };

  // Save high score
  const saveHighScore = async (finalScore?: number) => {
    if (!gameConfig.id) {
      console.error('No game config ID available');
      toast({
        title: 'Error Saving Score',
        description: 'Invalid game configuration.',
        status: 'error',
        duration: 3000,
      });
      if (onHighScoreProcessComplete) onHighScoreProcessComplete();
      return;
    }

    if (!currentUser) {
      toast({
        title: 'Error',
        description: 'Must be logged in to save high score',
        status: 'error',
        duration: 3000,
      });
      if (onHighScoreProcessComplete) onHighScoreProcessComplete();
      return;
    }

    try {
      setIsSubmittingScore(true);

      // Get the user's display name from their account
      let displayName = currentUser.displayName || playerName || 'Student';
      
      // Try to get the name from the users collection for more accurate display
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          displayName = userData.name || displayName;
        }
      } catch (error) {
        console.log('Could not fetch user name from database, using fallback');
      }

      // Check for rate limiting (5 scores per 5 minutes per user)
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      
      const recentScoresQuery = query(
        collection(db, 'highScores'),
        where('userId', '==', currentUser.uid),
        where('configId', '==', gameConfig.id),
        where('createdAt', '>', fiveMinutesAgo),
        limit(5)
      );
      
      const recentScoresSnap = await getDocs(recentScoresQuery);
      if (recentScoresSnap.size >= 5) {
        toast({
          title: 'Too Many Attempts',
          description: 'Please wait a few minutes before submitting another score.',
          status: 'error',
          duration: 3000,
        });
        setIsSubmittingScore(false);
        if (onHighScoreProcessComplete) onHighScoreProcessComplete();
        return;
      }

      // Verify that the game config exists and is valid
      const configRef = doc(db, 'userGameConfigs', gameConfig.id);
      const configSnap = await getDoc(configRef);
      
      if (!configSnap.exists()) {
        console.error('Game configuration not found:', gameConfig.id);
        toast({
          title: 'Error Saving Score',
          description: 'Game configuration not found.',
          status: 'error',
          duration: 3000,
        });
        setIsSubmittingScore(false);
        if (onHighScoreProcessComplete) onHighScoreProcessComplete();
        return;
      }

      const configData = configSnap.data();

      // Use the passed finalScore when available, fall back to state score
      const scoreToSave = finalScore !== undefined ? finalScore : score;
      
      // Validate that we have a valid score
      if (typeof scoreToSave !== 'number' || isNaN(scoreToSave) || scoreToSave < 0) {
        console.error('Invalid score detected:', scoreToSave);
        toast({
          title: 'Error Saving Score',
          description: 'Invalid score value detected.',
          status: 'error',
          duration: 3000,
        });
        setIsSubmittingScore(false);
        if (onHighScoreProcessComplete) onHighScoreProcessComplete();
        return;
      }

      // Create high score with userId and user's name
      const highScore = {
        userId: currentUser.uid,
        playerName: displayName,
        score: scoreToSave,
        configId: gameConfig.id,
        createdAt: serverTimestamp(),
        gameType: 'sort-categories-egg'
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'highScores'), highScore);
      
      toast({
        title: 'High Score Saved!',
        description: `Your score of ${scoreToSave} has been recorded.`,
        status: 'success',
        duration: 3000,
      });
      
      await loadHighScores(gameConfig.id);
      setShowHighScoreDisplayModal(true);
    } catch (error: any) {
      console.error('Error saving high score:', error);
      
      toast({
        title: 'Error Saving Score',
        description: 'Could not save your high score. Please try again.',
        status: 'error',
        duration: 3000,
      });
      if (onHighScoreProcessComplete) onHighScoreProcessComplete();
    } finally {
      setIsSubmittingScore(false);
    }
  };

  // Handle high score display modal close
  const handleHighScoreDisplayModalClose = () => {
    console.log('High score display modal closed');
    setShowHighScoreDisplayModal(false);
    // Notify parent that high score process is complete
    if (onHighScoreProcessComplete) {
      console.log('Notifying parent: high score process complete (after modal close)');
      onHighScoreProcessComplete();
    }
  };

  // Render configuration modal
  const renderConfigModal = () => (
    <Modal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} size={modalSize}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize={{ base: "md", md: "lg" }}>Game Configuration</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <GameConfig 
            isOpen={isConfigModalOpen} 
            onClose={() => setIsConfigModalOpen(false)} 
            onConfigSelect={handleConfigSelect} 
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  // Render high score display modal
  const renderHighScoreDisplayModal = () => (
    <Modal 
      isOpen={showHighScoreDisplayModal} 
      onClose={handleHighScoreDisplayModalClose}
      closeOnOverlayClick={false}
      isCentered
      size="md"
    >
      <ModalOverlay />
      <ModalContent fontFamily="'Comic Neue', sans-serif">
        <ModalHeader 
          fontSize={{ base: "xl", md: "2xl" }}
        textAlign="center"
        color="blue.600"
          borderBottom="2px solid"
          borderColor="blue.100"
          pb={2}
        fontFamily="'Comic Neue', sans-serif"
      >
          🏆 Top Scores 🏆
        </ModalHeader>
        <ModalBody>
          <VStack spacing={3} align="stretch" my={2}>
            {highScores.length > 0 ? (
              <>
                <HStack justify="space-between" fontWeight="bold" color="blue.600" mb={2}>
                  <Text fontFamily="'Comic Neue', sans-serif">Rank</Text>
                  <Text fontFamily="'Comic Neue', sans-serif">Player</Text>
                  <Text fontFamily="'Comic Neue', sans-serif">Score</Text>
                </HStack>
        {highScores.map((hs, index) => (
          <HStack
            key={hs.id}
            justify="space-between"
                    bg={isHighScore && score === hs.score && playerName === hs.playerName 
                        ? "yellow.50" 
                        : index % 2 === 0 
                          ? "blue.50" 
                          : "transparent"}
                    p={2}
            borderRadius="md"
          >
            <Text
              fontWeight={index < 3 ? "bold" : "normal"}
                      color={index < 3 ? "blue.600" : "gray.600"}
              fontFamily="'Comic Neue', sans-serif"
            >
                      {index + 1}.
            </Text>
            <Text
                      fontWeight={index < 3 ? "bold" : "normal"} 
              color={index < 3 ? "blue.600" : "gray.600"}
                      fontFamily="'Comic Neue', sans-serif"
                    >
                      {hs.playerName}
                    </Text>
                    <Text 
              fontWeight={index < 3 ? "bold" : "normal"}
                      color={index < 3 ? "blue.600" : "gray.600"}
              fontFamily="'Comic Neue', sans-serif"
            >
              {hs.score}
            </Text>
          </HStack>
        ))}
              </>
            ) : (
              <Text 
                textAlign="center" 
                color="gray.600" 
                my={4}
                fontFamily="'Comic Neue', sans-serif"
              >
                No high scores yet! Be the first to set a record.
              </Text>
            )}
            
            <Box textAlign="center" mt={4} p={3} bg="blue.50" borderRadius="md">
              <Text fontWeight="bold" color="blue.600" fontFamily="'Comic Neue', sans-serif">
                Your Score: {score}
              </Text>
              {isHighScore && (
                <Text color="green.500" fontWeight="bold" mt={1} fontFamily="'Comic Neue', sans-serif">
                  Congratulations on your high score!
                </Text>
              )}
    </Box>
          </VStack>
        </ModalBody>
        <ModalFooter justifyContent="center">
          <Button 
            colorScheme="blue" 
            onClick={handleHighScoreDisplayModalClose}
            size="lg"
            fontFamily="'Comic Neue', sans-serif"
            minW="150px"
          >
            Continue
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  // Render leaderboard - no longer needed as we show in modal instead
  const renderLeaderboard = () => null;

  // Render game controls
  const renderGameControls = () => (
    <Flex 
      position="absolute"
      top={4}
      right={4}
      direction={{ base: "column", md: "row" }} 
      justify="flex-end"
      align="center" 
      gap={2}
      bg="white"
      p={3}
      borderRadius="lg"
      boxShadow="md"
      fontFamily="'Comic Neue', sans-serif"
      width="auto"
      zIndex={10}
    >
      <HStack spacing={4}>
        <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color="blue.600">Score: {score}</Text>
      </HStack>
      
      {isGameComplete && (
        <HStack spacing={4} ml={4}>
          <Button 
            colorScheme="blue" 
            onClick={handleResetGame}
            size={{ base: "sm", md: "md" }}
            fontFamily="'Comic Neue', sans-serif"
          >
            Play Again
          </Button>
          <Button 
            colorScheme="gray" 
            onClick={handleCloseGame}
            size={{ base: "sm", md: "md" }}
            fontFamily="'Comic Neue', sans-serif"
          >
            Close Game
          </Button>
        </HStack>
      )}
    </Flex>
  );

  // Render game UI
  const renderGameUI = () => (
    <Box 
      width="100vw" 
      maxWidth="100%" 
      position="relative"
      left="50%"
      transform="translateX(-50%)"
      bg="blue.50"
    >
      <Box
        width="100%"
        maxW="1400px"
        mx="auto"
        px={containerPadding}
        py={4}
      >
        <Box
          ref={gameAreaRef}
          position="relative"
          width="100%"
          height={gameHeight}
          bg="blue.100"
          borderRadius="lg"
          overflow="hidden"
          onMouseMove={handleMouseMove}
          onClick={handleGameAreaClick}
          cursor={isWordSelected ? "pointer" : "default"}
          boxShadow="lg"
        >
          {/* Game area background pattern */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            opacity={0.1}
            backgroundImage="radial-gradient(circle at 1px 1px, gray 1px, transparent 0)"
            backgroundSize="40px 40px"
          />
          
          {/* Eggs */}
          {eggs.map((egg) => (
            <Box
              key={egg.id}
              position="absolute"
              left={`${egg.position.x}%`}
              top={`${egg.position.y}%`}
              transform="translate(-50%, -50%)"
              width={eggSize}
              height={eggSize}
              zIndex={egg.cracked ? 2 : 1}
            >
              <Egg
                onClick={() => handleEggClick(egg)}
                item={egg.word.text}
                category={egg.word.category}
                cracked={egg.cracked}
                onWordClick={(item, category, e) => handleWordClick({ text: item, category }, e as React.MouseEvent)}
              />
            </Box>
          ))}
          
          {/* Baskets */}
          <Flex
            position="absolute"
            bottom="10px"
            left="0"
            right="0"
            direction={basketStackDirection}
            justify="center"
            align="center"
            px={basketSpacing}
            gap={basketSpacing}
          >
            {baskets.map((basket) => (
              <Box 
                key={basket.id}
                width={basketWidth}
                mb={{ base: 2, md: 0 }}
                flex={{ base: "1", md: "0 1 auto" }}
                className={`basket-${basket.id}`}
              >
                <Basket
                  category={{ name: basket.name }}
                  items={basket.items.map(item => item.text)}
                  onClick={() => {}}
                />
              </Box>
            ))}
          </Flex>
          
          {/* Replace game controls with the renderGameControls function */}
          {renderGameControls()}
          
          {/* Dragged word */}
          {isWordSelected && selectedWord && (
            <Box
              position="absolute"
              left={`${ghostPosition.x}px`}
              top={`${ghostPosition.y}px`}
              transform="translate(-50%, -50%)"
              pointerEvents="none"
              zIndex={1000}
              bg="white"
              borderRadius="md"
              boxShadow="lg"
              p={2}
            >
              <RichText 
                content={selectedWord.text} 
                fontSize={{ base: "sm", md: "md" }}
                noPadding
              />
            </Box>
          )}
        </Box>
      </Box>
      {renderHighScoreDisplayModal()}
    </Box>
  );

  // Render start screen
  const renderStartScreen = () => (
    <Box 
      width="100vw" 
      maxWidth="100%" 
      position="relative"
      left="50%"
      transform="translateX(-50%)"
      bg="gray.50"
    >
      <Box
        width="100%"
        maxW="1400px"
        mx="auto"
        px={containerPadding}
        py={8}
      >
        <VStack spacing={6} align="center" width="100%">
          <Heading size={headingSize} textAlign="center">Sort Categories Egg Reveal</Heading>
          <Text fontSize={{ base: "sm", md: "md" }} textAlign="center" maxW="600px">
            Find eggs, crack them open, and sort words into the correct categories!
          </Text>
          
          <SimpleGrid 
            columns={{ base: 1, md: 2 }} 
            spacing={4} 
            width="100%" 
            maxW="600px" 
            mt={4}
          >
            <Button
              colorScheme="blue"
              size={{ base: "md", md: "lg" }}
              onClick={() => setIsConfigModalOpen(true)}
              width="100%"
            >
              Start Game
            </Button>
            
            <Button
              variant="outline"
              size={{ base: "md", md: "lg" }}
              onClick={() => setIsConfigModalOpen(true)}
              width="100%"
            >
              Load Saved Configuration
            </Button>
          </SimpleGrid>
        </VStack>
      </Box>
    </Box>
  );

  return (
    <Box width="100vw" maxWidth="100%" overflow="hidden" height="auto">
      {renderConfigModal()}
      {gameStarted ? renderGameUI() : renderStartScreen()}
    </Box>
  );
};

export default SortCategoriesEggReveal; 