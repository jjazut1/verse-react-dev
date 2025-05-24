import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  Switch,
  useToast,
  Heading,
  Text,
  IconButton,
  Select,
  Flex,
  Badge,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertDescription,
  Divider,
  Card,
  CardBody,
  CardHeader,
  useColorModeValue
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, RepeatIcon } from '@chakra-ui/icons';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUnsavedChangesContext } from '../../contexts/UnsavedChangesContext';
import { generateAndUploadThumbnail } from '../../utils/thumbnailGenerator';

// Define interfaces
interface SpinnerWheelItem {
  id: string;
  text: string;
  color?: string;
}

interface SpinnerWheelConfig {
  id?: string;
  title: string;
  type: 'spinner-wheel';
  items: SpinnerWheelItem[];
  removeOnSelect: boolean;
  wheelTheme: 'rainbow' | 'pastel' | 'bright' | 'custom';
  customColors: string[];
  soundEnabled: boolean;
  showMascot: boolean;
  maxSpins?: number;
  instructions: string;
  gameCategory: string;
  share: boolean;
  userId: string;
  email: string;
  createdAt?: any;
  updatedAt: any;
  thumbnail?: string;
}

interface OutletContextType {
  onError?: (message: string) => void;
}

const SpinnerWheelConfig: React.FC = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  const { onError } = useOutletContext<OutletContextType>();
  const { setHasUnsavedChanges } = useUnsavedChangesContext();

  // Form state
  const [title, setTitle] = useState('My Spinner Wheel');
  const [items, setItems] = useState<SpinnerWheelItem[]>([
    { id: '1', text: 'Item 1', color: '#FF6B6B' },
    { id: '2', text: 'Item 2', color: '#4ECDC4' },
    { id: '3', text: 'Item 3', color: '#45B7D1' },
    { id: '4', text: 'Item 4', color: '#96CEB4' }
  ]);
  const [removeOnSelect, setRemoveOnSelect] = useState(false);
  const [wheelTheme, setWheelTheme] = useState<'rainbow' | 'pastel' | 'bright' | 'custom'>('rainbow');
  const [customColors, setCustomColors] = useState<string[]>(['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showMascot, setShowMascot] = useState(true);
  const [maxSpins, setMaxSpins] = useState<number>(0); // 0 = unlimited
  const [instructions, setInstructions] = useState('Click the SPIN button to randomly select an item from the wheel!');
  const [gameCategory, setGameCategory] = useState('');
  const [shareConfig, setShareConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Color themes
  const colorThemes = {
    rainbow: ['#FF6B6B', '#FFD93D', '#6BCF7F', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],
    pastel: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E1BAFF', '#FFBADB', '#C9BAFF'],
    bright: ['#FF0000', '#FF8800', '#FFFF00', '#88FF00', '#00FF00', '#00FF88', '#00FFFF', '#0088FF'],
    custom: customColors
  };

  // Check if user is authenticated
  useEffect(() => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to access configuration pages.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      navigate('/');
    }
  }, [currentUser, navigate, toast]);

  // Load existing configuration if templateId is provided
  useEffect(() => {
    if (templateId && currentUser) {
      loadTemplate();
    }
  }, [templateId, currentUser]);

  const loadTemplate = async () => {
    if (!templateId) return;

    setIsLoading(true);
    try {
      const docRef = doc(db, 'userGameConfigs', templateId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const config = docSnap.data() as SpinnerWheelConfig;
        
        // Populate form fields
        setTitle(config.title || 'My Spinner Wheel');
        setItems(config.items || []);
        setRemoveOnSelect(config.removeOnSelect || false);
        setWheelTheme(config.wheelTheme || 'rainbow');
        setCustomColors(config.customColors || ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']);
        setSoundEnabled(config.soundEnabled ?? true);
        setShowMascot(config.showMascot ?? true);
        setMaxSpins(config.maxSpins || 0);
        setInstructions(config.instructions || 'Click the SPIN button to randomly select an item from the wheel!');
        setGameCategory(config.gameCategory || '');
        setShareConfig(config.share || false);
        setIsEditing(true);

        // Reset unsaved changes flag after loading
        setHasUnsavedChanges(false);
      } else {
        if (onError) {
          onError("The requested configuration could not be found.");
        } else {
          toast({
            title: "Configuration not found",
            description: "The requested configuration could not be found.",
            status: "error",
            duration: 5000,
          });
        }
        navigate('/configure/spinner-wheel');
      }
    } catch (error) {
      console.error("Error loading configuration:", error);
      if (onError) {
        onError("Failed to load the configuration.");
      } else {
        toast({
          title: "Error",
          description: "Failed to load the configuration.",
          status: "error",
          duration: 5000,
        });
      }
      navigate('/configure/spinner-wheel');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form changes to track unsaved changes
  useEffect(() => {
    if (currentUser) {
      setHasUnsavedChanges(true);
    }
  }, [title, items, removeOnSelect, wheelTheme, customColors, soundEnabled, showMascot, maxSpins, instructions, gameCategory, shareConfig, setHasUnsavedChanges]);

  // Generate colors for items based on theme
  const getItemColors = () => {
    const themeColors = colorThemes[wheelTheme];
    return items.map((item, index) => ({
      ...item,
      color: themeColors[index % themeColors.length]
    }));
  };

  // Add new item
  const addItem = () => {
    const newId = Date.now().toString();
    const newItem: SpinnerWheelItem = {
      id: newId,
      text: `Item ${items.length + 1}`,
      color: colorThemes[wheelTheme][items.length % colorThemes[wheelTheme].length]
    };
    setItems([...items, newItem]);
  };

  // Remove item
  const removeItem = (id: string) => {
    if (items.length > 2) { // Keep at least 2 items
      setItems(items.filter(item => item.id !== id));
    }
  };

  // Update item text
  const updateItem = (id: string, text: string) => {
    setItems(items.map(item => item.id === id ? { ...item, text } : item));
  };

  // Save configuration
  const handleSave = async () => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to save configurations.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for your spinner wheel.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (items.length < 2) {
      toast({
        title: 'Minimum Items Required',
        description: 'Please add at least 2 items to the spinner wheel.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const baseConfig = {
        title: title.trim(),
        type: 'spinner-wheel' as const,
        items: getItemColors(),
        removeOnSelect,
        wheelTheme,
        customColors,
        soundEnabled,
        showMascot,
        maxSpins,
        instructions: instructions.trim(),
        gameCategory: gameCategory.trim(),
        share: shareConfig,
        userId: currentUser.uid,
        email: currentUser.email || '',
        updatedAt: serverTimestamp()
      };

      // Add createdAt only for new configurations
      const config = isEditing 
        ? baseConfig 
        : { ...baseConfig, createdAt: serverTimestamp() };

      // Generate thumbnail
      const docId = templateId || doc(collection(db, 'userGameConfigs')).id;
      const thumbnailUrl = await generateAndUploadThumbnail(docId, config);
      if (thumbnailUrl) {
        (config as any).thumbnail = thumbnailUrl;
      }

      // Save to database
      await setDoc(doc(db, 'userGameConfigs', docId), config);

      toast({
        title: isEditing ? 'Configuration Updated' : 'Configuration Saved',
        description: isEditing ? 'Your spinner wheel has been updated successfully.' : 'Your spinner wheel has been saved successfully.',
        status: 'success',
        duration: 3000,
      });

      setHasUnsavedChanges(false);

      // Navigate to teacher dashboard if this is a new configuration
      if (!isEditing) {
        navigate('/teacher');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Save Failed',
        description: 'There was an error saving your configuration. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Center p={8}>
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Box maxW="4xl" mx="auto" p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>
            {isEditing ? 'Edit Spinner Wheel' : 'Create Spinner Wheel'}
          </Heading>
          <Text color="gray.600">
            Create an interactive spinner wheel for random selection, vocabulary practice, or decision making.
          </Text>
        </Box>

        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <Heading size="md">Basic Settings</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter wheel title"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Instructions</FormLabel>
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Enter instructions for students"
                  rows={3}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Category</FormLabel>
                <Input
                  value={gameCategory}
                  onChange={(e) => setGameCategory(e.target.value)}
                  placeholder="e.g., Math, Reading, Science"
                />
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        {/* Wheel Items */}
        <Card>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="md">Wheel Items</Heading>
              <Button leftIcon={<AddIcon />} onClick={addItem} colorScheme="blue" size="sm">
                Add Item
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            <VStack spacing={3}>
              {items.map((item, index) => (
                <HStack key={item.id} w="full">
                  <Box
                    w={4}
                    h={4}
                    borderRadius="full"
                    bg={colorThemes[wheelTheme][index % colorThemes[wheelTheme].length]}
                  />
                  <Input
                    value={item.text}
                    onChange={(e) => updateItem(item.id, e.target.value)}
                    placeholder={`Item ${index + 1}`}
                    flex={1}
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
              ))}
              {items.length < 2 && (
                <Alert status="info" size="sm">
                  <AlertIcon />
                  <AlertDescription>Add at least 2 items to create a functional spinner wheel.</AlertDescription>
                </Alert>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <Heading size="md">Appearance</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Color Theme</FormLabel>
                <Select value={wheelTheme} onChange={(e) => setWheelTheme(e.target.value as any)}>
                  <option value="rainbow">Rainbow</option>
                  <option value="pastel">Pastel</option>
                  <option value="bright">Bright</option>
                  <option value="custom">Custom</option>
                </Select>
              </FormControl>

              {wheelTheme === 'custom' && (
                <FormControl>
                  <FormLabel>Custom Colors</FormLabel>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    Enter hex color codes separated by commas
                  </Text>
                  <Input
                    value={customColors.join(', ')}
                    onChange={(e) => setCustomColors(e.target.value.split(',').map(c => c.trim()))}
                    placeholder="#FF6B6B, #4ECDC4, #45B7D1"
                  />
                </FormControl>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Game Settings */}
        <Card>
          <CardHeader>
            <Heading size="md">Game Settings</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Remove selected items</FormLabel>
                <Switch
                  isChecked={removeOnSelect}
                  onChange={(e) => setRemoveOnSelect(e.target.checked)}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Enable sound effects</FormLabel>
                <Switch
                  isChecked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Show mascot</FormLabel>
                <Switch
                  isChecked={showMascot}
                  onChange={(e) => setShowMascot(e.target.checked)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Maximum spins (0 = unlimited)</FormLabel>
                <NumberInput
                  value={maxSpins}
                  onChange={(_, value) => setMaxSpins(value || 0)}
                  min={0}
                  max={100}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        {/* Sharing Settings */}
        <Card>
          <CardHeader>
            <Heading size="md">Sharing</Heading>
          </CardHeader>
          <CardBody>
            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Share this configuration publicly</FormLabel>
              <Switch
                isChecked={shareConfig}
                onChange={(e) => setShareConfig(e.target.checked)}
              />
            </FormControl>
            <Text fontSize="sm" color="gray.600" mt={2}>
              Public configurations can be used by other teachers as templates.
            </Text>
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <HStack spacing={4} justify="flex-end">
          <Button
            onClick={() => navigate('/teacher')}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            colorScheme="blue"
            isLoading={isLoading}
            loadingText="Saving..."
          >
            {isEditing ? 'Update Configuration' : 'Save Configuration'}
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default SpinnerWheelConfig; 