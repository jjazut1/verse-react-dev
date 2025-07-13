import React, { useEffect, useRef } from 'react';
import { ConfigSchema } from '../components/common/ConfigurationFramework';
import { serverTimestamp } from 'firebase/firestore';
import {
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  Box,
  IconButton,
  Alert,
  AlertIcon,
  AlertDescription,
  Badge,
  Flex,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Textarea,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';
import SlateEditor from '../components/SlateEditor';

// Generate unique IDs
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

// Color themes for the spinner wheel
const colorThemes = {
  primaryColors: ['#FF6B6B', '#FFD93D', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'],
  pastelColors: ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFDFBA', '#E0BBE4', '#FFC9DD', '#C9FFC9'],
  brightColors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'],
  earthTones: ['#8B4513', '#A0522D', '#CD853F', '#DEB887', '#F4A460', '#D2691E', '#BC8F8F', '#F5DEB3'],
  ocean: ['#006994', '#0081A7', '#00AFB9', '#FDFCDC', '#FED9B7', '#F07167', '#E29578', '#83C5BE'],
  sunset: ['#F72585', '#B5179E', '#7209B7', '#480CA8', '#3A0CA3', '#3F37C9', '#4361EE', '#4895EF'],
  forest: ['#2D5016', '#3F6C23', '#4F7C2F', '#5F8A3A', '#6F9946', '#7FA752', '#8FB65E', '#9FC46A'],
  rainbow: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3', '#FF1493']
};

// Define a type for WheelItem
interface WheelItem {
  id: string;
  text: string;
  richText?: string; // For SlateEditor content
  color: string;
}

// Define a type for the final config
interface SpinnerWheelConfig {
  title: string;
  type: 'spinner-wheel';
  description: string;
  items: WheelItem[];
  removeOnSelect: boolean;
  wheelTheme: string;
  customColors: string[];
  soundEnabled: boolean;
  maxSpins: number;
  instructions: string;
  share: boolean;
  email: string | undefined;
  userId: string | undefined;
  createdAt: any;
  updatedAt: any;
}

// Module-level variable to store current items (will be updated by the component)
let currentWheelItems: WheelItem[] = [];

// Simple WheelItemsManager component following Sentence Sense pattern
const WheelItemsManager: React.FC<{
  formData: any;
  updateField: (fieldName: string, value: any) => void;
  errors: Record<string, string>;
  saveAttempted: boolean;
}> = ({ formData, updateField, errors, saveAttempted }) => {
  
  // Initialize items field SYNCHRONOUSLY before component renders (following Anagram pattern)
  if (!formData.items || formData.items.length === 0) {
    console.log(`🚀 [WheelItemsManager] SYNC INIT - Creating default items`);
    const defaultItems = [
      { id: generateId(), text: 'Item 1', color: '#FF6B6B' },
      { id: generateId(), text: 'Item 2', color: '#4ECDC4' },
      { id: generateId(), text: 'Item 3', color: '#45B7D1' },
      { id: generateId(), text: 'Item 4', color: '#96CEB4' }
    ];
    formData.items = defaultItems; // Direct assignment following Anagram pattern
    currentWheelItems = defaultItems; // Initialize module variable
    console.log(`🚀 [WheelItemsManager] SYNC INIT - Set formData.items:`, formData.items);
  } else {
    console.log(`🚀 [WheelItemsManager] SYNC INIT - Items already exist:`, formData.items);
    console.log(`🚀 [WheelItemsManager] SYNC INIT - First item structure:`, formData.items[0]);
    console.log(`🚀 [WheelItemsManager] SYNC INIT - First item has content field:`, !!formData.items[0]?.content);
    // CRITICAL FIX: Only initialize currentWheelItems if it's empty to prevent overwriting fresh updates
    if (currentWheelItems.length === 0) {
      console.log(`🚀 [WheelItemsManager] SYNC INIT - Initializing currentWheelItems from formData`);
      currentWheelItems = formData.items;
      console.log(`🚀 [WheelItemsManager] SYNC INIT - currentWheelItems set to:`, currentWheelItems);
    } else {
      console.log(`🚀 [WheelItemsManager] SYNC INIT - Skipping currentWheelItems update (already has ${currentWheelItems.length} items)`);
    }
  }

  // Additional useEffect for safety (backup initialization)
  useEffect(() => {
    if (!formData.items || formData.items.length === 0) {
      console.log(`🔄 [WheelItemsManager] USEEFFECT INIT - Creating default items`);
      const defaultItems = [
        { id: generateId(), text: 'Item 1', color: '#FF6B6B' },
        { id: generateId(), text: 'Item 2', color: '#4ECDC4' },
        { id: generateId(), text: 'Item 3', color: '#45B7D1' },
        { id: generateId(), text: 'Item 4', color: '#96CEB4' }
      ];
      updateField('items', defaultItems);
      formData.items = defaultItems; // Also set it directly to avoid race condition (following Anagram pattern)
      currentWheelItems = defaultItems; // Initialize module-level variable
      console.log(`🔄 [WheelItemsManager] USEEFFECT INIT - Set formData.items:`, formData.items);
    } else {
      console.log(`🔄 [WheelItemsManager] USEEFFECT INIT - Items already exist:`, formData.items);
      // CRITICAL FIX: Only update currentWheelItems if it's empty to prevent overwriting manual updates
      if (currentWheelItems.length === 0) {
        console.log(`🔄 [WheelItemsManager] USEEFFECT INIT - Initializing currentWheelItems from formData`);
        currentWheelItems = formData.items;
      } else {
        console.log(`🔄 [WheelItemsManager] USEEFFECT INIT - Skipping currentWheelItems update (already has ${currentWheelItems.length} items)`);
      }
    }
  }, [formData.items, updateField]); // Only depend on formData.items, not entire formData

  const items = formData?.items || [];
  
  const addItem = () => {
    const newItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: `Item ${items.length + 1}`,
      color: '#FF6B6B' // Default color
    };
    const updatedItems = [...items, newItem];
    updateField('items', updatedItems);
    currentWheelItems = updatedItems; // Update module-level variable
    formData.items = updatedItems; // Direct assignment for immediate UI sync
  };

  const removeItem = (id: string) => {
    const updatedItems = items.filter((item: WheelItem) => item.id !== id);
    updateField('items', updatedItems);
    currentWheelItems = updatedItems; // Update module-level variable
    formData.items = updatedItems; // Direct assignment for immediate UI sync
  };

  const updateItem = (id: string, text: string) => {
    console.log(`🔧 [updateItem] Updated item id=${id} with text="${text}"`);
    console.log(`🔧 [updateItem] Text contains HTML tags:`, text.includes('<') && text.includes('>'));
    console.log(`🔧 [updateItem] Raw text content:`, text);
    
    // Extract plain text for fallback while preserving rich text content
    let plainText = '';
    if (text.includes('<') && text.includes('>')) {
      // Strip HTML tags to get plain text for fallback
      plainText = text
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
        .replace(/&amp;/g, '&')  // Replace HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
      console.log(`🔧 [updateItem] Extracted plain text from HTML:`, plainText);
    } else {
      plainText = text.trim();
      console.log(`🔧 [updateItem] Using text as-is (no HTML):`, plainText);
    }
    
    // CRITICAL FIX: Update BOTH currentWheelItems AND formData.items simultaneously
    // Update currentWheelItems first
    const updatedCurrentItems = currentWheelItems.map((item: any) => {
      if (item.id === id) {
        return { 
          ...item, 
          text: plainText || text, // Plain text fallback
          content: text // Rich text content for SlateEditor
        };
      }
      return item;
    });
    currentWheelItems = updatedCurrentItems;
    console.log(`📋 [updateItem] Updated currentWheelItems:`, currentWheelItems);
    
    // Update formData.items with the same data
    const updatedFormDataItems = formData.items.map((item: any) => {
      if (item.id === id) {
        return { 
          ...item, 
          text: plainText || text, // Plain text fallback
          content: text // Rich text content for SlateEditor
        };
      }
      return item;
    });
    formData.items = updatedFormDataItems;
    console.log(`🔄 [updateItem] Directly updated formData.items:`, formData.items);
    
    // CRITICAL FIX: Also update React state with the same data
    updateField('items', updatedFormDataItems);
    
    // ADDITIONAL FIX: Force synchronization by ensuring both arrays have the same content
    console.log(`🔄 [updateItem] Verification - currentWheelItems matches formData.items:`, 
      JSON.stringify(currentWheelItems) === JSON.stringify(formData.items));
  };

  const moveItemUp = (index: number) => {
    if (index > 0) {
      const newItems = [...items];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      updateField('items', newItems);
      currentWheelItems = newItems; // Update module-level variable
      formData.items = newItems; // Direct assignment for immediate UI sync
    }
  };

  const moveItemDown = (index: number) => {
    if (index < items.length - 1) {
      const newItems = [...items];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      updateField('items', newItems);
      currentWheelItems = newItems; // Update module-level variable
      formData.items = newItems; // Direct assignment for immediate UI sync
    }
  };

  // Get item color based on current theme
  const getItemColor = (index: number) => {
    const wheelTheme = formData?.wheelTheme || 'primaryColors';
    const customColors = formData?.customColors || colorThemes.primaryColors;
    const themeColors = wheelTheme === 'custom' ? customColors : colorThemes[wheelTheme as keyof typeof colorThemes];
    return themeColors[index % themeColors.length];
  };

  return (
    <VStack spacing={6} align="stretch">
      <FormControl>
        <FormLabel mb={3}>Wheel Items</FormLabel>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Add items that will appear on the spinner wheel
        </Text>
      </FormControl>
      
      <VStack spacing={3} align="stretch">
        {items.map((item: any, index: number) => (
          <Box key={item.id} w="full">
            <Flex align="center" direction="row">
              <Box
                w={4}
                h={4}
                borderRadius="full"
                bg={getItemColor(index)}
                mr={3}
                flexShrink={0}
              />
              <Text 
                mr={2} 
                fontWeight="bold" 
                width="25px" 
                color="gray.500"
                flexShrink={0}
              >
                {index + 1}.
              </Text>
              <Box flex="1" mr={2}>
                <Box border="1px" borderColor="gray.200" borderRadius="md">
                  <SlateEditor
                    value={item.content || item.text}
                    onChange={(value) => updateItem(item.id, value)}
                    placeholder={`Item ${index + 1}`}
                    compact={true}
                    showToolbar={true}
                    className="apple-input"
                  />
                </Box>
              </Box>
              <HStack spacing={1}>
                <IconButton
                  icon={<ChevronUpIcon boxSize={3} />}
                  aria-label="Move item up"
                  size="sm"
                  variant="ghost"
                  isDisabled={index === 0}
                  onClick={() => moveItemUp(index)}
                />
                <IconButton
                  icon={<ChevronDownIcon boxSize={3} />}
                  aria-label="Move item down"
                  size="sm"
                  variant="ghost"
                  isDisabled={index === items.length - 1}
                  onClick={() => moveItemDown(index)}
                />
                <IconButton
                  aria-label="Remove item"
                  icon={<DeleteIcon />}
                  onClick={() => removeItem(item.id)}
                  isDisabled={items.length <= 2}
                  colorScheme="red"
                  variant="ghost"
                  size="sm"
                />
              </HStack>
            </Flex>
          </Box>
        ))}
        
        <Button
          leftIcon={<AddIcon />}
          onClick={addItem}
          variant="outline"
          colorScheme="blue"
          size="sm"
          alignSelf="flex-start"
        >
          Add Item
        </Button>
        
        {items.length < 2 && (
          <Alert status="info" size="sm">
            <AlertIcon />
            <AlertDescription>Add at least 2 items to create a functional spinner wheel.</AlertDescription>
          </Alert>
        )}
        
        <Flex justify="space-between" fontSize="sm" color="gray.500">
          <Text>
            {items.length === 0 ? 'No items added yet' : 
             items.length === 1 ? '1 item added' : 
             `${items.length} items added`}
          </Text>
          <Text>
            {items.length >= 20 ? 'Maximum reached' : `${20 - items.length} remaining`}
          </Text>
        </Flex>
      </VStack>
      
      {/* Validation Errors */}
      {errors?.items && (
        <Alert status="error">
          <AlertIcon />
          <AlertDescription>{errors.items}</AlertDescription>
        </Alert>
      )}
    </VStack>
  );
};

// Simple AppearanceManager component
const AppearanceManager: React.FC<{
  formData: any;
  updateField: (fieldName: string, value: any) => void;
  errors: Record<string, string>;
  saveAttempted: boolean;
}> = ({ formData, updateField, errors, saveAttempted }) => {
  
  // Initialize appearance fields SYNCHRONOUSLY before component renders
  if (!formData.wheelTheme) {
    updateField('wheelTheme', 'primaryColors');
    formData.wheelTheme = 'primaryColors';
  }
  if (!formData.customColors) {
    updateField('customColors', colorThemes.primaryColors);
    formData.customColors = colorThemes.primaryColors;
  }

  // Additional useEffect for safety (backup initialization)
  useEffect(() => {
    if (!formData.wheelTheme) {
      updateField('wheelTheme', 'primaryColors');
    }
    if (!formData.customColors) {
      updateField('customColors', colorThemes.primaryColors);
    }
  }, [formData.wheelTheme, formData.customColors, updateField]);

  const wheelTheme = formData?.wheelTheme || 'primaryColors';
  const customColors = formData?.customColors || colorThemes.primaryColors;

  const handleThemeChange = (theme: string) => {
    updateField('wheelTheme', theme);
  };

  const handleCustomColorChange = (index: number, color: string) => {
    const newColors = [...customColors];
    newColors[index] = color;
    updateField('customColors', newColors);
  };

  const addCustomColor = () => {
    if (customColors.length < 8) {
      updateField('customColors', [...customColors, '#FF6B6B']);
    }
  };

  const removeCustomColor = (index: number) => {
    if (customColors.length > 2) {
      updateField('customColors', customColors.filter((_: any, i: number) => i !== index));
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      <FormControl>
        <FormLabel mb={3}>Color Theme</FormLabel>
        <Select
          value={wheelTheme}
          onChange={(e) => handleThemeChange(e.target.value)}
        >
          <option value="primaryColors">Primary Colors</option>
          <option value="pastelColors">Pastel Colors</option>
          <option value="brightColors">Bright Colors</option>
          <option value="earthTones">Earth Tones</option>
          <option value="ocean">Ocean</option>
          <option value="sunset">Sunset</option>
          <option value="forest">Forest</option>
          <option value="rainbow">Rainbow</option>
          <option value="custom">Custom Colors</option>
        </Select>
      </FormControl>

      {wheelTheme === 'custom' && (
        <VStack spacing={4} align="stretch">
          <Text fontSize="sm" fontWeight="medium">Custom Colors</Text>
          <VStack spacing={2} align="stretch">
            {customColors.map((color: string, index: number) => (
              <HStack key={index} align="center">
                <Text minW="20px" fontSize="sm">{index + 1}.</Text>
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => handleCustomColorChange(index, e.target.value)}
                  width="60px"
                  height="35px"
                  padding="2px"
                  border="1px solid"
                  borderColor="gray.300"
                />
                <Input
                  value={color}
                  onChange={(e) => handleCustomColorChange(index, e.target.value)}
                  placeholder="#FF6B6B"
                  flex="1"
                />
                <IconButton
                  icon={<DeleteIcon />}
                  onClick={() => removeCustomColor(index)}
                  isDisabled={customColors.length <= 2}
                  colorScheme="red"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove color"
                />
              </HStack>
            ))}
            
            <Button
              leftIcon={<AddIcon />}
              onClick={addCustomColor}
              variant="outline"
              colorScheme="blue"
              size="sm"
              alignSelf="flex-start"
              isDisabled={customColors.length >= 8}
            >
              Add Color
            </Button>
          </VStack>
        </VStack>
      )}

      {/* Color Preview */}
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={2}>Preview:</Text>
        <HStack spacing={2} flexWrap="wrap">
          {(wheelTheme === 'custom' ? customColors : colorThemes[wheelTheme as keyof typeof colorThemes]).map((color: string, index: number) => (
            <Box
              key={index}
              w={6}
              h={6}
              bg={color}
              borderRadius="md"
              border="1px solid"
              borderColor="gray.300"
            />
          ))}
        </HStack>
      </Box>
    </VStack>
  );
};

const generateConfig = (formData: any, currentUser?: any): SpinnerWheelConfig => {
  console.log('🔍 [generateConfig] ENTRY - Raw formData received:', formData);
  console.log('🔍 [generateConfig] Raw formData.items:', formData.items);
  console.log('🔍 [generateConfig] currentWheelItems:', currentWheelItems);
  
  if (!formData) {
    formData = {};
  }
  
  // Initialize with safe defaults
  const safeFormData = {
    title: 'My Spinner Wheel',
    instructions: 'Click the SPIN button to randomly select an item from the wheel!',
    items: [],
    wheelTheme: 'primaryColors',
    customColors: colorThemes.primaryColors,
    removeOnSelect: false,
    soundEnabled: true,
    maxSpins: 0,
    share: false,
    ...formData
  };
  
  // CRITICAL FIX: Always ensure currentWheelItems is synchronized with formData.items
  // If formData.items has more recent data, use it
  if (formData.items && formData.items.length > 0) {
    console.log('🔍 [generateConfig] Synchronizing currentWheelItems with formData.items');
    currentWheelItems = formData.items;
  }
  
  // Use current items from module variable if available, otherwise fallback to formData
  const itemsToUse = currentWheelItems.length > 0 ? currentWheelItems : formData.items || [];
  
  console.log('🔍 [generateConfig] Using items from:', currentWheelItems.length > 0 ? 'currentWheelItems (most current)' : 'formData.items (fallback)');
  console.log('🔍 [generateConfig] Final itemsToUse:', itemsToUse);
  
  // Process items with colors - use currentWheelItems if available, otherwise fallback to formData.items
  const themeColors = safeFormData.wheelTheme === 'custom' ? safeFormData.customColors : colorThemes[safeFormData.wheelTheme as keyof typeof colorThemes];
  
  const processedItems = itemsToUse.map((item: WheelItem, index: number) => {
    // For the spinner wheel game, we need to preserve HTML content for rich text rendering
    // Check content field first (where rich text is stored), then fall back to text field
    const textContent = (item as any).content || item.text || '';
    let plainText = '';
    
    // Extract plain text for fallback, but preserve HTML for content field
    if (textContent.includes('<') && textContent.includes('>')) {
      // Strip HTML tags to get plain text for fallback
      plainText = textContent
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
        .replace(/&amp;/g, '&')  // Replace HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
    } else {
      plainText = textContent.trim();
    }

    // Fallback to generic item name if empty
    const finalText = plainText || `Item ${index + 1}`;
    
    console.log(`🔍 [generateConfig] Processing item ${index}:`, {
      originalText: item.text,
      extractedPlainText: plainText,
      finalText: finalText,
      hasHtmlContent: textContent.includes('<') && textContent.includes('>'),
      preservedHtmlContent: textContent.includes('<') ? textContent : null
    });

    // Build the item object, conditionally adding content field only if it has HTML
    const processedItem: any = {
      id: item.id,
      text: finalText, // Plain text fallback
      color: themeColors[index % themeColors.length]
    };
    
    // Only add content field if there's HTML content (avoid undefined values that Firebase rejects)
    if (textContent.includes('<') && textContent.includes('>')) {
      processedItem.content = textContent;
    }
    
    return processedItem;
  });
  
  // Create final config object
  const config: SpinnerWheelConfig = {
    title: safeFormData.title,
    type: 'spinner-wheel' as const,
    description: `Interactive spinner wheel with ${processedItems.length} ${processedItems.length === 1 ? 'item' : 'items'}`,
    items: processedItems,
    removeOnSelect: Boolean(safeFormData.removeOnSelect),
    wheelTheme: safeFormData.wheelTheme,
    customColors: safeFormData.customColors,
    soundEnabled: Boolean(safeFormData.soundEnabled),
    maxSpins: Number(safeFormData.maxSpins) || 0,
    instructions: safeFormData.instructions,
    share: Boolean(safeFormData.share),
    email: currentUser?.email,
    userId: currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  console.log('🔍 [generateConfig] Final config items:', config.items);
  console.log('🔍 [generateConfig] Sample item for rich text check:', config.items[0]);
  return config;
};

export const spinnerWheelSchema: ConfigSchema = {
  gameType: 'spinner-wheel',
  title: 'Spinner Wheel',
  description: 'Create an interactive spinner wheel for random selection, vocabulary practice, or decision making.',
  
  sections: [
    {
      title: 'Game Settings',
      description: 'Configure basic game parameters',
      fields: [
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          placeholder: 'Enter wheel title',
          defaultValue: 'My Spinner Wheel'
        },
        {
          name: 'instructions',
          label: 'Instructions',
          type: 'textarea',
          placeholder: 'Enter instructions for students',
          defaultValue: 'Click the SPIN button to randomly select an item from the wheel!'
        }
      ]
    },
    {
      title: 'Wheel Items',
      description: 'Add items that will appear on the spinner wheel',
      fields: [],
      component: WheelItemsManager
    },
    {
      title: 'Appearance',
      description: 'Customize the look of your spinner wheel',
      fields: [],
      component: AppearanceManager
    },
    {
      title: 'Advanced Settings',
      description: 'Additional game configuration options',
      fields: [
        {
          name: 'removeOnSelect',
          label: 'Remove selected items',
          type: 'switch',
          defaultValue: false,
          helpText: 'Remove items from the wheel after they are selected'
        },
        {
          name: 'soundEnabled',
          label: 'Enable sound effects',
          type: 'switch',
          defaultValue: true,
          helpText: 'Play sound effects during wheel spinning'
        },
        {
          name: 'maxSpins',
          label: 'Maximum spins (0 = unlimited)',
          type: 'number',
          min: 0,
          max: 100,
          defaultValue: 0,
          helpText: 'Limit the number of spins allowed'
        }
      ]
    },
    {
      title: 'Sharing',
      description: 'Make your game available to other teachers',
      fields: [
        {
          name: 'share',
          label: 'Share this game publicly',
          type: 'switch',
          defaultValue: false,
          helpText: 'Public games can be used by other teachers as templates'
        }
      ]
    }
  ],
  
  customValidation: (formData) => {
    if (!formData) {
      return 'Configuration data is not available';
    }
    
    if (!formData.title || !formData.title.trim()) {
      return 'Please enter a title for your wheel';
    }
    
    if (!formData.items || formData.items.length === 0) {
      return 'Please add at least one item to the wheel';
    }
    
    if (formData.items.length < 2) {
      return 'Please add at least 2 items to create a functional spinner wheel';
    }
    
    // Check if all items have text
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.text || !item.text.trim()) {
        return `Item ${i + 1}: Please enter text for this item`;
      }
    }
    
    return undefined;
  },
  
  generateConfig: (formData, currentUser) => {
    return generateConfig(formData, currentUser);
  }
}; 