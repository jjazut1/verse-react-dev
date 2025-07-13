import React from 'react';
import { ConfigSchema } from '../components/common/ConfigurationFramework';
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
  Heading,
  Badge,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Textarea,
  Collapse,
  Flex,
  useToast
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';
import SlateEditor from '../components/SlateEditor';

// Custom component for category management
const CategoryManager: React.FC<{
  formData: any;
  updateField: (fieldName: string, value: any) => void;
  errors: Record<string, string>;
  saveAttempted: boolean;
}> = ({ formData, updateField, errors, saveAttempted }) => {
  const toast = useToast();
  const [collapsedCategories, setCollapsedCategories] = React.useState<Record<string, boolean>>({});
  
  const categories = formData.categories || [];
  
  const addCategory = () => {
    const newCategory = {
      id: Date.now().toString(),
      title: '',
      items: [{ id: Date.now().toString(), content: '' }]
    };
    updateField('categories', [...categories, newCategory]);
  };
  
  const updateCategory = (categoryIndex: number, field: string, value: any) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex] = {
      ...updatedCategories[categoryIndex],
      [field]: value
    };
    updateField('categories', updatedCategories);
  };
  
  const deleteCategory = (categoryIndex: number) => {
    const updatedCategories = categories.filter((_: any, index: number) => index !== categoryIndex);
    updateField('categories', updatedCategories);
  };
  
  const addItem = (categoryIndex: number) => {
    const newItem = { id: Date.now().toString(), content: '' };
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].items.push(newItem);
    updateField('categories', updatedCategories);
  };
  
  const updateItem = (categoryIndex: number, itemIndex: number, content: string) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].items[itemIndex].content = content;
    updateField('categories', updatedCategories);
  };
  
  const deleteItem = (categoryIndex: number, itemIndex: number) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].items = updatedCategories[categoryIndex].items.filter(
      (_: any, index: number) => index !== itemIndex
    );
    updateField('categories', updatedCategories);
  };
  
  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategories((prev: Record<string, boolean>) => {
      const newState = { ...prev };
      newState[categoryId] = !prev[categoryId];
      return newState;
    });
  };
  
  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Create categories of words or phrases that students need to identify and "whack" when they appear.
        </Text>
        
        <Button
          leftIcon={<AddIcon />}
          onClick={addCategory}
          colorScheme="blue"
          size="sm"
          mb={4}
        >
          Add Category
        </Button>
      </Box>
      
      {categories.map((category: any, categoryIndex: number) => (
        <Box
          key={category.id}
          className="category-box"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          p={4}
        >
          <Box className="category-header">
            <HStack justify="space-between" mb={3}>
              <HStack>
                <Heading size="sm">Category {categoryIndex + 1}</Heading>
                <Badge colorScheme="blue" variant="subtle">
                  {category.items?.length || 0} items
                </Badge>
              </HStack>
              <HStack>
                <IconButton
                  icon={collapsedCategories[category.id] ? <ChevronDownIcon /> : <ChevronUpIcon />}
                  onClick={() => toggleCategoryCollapse(category.id)}
                  size="sm"
                  variant="ghost"
                  aria-label="Toggle category"
                />
                <IconButton
                  icon={<DeleteIcon />}
                  onClick={() => deleteCategory(categoryIndex)}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  aria-label="Delete category"
                />
              </HStack>
            </HStack>
          </Box>
          
          <Collapse in={!collapsedCategories[category.id]} animateOpacity>
            <VStack spacing={4} align="stretch">
              <FormControl isInvalid={saveAttempted && !category.title}>
                <FormLabel>Category Title</FormLabel>
                <Input
                  value={category.title}
                  onChange={(e) => updateCategory(categoryIndex, 'title', e.target.value)}
                  placeholder="Enter category title"
                  className="apple-input"
                />
              </FormControl>
              
              <Box>
                <FormLabel>Category Items</FormLabel>
                <VStack spacing={2} align="stretch">
                  {category.items?.map((item: any, itemIndex: number) => (
                    <HStack key={item.id} align="start">
                      <Text minW="20px" color="gray.600" fontSize="sm" pt={2}>
                        {itemIndex + 1}.
                      </Text>
                      <Box flex="1" border="1px" borderColor="gray.200" borderRadius="md">
                        <SlateEditor
                          value={item.content}
                          onChange={(value) => updateItem(categoryIndex, itemIndex, value)}
                          placeholder="Enter item content"
                          compact={true}
                          showToolbar={true}
                          className="apple-input"
                        />
                      </Box>
                      <IconButton
                        icon={<DeleteIcon />}
                        onClick={() => deleteItem(categoryIndex, itemIndex)}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        aria-label="Delete item"
                      />
                    </HStack>
                  ))}
                  
                  <Button
                    leftIcon={<AddIcon />}
                    onClick={() => addItem(categoryIndex)}
                    size="sm"
                    variant="outline"
                    colorScheme="blue"
                  >
                    Add Item
                  </Button>
                </VStack>
              </Box>
            </VStack>
          </Collapse>
        </Box>
      ))}
      
      {categories.length === 0 && (
        <Box textAlign="center" py={8} color="gray.500">
          <Text>No categories created yet.</Text>
          <Text fontSize="sm">Click "Add Category" to get started.</Text>
        </Box>
      )}
    </VStack>
  );
};

export const whackAMoleSchema: ConfigSchema = {
  gameType: 'whack-a-mole',
  title: 'Whack-a-Mole',
  description: 'Create a 3D word categorization game where students "whack" the correct moles that appear.',
  
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
          placeholder: 'Enter a title for this game',
          defaultValue: ''
        },
        {
          name: 'gameTime',
          label: 'Game Time (seconds)',
          type: 'number',
          required: true,
          min: 30,
          max: 300,
          defaultValue: 30,
          helpText: 'How long each game session lasts'
        },
        {
          name: 'gameSpeed',
          label: 'Game Speed',
          type: 'select',
          required: true,
          options: [
            { value: 1, label: 'Slow (10-12 moles)' },
            { value: 2, label: 'Medium (14-16 moles)' },
            { value: 3, label: 'Fast (17-19 moles)' }
          ],
          defaultValue: 2,
          helpText: 'Controls how frequently moles appear during the game'
        },
        {
          name: 'instructions',
          label: 'Game Instructions',
          type: 'textarea',
          placeholder: 'Enter custom instructions for players',
          helpText: 'Custom instructions to show on the game start screen. If left empty, default instructions will be shown.'
        }
      ]
    },
    {
      title: 'Scoring Settings',
      description: 'Configure how points are awarded and deducted',
      fields: [
        {
          name: 'pointsPerHit',
          label: 'Points Per Hit',
          type: 'number',
          required: true,
          min: 1,
          max: 100,
          defaultValue: 10,
          helpText: 'Points awarded for hitting a correct mole'
        },
        {
          name: 'penaltyPoints',
          label: 'Penalty Points',
          type: 'number',
          required: true,
          min: 0,
          max: 50,
          defaultValue: 5,
          helpText: 'Points deducted for hitting an incorrect mole'
        },
        {
          name: 'bonusPoints',
          label: 'Bonus Points',
          type: 'number',
          required: true,
          min: 0,
          max: 100,
          defaultValue: 10,
          helpText: 'Extra points for hitting multiple correct moles in a row'
        },
        {
          name: 'bonusThreshold',
          label: 'Bonus Threshold',
          type: 'number',
          required: true,
          min: 2,
          max: 10,
          defaultValue: 3,
          helpText: 'How many consecutive hits needed to trigger bonus points'
        }
      ]
    },
    {
      title: 'Categories',
      description: 'Create categories of words or phrases for students to identify',
      component: CategoryManager
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
    // Validate categories
    if (!formData.categories || formData.categories.length === 0) {
      return 'Please add at least one category with items';
    }
    
    // Check if all categories have titles and items
    for (const category of formData.categories) {
      if (!category.title.trim()) {
        return 'All categories must have a title';
      }
      if (!category.items || category.items.length === 0) {
        return 'All categories must have at least one item';
      }
      // Check if items have content
      for (const item of category.items) {
        if (!item.content.trim()) {
          return 'All category items must have content';
        }
      }
    }
    
    return undefined;
  },
  
  generateConfig: (formData) => {
    // Convert categories to the format expected by the game
    const wordCategories = formData.categories.map((category: any) => ({
      title: category.title,
      words: category.items.map((item: any) => item.content.trim()).filter(Boolean)
    }));
    
    return {
      type: 'whack-a-mole',
      title: formData.title.trim(),
      gameTime: formData.gameTime,
      pointsPerHit: formData.pointsPerHit,
      penaltyPoints: formData.penaltyPoints,
      bonusPoints: formData.bonusPoints,
      bonusThreshold: formData.bonusThreshold,
      speed: formData.gameSpeed,
      instructions: formData.instructions,
      categories: wordCategories,
      share: formData.share,
      description: `3D word categorization game with ${wordCategories.length} categories`
    };
  }
}; 