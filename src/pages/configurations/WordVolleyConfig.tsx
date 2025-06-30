import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { generateAndUploadThumbnail } from '../../utils/thumbnailGenerator';
import EnhancedTemplateSync from '../../components/EnhancedTemplateSync';
import {
  Box,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  Button,
  Switch,
  useToast,
  Heading,
  Text,
  IconButton,
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
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';

interface WordCategory {
  id: string;
  name: string;
  words: string[];
  isTarget: boolean;
}

interface WordVolleyTemplate {
  title: string;
  description: string;
  targetCategory: WordCategory;
  nonTargetCategory: WordCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  gameSpeed: number;
  paddleSize: number;
  theme: string;
  gameDuration?: number;
  enableTextToSpeech?: boolean;
}

interface OutletContextType {
  onError?: (message: string) => void;
}

// Add CSS styles to match other game configs
const styles = `
  .apple-input {
    border-radius: 8px !important;
    border-color: #E2E8F0 !important;
    background-color: #F8F9FC !important;
    transition: all 0.2s ease !important;
  }
  
  .apple-input:focus-within {
    border-color: #007AFF !important;
    box-shadow: 0 0 0 1px #007AFF !important;
    background-color: white !important;
  }
`;

// Add styles to the document
if (typeof document !== 'undefined') {
  const existingStyle = document.querySelector('style[data-word-volley-styles]');
  if (!existingStyle) {
    const styleElement = document.createElement('style');
    styleElement.setAttribute('data-word-volley-styles', 'true');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}

const WordVolleyConfig = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { onError } = useOutletContext<OutletContextType>();
  const toast = useToast();
  
  const [title, setTitle] = useState('Pong Game');
  const [description, setDescription] = useState('Educational Pong-style word categorization game');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [gameSpeed, setGameSpeed] = useState(3);
  const [paddleSize, setPaddleSize] = useState(5);

  
  // Target category (words to hit)
  const [targetCategory, setTargetCategory] = useState<WordCategory>({
    id: 'target',
    name: 'Short A Words',
    words: ['cat', 'bat', 'hat', 'mat', 'rat', 'sat', 'fat', 'pat', 'lap', 'cap', 'map', 'tap', 'gap', 'nap', 'sap'],
    isTarget: true
  });
  
  // Non-target category (words to avoid)
  const [nonTargetCategory, setNonTargetCategory] = useState<WordCategory>({
    id: 'non-target',
    name: 'Other Words',
    words: ['dog', 'tree', 'house', 'car', 'sun', 'moon', 'book', 'pen', 'cup', 'ball', 'fish', 'bird', 'cake', 'shoe', 'toy'],
    isTarget: false
  });
  
  const [shareConfig, setShareConfig] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [categoryTemplates, setCategoryTemplates] = useState<any[]>([]);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gameDuration, setGameDuration] = useState(3); // Default to 3 minutes
  const [enableTextToSpeech, setEnableTextToSpeech] = useState(true); // Default to enabled

  const hasUnsavedChanges = true;
  const { safeNavigate } = useUnsavedChanges(hasUnsavedChanges);



  useEffect(() => {
    const checkAdminStatus = async () => {
      if (currentUser?.email) {
        try {
          const usersQuery = query(collection(db, 'users'), where('email', '==', currentUser.email));
          const userSnapshot = await getDocs(usersQuery);
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            setIsAdmin(userData.role === 'admin');
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
        }
      }
    };

    checkAdminStatus();
    fetchCategoryTemplates();
  }, [currentUser]);

  useEffect(() => {
    const checkForTemplateSelection = () => {
      const urlParams = new URLSearchParams(location.search);
      const templateId = urlParams.get('template');
      
      if (templateId) {
        setSelectedTemplate(templateId);
        loadTemplate();
      }
    };

    const checkTemplateSource = async () => {
      const urlParams = new URLSearchParams(location.search);
      const source = urlParams.get('source');
      const templateId = urlParams.get('template');
      
      if (source === 'blank-template' && templateId) {
        try {
          const templateDoc = await getDoc(doc(db, 'blankGameTemplates', templateId));
          if (templateDoc.exists()) {
            const templateData = templateDoc.data();
            setTitle(templateData.title || 'New Pong Game');
            setDescription(templateData.description || 'Educational Pong-style word categorization game');
            if (templateData.targetCategory) {
              setTargetCategory(templateData.targetCategory);
            }
            if (templateData.nonTargetCategory) {
              setNonTargetCategory(templateData.nonTargetCategory);
            }
            if (templateData.difficulty) {
              setDifficulty(templateData.difficulty);
            }

            if (templateData.gameDuration) {
              setGameDuration(templateData.gameDuration);
            }
            if (templateData.enableTextToSpeech !== undefined) {
              setEnableTextToSpeech(templateData.enableTextToSpeech);
            }
          }
        } catch (error) {
          console.error('Error loading blank template:', error);
        }
      }
    };

    checkForTemplateSelection();
    checkTemplateSource();
  }, [location.search]);

  const fetchCategoryTemplates = async () => {
    try {
      const templatesQuery = query(collection(db, 'categoryTemplates'), where('type', '==', 'word-volley'));
      const templatesSnapshot = await getDocs(templatesQuery);
      const templates = templatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategoryTemplates(templates);
    } catch (error) {
      console.error('Error fetching category templates:', error);
    }
  };

  const loadTemplate = async () => {
    if (!selectedTemplate) return;
    
    setIsLoadingTemplate(true);
    try {
      const templateDoc = await getDoc(doc(db, 'categoryTemplates', selectedTemplate));
      if (templateDoc.exists()) {
        const templateData = templateDoc.data() as WordVolleyTemplate;
        setTitle(templateData.title);
        setDescription(templateData.description);
        setTargetCategory(templateData.targetCategory);
        setNonTargetCategory(templateData.nonTargetCategory);
        setDifficulty(templateData.difficulty);
        setGameDuration(templateData.gameDuration || 3); // Default to 3 minutes if not set
        setEnableTextToSpeech(templateData.enableTextToSpeech ?? true); // Default to enabled if not set
        
        toast({
          title: 'Template Loaded',
          description: `Loaded template: ${templateData.title}`,
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        title: 'Load Failed',
        description: 'Failed to load template',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleTemplateChange = (template: string) => {
    setSelectedTemplate(template);
  };

  const handleWordChange = (categoryType: 'target' | 'nonTarget', index: number, value: string) => {
    if (categoryType === 'target') {
      const newWords = [...targetCategory.words];
      newWords[index] = value;
      setTargetCategory({ ...targetCategory, words: newWords });
    } else {
      const newWords = [...nonTargetCategory.words];
      newWords[index] = value;
      setNonTargetCategory({ ...nonTargetCategory, words: newWords });
    }
  };

  const handleAddWord = (categoryType: 'target' | 'nonTarget') => {
    if (categoryType === 'target') {
      setTargetCategory({
        ...targetCategory,
        words: [...targetCategory.words, '']
      });
    } else {
      setNonTargetCategory({
        ...nonTargetCategory,
        words: [...nonTargetCategory.words, '']
      });
    }
  };

  const handleRemoveWord = (categoryType: 'target' | 'nonTarget', index: number) => {
    if (categoryType === 'target') {
      const newWords = targetCategory.words.filter((_, i) => i !== index);
      setTargetCategory({ ...targetCategory, words: newWords });
    } else {
      const newWords = nonTargetCategory.words.filter((_, i) => i !== index);
      setNonTargetCategory({ ...nonTargetCategory, words: newWords });
    }
  };

  const handleSaveConfig = async () => {
    setSaveAttempted(true);

    if (!title.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for your game',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (targetCategory.words.filter(word => word.trim()).length === 0) {
      toast({
        title: 'Target Words Required',
        description: 'Please add at least one target word',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (nonTargetCategory.words.filter(word => word.trim()).length === 0) {
      toast({
        title: 'Non-Target Words Required',
        description: 'Please add at least one non-target word',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      // Clean up empty words
      const cleanTargetWords = targetCategory.words.filter(word => word.trim());
      const cleanNonTargetWords = nonTargetCategory.words.filter(word => word.trim());

      const gameConfig = {
        title,
        type: 'word-volley' as const,
        description,
        difficulty,
        timeLimit: gameDuration * 60, // Convert minutes to seconds
        targetScore: Math.max(cleanTargetWords.length, cleanNonTargetWords.length) * 10,
        gameSpeed,
        paddleSize,
        gameDuration, // Store duration in minutes for display
        enableTextToSpeech, // Include TTS setting
        targetCategory: {
          ...targetCategory,
          words: cleanTargetWords
        },
        nonTargetCategory: {
          ...nonTargetCategory,
          words: cleanNonTargetWords
        },
        share: shareConfig,
        email: currentUser?.email,
        userId: currentUser?.uid,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'userGameConfigs'), gameConfig);
      console.log('Pong configuration saved with ID:', docRef.id);

      try {
        const thumbnailUrl = await generateAndUploadThumbnail(docRef.id, gameConfig);
        await updateDoc(doc(db, 'userGameConfigs', docRef.id), {
          thumbnail: thumbnailUrl
        });
        console.log('Thumbnail generated and saved');
      } catch (thumbnailError) {
        console.error('Error generating thumbnail:', thumbnailError);
      }

      toast({
        title: 'Success',
        description: 'Pong configuration saved successfully!',
        status: 'success',
        duration: 3000,
      });

      const shouldNavigate = confirm('Configuration saved successfully! Would you like to go back to the home page?');
      if (shouldNavigate) {
        safeNavigate('/');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save configuration. Please try again.',
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
            Create Pong Game
          </Heading>
          <Text color="gray.600">
            Create an educational Pong-style game where students hit correct category words while avoiding incorrect ones.
          </Text>
        </Box>

        {/* Game Settings */}
        <Card>
          <CardHeader>
            <Heading size="md">Game Settings</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              {/* Template Selection */}
              {categoryTemplates.length > 0 && (
                <FormControl>
                  <FormLabel>Choose a Template</FormLabel>
                  <Select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    placeholder="Select a template (optional)"
                  >
                    {categoryTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </Select>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    {categoryTemplates.length} template{categoryTemplates.length !== 1 ? 's' : ''} available
                  </Text>
                </FormControl>
              )}

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} width="100%">
                <FormControl>
                  <FormLabel>Title</FormLabel>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter game title"
                    isInvalid={saveAttempted && !title.trim()}
                    className="apple-input"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Difficulty</FormLabel>
                  <Select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                    className="apple-input"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter game description"
                  className="apple-input"
                />
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} width="100%">
                <FormControl>
                  <FormLabel>Game Speed: {gameSpeed}</FormLabel>
                  <Slider
                    value={gameSpeed}
                    onChange={setGameSpeed}
                    min={1}
                    max={10}
                    step={1}
                  >
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text fontSize="sm" color="gray.600">
                    Controls ball speed (1 = slowest, 10 = fastest)
                  </Text>
                </FormControl>

                <FormControl>
                  <FormLabel>Paddle Size: {paddleSize}</FormLabel>
                  <Slider
                    value={paddleSize}
                    onChange={setPaddleSize}
                    min={1}
                    max={10}
                    step={1}
                  >
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text fontSize="sm" color="gray.600">
                    Controls paddle size (1 = smallest, 10 = largest)
                  </Text>
                </FormControl>
              </SimpleGrid>



              <FormControl>
                <FormLabel>Game Duration: {gameDuration} minutes</FormLabel>
                <Slider
                  value={gameDuration}
                  onChange={setGameDuration}
                  min={1}
                  max={5}
                  step={1}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="enable-tts" mb="0">
                  Enable Text-to-Speech for words
                </FormLabel>
                <Switch
                  id="enable-tts"
                  isChecked={enableTextToSpeech}
                  onChange={(e) => setEnableTextToSpeech(e.target.checked)}
                />
              </FormControl>

              {selectedTemplate && (
                <Button
                  onClick={loadTemplate}
                  isLoading={isLoadingTemplate}
                  loadingText="Loading..."
                  colorScheme="blue"
                  variant="outline"
                  size="sm"
                >
                  Load Template
                </Button>
              )}

              {selectedTemplate && (
                <Box>
                  <EnhancedTemplateSync
                    templateId={selectedTemplate}
                    gameTitle={title}
                    variant="compact"
                  />
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Word Categories */}
        <Tabs>
          <TabList>
            <Tab>Target Words (Hit These)</Tab>
            <Tab>Non-Target Words (Avoid These)</Tab>
          </TabList>

          <TabPanels>
            {/* Target Category */}
            <TabPanel>
              <Card>
                <CardHeader>
                  <HStack justify="space-between">
                    <VStack align="start" spacing={1}>
                      <Heading size="md">Target Category</Heading>
                      <Text fontSize="sm" color="gray.600">
                        Words that students should hit with their paddle
                      </Text>
                    </VStack>
                    <Badge colorScheme="green">{targetCategory.words.filter(w => w.trim()).length} words</Badge>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack spacing={4}>
                    <FormControl>
                      <FormLabel>Category Name</FormLabel>
                      <Input
                        value={targetCategory.name}
                        onChange={(e) => setTargetCategory({ ...targetCategory, name: e.target.value })}
                        placeholder="e.g., Short A Words"
                        className="apple-input"
                      />
                    </FormControl>

                    <Box width="100%">
                      <FormLabel>Words</FormLabel>
                      <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={3}>
                        {targetCategory.words.map((word, index) => (
                          <HStack key={index}>
                            <Input
                              value={word}
                              onChange={(e) => handleWordChange('target', index, e.target.value)}
                              placeholder={`Word ${index + 1}`}
                              className="apple-input"
                              size="sm"
                            />
                            <IconButton
                              icon={<DeleteIcon />}
                              onClick={() => handleRemoveWord('target', index)}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              aria-label="Remove word"
                            />
                          </HStack>
                        ))}
                      </SimpleGrid>
                      <Button
                        leftIcon={<AddIcon />}
                        onClick={() => handleAddWord('target')}
                        size="sm"
                        colorScheme="green"
                        variant="outline"
                        mt={3}
                      >
                        Add Target Word
                      </Button>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Non-Target Category */}
            <TabPanel>
              <Card>
                <CardHeader>
                  <HStack justify="space-between">
                    <VStack align="start" spacing={1}>
                      <Heading size="md">Non-Target Category</Heading>
                      <Text fontSize="sm" color="gray.600">
                        Words that students should avoid hitting
                      </Text>
                    </VStack>
                    <Badge colorScheme="red">{nonTargetCategory.words.filter(w => w.trim()).length} words</Badge>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack spacing={4}>
                    <FormControl>
                      <FormLabel>Category Name</FormLabel>
                      <Input
                        value={nonTargetCategory.name}
                        onChange={(e) => setNonTargetCategory({ ...nonTargetCategory, name: e.target.value })}
                        placeholder="e.g., Other Words"
                        className="apple-input"
                      />
                    </FormControl>

                    <Box width="100%">
                      <FormLabel>Words</FormLabel>
                      <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={3}>
                        {nonTargetCategory.words.map((word, index) => (
                          <HStack key={index}>
                            <Input
                              value={word}
                              onChange={(e) => handleWordChange('nonTarget', index, e.target.value)}
                              placeholder={`Word ${index + 1}`}
                              className="apple-input"
                              size="sm"
                            />
                            <IconButton
                              icon={<DeleteIcon />}
                              onClick={() => handleRemoveWord('nonTarget', index)}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              aria-label="Remove word"
                            />
                          </HStack>
                        ))}
                      </SimpleGrid>
                      <Button
                        leftIcon={<AddIcon />}
                        onClick={() => handleAddWord('nonTarget')}
                        size="sm"
                        colorScheme="red"
                        variant="outline"
                        mt={3}
                      >
                        Add Non-Target Word
                      </Button>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Sharing Settings */}
        <Card>
          <CardBody>
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="share-config" mb="0">
                Share this configuration with other teachers
              </FormLabel>
              <Switch
                id="share-config"
                isChecked={shareConfig}
                onChange={(e) => setShareConfig(e.target.checked)}
              />
            </FormControl>
          </CardBody>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSaveConfig}
          colorScheme="blue"
          size="lg"
          isLoading={isLoading}
          loadingText="Saving..."
        >
          Save Pong Configuration
        </Button>
      </VStack>
    </Box>
  );
};

export default WordVolleyConfig; 