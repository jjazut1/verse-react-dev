import React, { useEffect, useState } from 'react';
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
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  Select,
  useToast,
  ButtonGroup,
  Tooltip,
  Card,
  CardBody,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MAX_ITEMS_PER_CATEGORY, MIN_ITEMS_PER_CATEGORY, MAX_CATEGORIES, MIN_CATEGORIES } from '../constants/game';

// Category Manager Component
const CategoryManager: React.FC<{
  formData: any;
  updateField: (fieldName: string, value: any) => void;
  errors: Record<string, string>;
  saveAttempted: boolean;
}> = ({ formData, updateField, errors, saveAttempted }) => {
  const toast = useToast();

  // Initialize categories SYNCHRONOUSLY before component renders (like AnagramManager)
  if (!formData.categories) {
    updateField('categories', []);
    formData.categories = []; // Also set it directly to avoid race condition
  }

  // Additional useEffect for safety
  useEffect(() => {
    if (formData && !formData.categories) {
      updateField('categories', []);
    }
  }, [formData, updateField]);

  const categories = formData?.categories || [];

  const addCategory = () => {
    if (categories.length >= MAX_CATEGORIES) {
      toast({
        title: 'Maximum categories reached',
        description: `You can only add up to ${MAX_CATEGORIES} categories.`,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newCategory = {
      id: Date.now().toString(),
      name: '',
      items: ['']
    };
    updateField('categories', [...categories, newCategory]);
  };

  const removeCategory = (index: number) => {
    if (categories.length <= MIN_CATEGORIES) {
      toast({
        title: 'Minimum categories required',
        description: `You must have at least ${MIN_CATEGORIES} categories.`,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newCategories = categories.filter((_: any, i: number) => i !== index);
    updateField('categories', newCategories);
  };

  const updateCategory = (index: number, field: string, value: string) => {
    const newCategories = [...categories];
    newCategories[index] = { ...newCategories[index], [field]: value };
    updateField('categories', newCategories);
  };

  const addItem = (categoryIndex: number) => {
    const category = categories[categoryIndex];
    if (category.items.length >= MAX_ITEMS_PER_CATEGORY) {
      toast({
        title: 'Maximum items reached',
        description: `You can only add up to ${MAX_ITEMS_PER_CATEGORY} items per category.`,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newCategories = [...categories];
    newCategories[categoryIndex] = {
      ...newCategories[categoryIndex],
      items: [...newCategories[categoryIndex].items, '']
    };
    updateField('categories', newCategories);
  };

  const removeItem = (categoryIndex: number, itemIndex: number) => {
    const category = categories[categoryIndex];
    if (category.items.length <= MIN_ITEMS_PER_CATEGORY) {
      toast({
        title: 'Minimum items required',
        description: `Each category must have at least ${MIN_ITEMS_PER_CATEGORY} items.`,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newCategories = [...categories];
    newCategories[categoryIndex] = {
      ...newCategories[categoryIndex],
      items: newCategories[categoryIndex].items.filter((_: any, i: number) => i !== itemIndex)
    };
    updateField('categories', newCategories);
  };

  const updateItem = (categoryIndex: number, itemIndex: number, value: string) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].items[itemIndex] = value;
    updateField('categories', newCategories);
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
    updateField('categories', newCategories);
  };

  const moveItem = (categoryIndex: number, itemIndex: number, direction: 'up' | 'down') => {
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    const items = newCategories[categoryIndex].items;
    [items[itemIndex], items[targetIndex]] = [items[targetIndex], items[itemIndex]];
    updateField('categories', newCategories);
  };

  const getTotalItems = () => {
    return categories.reduce((total: number, category: any) => total + category.items.length, 0);
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Category Management */}
      <FormControl>
        <FormLabel>Categories</FormLabel>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Create categories and add items that belong in each category
        </Text>
        
        <HStack justify="space-between" mb={4}>
          <HStack>
            <Badge colorScheme="blue">
              {categories.length} categories
            </Badge>
            <Badge colorScheme="green">
              {getTotalItems()} total items
            </Badge>
          </HStack>
          <Button
            leftIcon={<AddIcon />}
            size="sm"
            colorScheme="blue"
            onClick={addCategory}
            isDisabled={categories.length >= MAX_CATEGORIES}
          >
            Add Category
          </Button>
        </HStack>
      </FormControl>

      {categories.length === 0 ? (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <AlertDescription>
            No categories created yet. Click "Add Category" to get started.
          </AlertDescription>
        </Alert>
      ) : (
        <Accordion allowMultiple>
          {categories.map((category: any, categoryIndex: number) => (
            <AccordionItem key={category.id} border="1px" borderColor="gray.200" borderRadius="md" mb={2}>
              <AccordionButton>
                <Box flex="1" textAlign="left">
                  <HStack justify="space-between">
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="medium">
                        {category.name || `Category ${categoryIndex + 1}`}
                        <Badge ml={2} colorScheme="blue" variant="outline">
                          {category.items.length} items
                        </Badge>
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {category.items.filter((item: string) => item.trim()).length} completed items
                      </Text>
                    </VStack>
                    <HStack>
                      <ButtonGroup size="sm" isAttached>
                        <Tooltip label="Move Up">
                          <IconButton
                            aria-label="Move category up"
                            icon={<ChevronUpIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveCategory(categoryIndex, 'up');
                            }}
                            isDisabled={categoryIndex === 0}
                          />
                        </Tooltip>
                        <Tooltip label="Move Down">
                          <IconButton
                            aria-label="Move category down"
                            icon={<ChevronDownIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveCategory(categoryIndex, 'down');
                            }}
                            isDisabled={categoryIndex === categories.length - 1}
                          />
                        </Tooltip>
                        <Tooltip label="Delete Category">
                          <IconButton
                            aria-label="Delete category"
                            icon={<DeleteIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCategory(categoryIndex);
                            }}
                            colorScheme="red"
                            variant="outline"
                            isDisabled={categories.length <= MIN_CATEGORIES}
                          />
                        </Tooltip>
                      </ButtonGroup>
                    </HStack>
                  </HStack>
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel>Category Name</FormLabel>
                    <Input
                      value={category.name}
                      onChange={(e) => updateCategory(categoryIndex, 'name', e.target.value)}
                      placeholder="Enter category name"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Items ({category.items.length})</FormLabel>
                    <VStack spacing={2} align="stretch">
                      {category.items.map((item: string, itemIndex: number) => (
                        <HStack key={itemIndex} spacing={2}>
                          <Input
                            value={item}
                            onChange={(e) => updateItem(categoryIndex, itemIndex, e.target.value)}
                            placeholder={`Item ${itemIndex + 1}`}
                            flex={1}
                          />
                          <ButtonGroup size="sm" isAttached>
                            <Tooltip label="Move Up">
                              <IconButton
                                aria-label="Move item up"
                                icon={<ChevronUpIcon />}
                                onClick={() => moveItem(categoryIndex, itemIndex, 'up')}
                                isDisabled={itemIndex === 0}
                              />
                            </Tooltip>
                            <Tooltip label="Move Down">
                              <IconButton
                                aria-label="Move item down"
                                icon={<ChevronDownIcon />}
                                onClick={() => moveItem(categoryIndex, itemIndex, 'down')}
                                isDisabled={itemIndex === category.items.length - 1}
                              />
                            </Tooltip>
                            <Tooltip label="Delete Item">
                              <IconButton
                                aria-label={`Delete item #${itemIndex + 1}`}
                                icon={<DeleteIcon />}
                                onClick={() => removeItem(categoryIndex, itemIndex)}
                                colorScheme="red"
                                variant="outline"
                                isDisabled={category.items.length <= MIN_ITEMS_PER_CATEGORY}
                              />
                            </Tooltip>
                          </ButtonGroup>
                        </HStack>
                      ))}
                    </VStack>
                    <Button
                      leftIcon={<AddIcon />}
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      onClick={() => addItem(categoryIndex)}
                      mt={2}
                      isDisabled={category.items.length >= MAX_ITEMS_PER_CATEGORY}
                    >
                      Add Item
                    </Button>
                  </FormControl>
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </VStack>
  );
};

// Schema Definition
export const sortCategoriesEggSchema: ConfigSchema = {
  gameType: 'sort-categories-egg',
  title: 'Sort Categories Egg Reveal',
  description: 'Create a drag-and-drop categorization game where students sort items into categories and reveal eggs',
  
  sections: [
    {
      title: 'Basic Settings',
      description: 'Configure the basic game information',
      fields: [
        {
          name: 'title',
          label: 'Game Title',
          type: 'text',
          required: true,
          placeholder: 'Enter game title',
          defaultValue: 'Sort Categories Egg Reveal Game'
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Enter game description (optional)',
          helpText: 'Brief description of what students will learn'
        },
        {
          name: 'instructions',
          label: 'Instructions',
          type: 'textarea',
          placeholder: 'Enter instructions for students (optional)',
          helpText: 'Instructions that will be shown to students before they start'
        }
      ]
    },
    {
      title: 'Categories and Items',
      description: 'Set up the categories and items for sorting',
      component: CategoryManager
    },
    {
      title: 'Game Settings',
      description: 'Configure game-specific settings',
      fields: [
        {
          name: 'containerType',
          label: 'Container Type',
          type: 'select',
          required: true,
          defaultValue: 'eggs',
          options: [
            { value: 'eggs', label: 'Eggs 🥚' },
            { value: 'balloons', label: 'Balloons 🎈' },
            { value: 'presents', label: 'Present Boxes 🎁' },
            { value: 'amazon', label: 'Amazon Boxes 📦' }
          ],
          width: '200px',
          helpText: 'Choose the container graphic theme for your items'
        },
        {
          name: 'eggQty',
          label: 'Number of Containers',
          type: 'select',
          required: true,
          defaultValue: 12,
          options: [
            { value: 4, label: '4 containers' },
            { value: 6, label: '6 containers' },
            { value: 8, label: '8 containers' },
            { value: 10, label: '10 containers' },
            { value: 12, label: '12 containers' },
            { value: 14, label: '14 containers' },
            { value: 16, label: '16 containers' },
            { value: 18, label: '18 containers' },
            { value: 20, label: '20 containers' }
          ],
          width: '150px',
          helpText: 'How many containers will be revealed when categories are completed'
        },
        {
          name: 'textToSpeechMode',
          label: 'Text-to-Speech Mode',
          type: 'select',
          required: true,
          defaultValue: 'amazon-polly-phonics',
          options: [
            { value: 'disabled', label: 'Disabled - No sound' },
            { value: 'amazon-polly-phonics', label: 'Amazon Polly with Phonics (Recommended)' },
            { value: 'amazon-polly-regular', label: 'Amazon Polly with Regular Pronunciation' },
            { value: 'web-speech-phonics', label: 'Web Speech API with Phonics' },
            { value: 'web-speech-regular', label: 'Web Speech API with Regular Pronunciation' }
          ],
          width: '400px',
          helpText: 'Amazon Polly provides professional-quality speech with accurate phonemes. Phonics mode makes "ck" sound like /k/, "th" like /θ/, etc.'
        }
      ]
    },
    {
      title: 'Sharing Settings',
      description: 'Control who can access this game',
      fields: [
        {
          name: 'share',
          label: 'Make Public',
          type: 'switch',
          defaultValue: false,
          helpText: 'Allow other teachers to use this game'
        }
      ]
    }
  ],

  customValidation: (formData) => {
    // Basic validation (like working schemas)
    if (!formData.title || !formData.title.trim()) {
      return 'Please enter a title for your game';
    }
    
    // Validate categories (now that they're properly initialized)
    if (!formData.categories || formData.categories.length === 0) {
      return 'Please add at least one category';
    }
    
    const categories = formData.categories || [];
    
    if (categories.length < MIN_CATEGORIES) {
      return `You need at least ${MIN_CATEGORIES} categories`;
    }
    
    if (categories.length > MAX_CATEGORIES) {
      return `You can have at most ${MAX_CATEGORIES} categories`;
    }
    
    // Validate each category
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      
      if (!category.name || category.name.trim() === '') {
        return `Category ${i + 1} needs a name`;
      }
      
      if (!category.items || category.items.length < MIN_ITEMS_PER_CATEGORY) {
        return `Category "${category.name}" needs at least ${MIN_ITEMS_PER_CATEGORY} items`;
      }
      
      if (category.items.length > MAX_ITEMS_PER_CATEGORY) {
        return `Category "${category.name}" can have at most ${MAX_ITEMS_PER_CATEGORY} items`;
      }
      
      // Check for empty items
      const emptyItems = category.items.filter((item: string) => !item || item.trim() === '');
      if (emptyItems.length > 0) {
        return `Category "${category.name}" has empty items that need to be filled`;
      }
    }
    
    return undefined;
  },

  generateConfig: (formData, currentUser) => {
    // Handle case where formData is undefined or null
    if (!formData) {
      formData = {};
    }

    // Initialize formData fields if they don't exist
    const safeFormData = {
      title: 'Sort Categories Egg Reveal Game',
      description: '',
      instructions: '',
      categories: [],
      eggQty: 12,
      share: false,
      textToSpeechMode: 'amazon-polly-phonics', // Default to recommended mode
      containerType: 'eggs', // Default to eggs
      ...formData
    };

    // Parse textToSpeechMode into individual flags for backward compatibility
    const textToSpeechMode = safeFormData.textToSpeechMode || 'amazon-polly-phonics';
    const enableTextToSpeech = textToSpeechMode !== 'disabled';
    const usePhonicsMode = textToSpeechMode.includes('phonics');
    const useAmazonPolly = textToSpeechMode.includes('amazon-polly');
    
    // Ensure boolean fields have proper default values
    const share = safeFormData.share !== undefined ? Boolean(safeFormData.share) : false;

    // Process categories
    const categories = (safeFormData.categories || []).map((category: any) => ({
      name: category.name,
      items: category.items.filter((item: string) => item && item.trim() !== '')
    }));

    // Create final config object
    const config = {
      title: safeFormData.title || 'Sort Categories Egg Reveal Game',
      type: 'sort-categories-egg' as const,
      description: safeFormData.description || `Categorization game with ${categories.length} categories`,
      instructions: safeFormData.instructions || '',
      categories: categories,
      eggQty: Number(safeFormData.eggQty) || 12,
      share: share,
      textToSpeechMode: textToSpeechMode,
      containerType: safeFormData.containerType || 'eggs',
      // Maintain backward compatibility with individual flags
      enableTextToSpeech: enableTextToSpeech,
      usePhonicsMode: usePhonicsMode,
      useAmazonPolly: useAmazonPolly,
      email: currentUser?.email,
      userId: currentUser?.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    return config;
  }
}; 