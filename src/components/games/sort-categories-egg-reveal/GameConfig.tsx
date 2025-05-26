import { useState, useEffect } from 'react';
import {
  Button,
  VStack,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  Switch,
  Select,
  useToast,
  Box,
  Heading,
  Text,
  Divider,
  IconButton,
  HStack,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import { serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { MAX_ITEMS_PER_CATEGORY, MIN_ITEMS_PER_CATEGORY, MAX_CATEGORIES, MIN_CATEGORIES } from '../../../constants/game';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface GameConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSelect: (config: any) => void;
}

interface CategoryItem {
  content: string; // Rich text content (HTML)
  text: string;    // Plain text for game compatibility
}

interface Category {
  name: string;
  items: CategoryItem[];  // Changed from string to CategoryItem array
}

interface SavedCategory {
  name: string;
  items: CategoryItem[];  // Support both rich text and legacy formats
}

interface GameConfig {
  id?: string;
  type: string;
  title: string;
  eggQty: number;
  categories: SavedCategory[];
  richCategories?: SavedCategory[];  // New rich text format
  share: boolean;
  email?: string;
  createdAt?: Date;
}

const GameConfig: React.FC<GameConfigProps> = ({ isOpen, onClose, onConfigSelect }) => {
  const [title, setTitle] = useState('');
  const [eggQty, setEggQty] = useState(6);
  const [categories, setCategories] = useState<Category[]>([
    { name: '', items: [] }
  ]);
  const [shareConfig, setShareConfig] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadSavedConfigs();
  }, []);

  const loadSavedConfigs = async () => {
    try {
      setIsLoading(true);
      // Load both admin configs and user configs
      const [adminConfigsSnapshot, userConfigsSnapshot] = await Promise.all([
        getDocs(query(
          collection(db, 'gameConfigs'),
          where('type', '==', 'sort-categories-egg'),
          where('share', '==', true)
        )),
        getDocs(query(
          collection(db, 'userGameConfigs'),
          where('type', '==', 'sort-categories-egg'),
          where('share', '==', true)
        ))
      ]);

      const configs: any[] = [];
      
      // Add admin configs
      adminConfigsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Ensure items are arrays
        const categories = data.categories.map((cat: any) => ({
          ...cat,
          items: Array.isArray(cat.items) ? cat.items : cat.items.split(',').map((item: string) => item.trim())
        }));
        configs.push({ id: doc.id, ...data, categories, isAdminConfig: true });
      });
      
      // Add user configs
      userConfigsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Ensure items are arrays
        const categories = data.categories.map((cat: any) => ({
          ...cat,
          items: Array.isArray(cat.items) ? cat.items : cat.items.split(',').map((item: string) => item.trim())
        }));
        configs.push({ id: doc.id, ...data, categories, isAdminConfig: false });
      });

      setSavedConfigs(configs);
    } catch (error) {
      console.error('Error loading configurations:', error);
      
      // Provide fallback data
      const fallbackConfigs = [
        {
          id: 'fallback1',
          type: 'sort-categories-egg',
          title: 'Animals',
          eggQty: 12,
          categories: [
            { name: 'Mammals', items: ['dog', 'cat', 'elephant', 'giraffe'] },
            { name: 'Birds', items: ['eagle', 'parrot', 'penguin', 'owl'] },
            { name: 'Reptiles', items: ['snake', 'lizard', 'turtle', 'crocodile'] }
          ],
          share: true,
          createdAt: new Date(),
          isAdminConfig: true
        }
      ];
      setSavedConfigs(fallbackConfigs);
      
      toast({
        title: 'Using Sample Configurations',
        description: 'Could not load configurations from server. Using sample configurations instead.',
        status: 'info',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = () => {
    setCategories([...categories, { name: '', items: [] }]);
  };

  const handleCategoryChange = (categoryIndex: number, field: 'name', value: string) => {
    const newCategories = [...categories];
    if (field === 'name') {
      newCategories[categoryIndex].name = value;
    }
    setCategories(newCategories);
  };

  // Add individual item management functions
  const handleAddItem = (categoryIndex: number) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].items.push({ content: '', text: '' });
    setCategories(newCategories);
  };

  const handleRemoveItem = (categoryIndex: number, itemIndex: number) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].items.splice(itemIndex, 1);
    setCategories(newCategories);
  };

  const handleItemContentChange = (categoryIndex: number, itemIndex: number, content: string) => {
    const newCategories = [...categories];
    
    // Extract plain text from rich content for game compatibility
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // Update both rich content and plain text
    newCategories[categoryIndex].items[itemIndex] = {
      content: content,
      text: plainText.trim()
    };
    
    setCategories(newCategories);
  };

  const handleSaveConfig = async () => {
    // Add detailed auth logging
    console.log('Auth state:', {
      currentUser: auth.currentUser,
      isAuthenticated: !!auth.currentUser,
      uid: auth.currentUser?.uid,
      email: auth.currentUser?.email
    });

    if (!auth.currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to save configurations.',
        status: 'error',
        duration: 5000,
      });
      return;
    }

    // Validate input
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a configuration title.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (categories.some(cat => !cat.name.trim() || !cat.items.length)) {
      toast({
        title: 'Error',
        description: 'Please fill in all category names and items.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      // Transform categories to ensure proper format for saving
      const transformedCategories: SavedCategory[] = categories.map(cat => ({
        name: cat.name.trim(),
        items: cat.items.map(item => ({
          content: item.content,
          text: item.text
        }))
      }));

      // Also create legacy format for backward compatibility
      const legacyCategories = categories.map(cat => ({
        name: cat.name.trim(),
        items: cat.items.map(item => item.text).filter(text => text.length > 0)
      }));

      // Check if each category has at least MIN_ITEMS_PER_CATEGORY items
      const categoriesWithTooFewItems = transformedCategories.filter(cat => cat.items.length < MIN_ITEMS_PER_CATEGORY);
      if (categoriesWithTooFewItems.length > 0) {
        toast({
          title: "Not Enough Items",
          description: `Each category must have at least ${MIN_ITEMS_PER_CATEGORY} items.`,
          status: "warning",
          duration: 5000,
        });
        return;
      }
      
      // Check if any category has more than MAX_ITEMS_PER_CATEGORY items
      const categoriesWithTooManyItems = transformedCategories.filter(cat => cat.items.length > MAX_ITEMS_PER_CATEGORY);
      if (categoriesWithTooManyItems.length > 0) {
        toast({
          title: "Too Many Items",
          description: `A category cannot have more than ${MAX_ITEMS_PER_CATEGORY} items.`,
          status: "warning",
          duration: 5000,
        });
        return;
      }

      const configData = {
        type: 'sort-categories-egg',
        title: title.trim(),
        eggQty: Number(eggQty),
        categories: legacyCategories, // Legacy format for backward compatibility
        richCategories: transformedCategories, // New rich text format
        share: shareConfig,
        userId: auth.currentUser.uid,
        email: auth.currentUser.email || undefined,
        createdAt: serverTimestamp()
      };

      // Validate that we have enough items
      const totalItems = transformedCategories.reduce((sum, cat) => sum + cat.items.length, 0);
      if (totalItems < configData.eggQty) {
        toast({
          title: 'Error',
          description: `Not enough items. You need at least ${configData.eggQty} items total, but only have ${totalItems}.`,
          status: 'error',
          duration: 5000,
        });
        return;
      }

      // Save to userGameConfigs collection
      const docRef = await addDoc(collection(db, 'userGameConfigs'), configData);
      console.log('Successfully saved config with ID:', docRef.id);

      toast({
        title: 'Success',
        description: 'Configuration saved successfully',
        status: 'success',
        duration: 3000,
      });

      // Reload configurations
      await loadSavedConfigs();
    } catch (error) {
      console.error('Error saving configuration:', error);
      // Add more detailed error logging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          code: (error as any).code,
          name: error.name,
          stack: error.stack
        });
      }
      toast({
        title: 'Error',
        description: 'Could not save configuration. Please try again.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  // Add loadTemplate function
  const loadTemplate = (config: any) => {
    setTitle(config.title || '');
    setEggQty(config.eggQty || 6);
    setShareConfig(config.share || false);
    
    // Load rich text categories if available, otherwise convert from legacy format
    let categoriesToLoad: Category[] = [];
    
    if (config.richCategories && Array.isArray(config.richCategories)) {
      // Load rich text format
      categoriesToLoad = config.richCategories.map((cat: any) => ({
        name: cat.name,
        items: cat.items.map((item: any) => ({
          content: item.content || '',
          text: item.text || ''
        }))
      }));
    } else if (config.categories && Array.isArray(config.categories)) {
      // Convert legacy format to rich text format
      categoriesToLoad = config.categories.map((cat: any) => ({
        name: cat.name,
        items: (Array.isArray(cat.items) ? cat.items : []).map((item: string) => ({
          content: item, // Use plain text as content for legacy items
          text: item
        }))
      }));
    }
    
    // Ensure we have at least one category with at least one item
    if (categoriesToLoad.length === 0) {
      categoriesToLoad = [{ name: '', items: [{ content: '', text: '' }] }];
    } else {
      // Ensure each category has at least one item
      categoriesToLoad = categoriesToLoad.map(cat => ({
        ...cat,
        items: cat.items.length > 0 ? cat.items : [{ content: '', text: '' }]
      }));
    }
    
    setCategories(categoriesToLoad);
  };

  // Configure ReactQuill toolbar (same as WhackAMole)
  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      ['clean']
    ],
  };

  const quillFormats = [
    'bold', 'italic', 'underline', 'script'
  ];

  return (
    <VStack spacing={4} pb={6}>
      <Box w="100%">
        <Heading size="md" mb={2}>Load Saved Configuration</Heading>
        <Select
          placeholder="Select a saved configuration"
          onChange={(e) => {
            const config = savedConfigs.find(c => c.id === e.target.value);
            if (config) {
              loadTemplate(config);
              onConfigSelect(config);
            }
          }}
          isDisabled={isLoading || savedConfigs.length === 0}
        >
          {savedConfigs.map(config => (
            <option key={config.id} value={config.id}>
              {config.title} {config.isAdminConfig ? '(Official)' : `(by ${config.email || 'Unknown'})`}
            </option>
          ))}
        </Select>
        {savedConfigs.length === 0 && !isLoading && (
          <Text fontSize="sm" color="gray.500" mt={1}>
            No saved configurations found. Create one below.
          </Text>
        )}
      </Box>

      <Divider />

      <Box w="100%">
        <Heading size="md" mb={4}>Create New Configuration</Heading>
        
        <FormControl mb={4}>
          <FormLabel>Configuration Title</FormLabel>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter configuration title"
          />
        </FormControl>

        <FormControl mb={4}>
          <FormLabel>Number of Eggs</FormLabel>
          <Input
            type="number"
            value={eggQty}
            onChange={(e) => setEggQty(Number(e.target.value))}
            min={1}
          />
        </FormControl>

        <Heading size="sm" mb={2}>Categories</Heading>
        {categories.map((category, categoryIndex) => (
          <VStack key={categoryIndex} w="100%" spacing={2} mb={4} p={4} border="1px" borderColor="gray.200" borderRadius="md">
            <FormControl>
              <FormLabel>Category {categoryIndex + 1} Name</FormLabel>
              <Input
                value={category.name}
                onChange={(e) => handleCategoryChange(categoryIndex, 'name', e.target.value)}
                placeholder="Category name"
              />
            </FormControl>
            
            <FormLabel alignSelf="flex-start">Items</FormLabel>
            {category.items.map((item, itemIndex) => (
              <Box key={itemIndex} w="100%" p={3} border="1px" borderColor="gray.100" borderRadius="md">
                <HStack mb={2} justify="space-between">
                  <Text fontSize="sm" fontWeight="medium">Item {itemIndex + 1}</Text>
                  {category.items.length > 1 && (
                    <IconButton
                      aria-label="Remove item"
                      icon={<DeleteIcon />}
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => handleRemoveItem(categoryIndex, itemIndex)}
                    />
                  )}
                </HStack>
                
                <ReactQuill
                  value={item.content}
                  onChange={(content) => handleItemContentChange(categoryIndex, itemIndex, content)}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Enter item text (supports bold, italic, underline, superscript, subscript)"
                  style={{
                    minHeight: '60px',
                    backgroundColor: 'white'
                  }}
                />
              </Box>
            ))}
            
            <Button
              leftIcon={<AddIcon />}
              onClick={() => handleAddItem(categoryIndex)}
              colorScheme="blue"
              variant="outline"
              size="sm"
              alignSelf="flex-start"
            >
              Add Item
            </Button>
          </VStack>
        ))}

        <Button onClick={handleAddCategory} colorScheme="blue" mb={4}>
          Add Category
        </Button>

        <FormControl display="flex" alignItems="center" mb={4}>
          <FormLabel mb="0">Share Configuration</FormLabel>
          <Switch
            isChecked={shareConfig}
            onChange={(e) => setShareConfig(e.target.checked)}
          />
        </FormControl>

        <Button onClick={handleSaveConfig} colorScheme="green" w="100%">
          Save Configuration
        </Button>
      </Box>
    </VStack>
  );
};

export default GameConfig; 