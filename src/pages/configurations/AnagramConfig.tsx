import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { generateAndUploadThumbnail } from '../../utils/thumbnailGenerator';
import { SlateEditor } from '../../components/SlateEditor';
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
  useColorModeValue,

  Checkbox,
  Textarea,
  RadioGroup,
  Radio
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';

interface AnagramItem {
  id: string;
  original: string;
  definition: string;
  type: 'word' | 'sentence';
}

interface AnagramTemplate {
  title: string;
  anagrams: AnagramItem[];
  gameMode: 'letters-to-word' | 'words-to-sentence';
  showDefinitions: boolean;
  enableHints: boolean;
  correctFeedbackDuration?: 'always' | 'momentary';
}

interface OutletContextType {
  onError?: (message: string) => void;
}

interface EditorSelectionContextType {
  activeEditorId: string | null;
  setActiveEditorId: (id: string | null) => void;
  lastSelectionPath: [number] | null; // [anagramIndex] or null
  setLastSelectionPath: (path: [number] | null) => void;
}

const EditorSelectionContext = createContext<EditorSelectionContextType>({
  activeEditorId: null,
  setActiveEditorId: () => {},
  lastSelectionPath: null,
  setLastSelectionPath: () => {},
});

const useEditorSelection = () => useContext(EditorSelectionContext);

// Add CSS styles to match spinner wheel input styling
const styles = `
  /* Input fields - same as spinner wheel */
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
  const existingStyle = document.querySelector('style[data-anagram-styles]');
  if (!existingStyle) {
    const styleElement = document.createElement('style');
    styleElement.setAttribute('data-anagram-styles', 'true');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}

const AnagramConfig = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { onError } = useOutletContext<OutletContextType>();
  const toast = useToast();
  
  const [title, setTitle] = useState('Anagram Game');
  const [gameMode] = useState<'letters-to-word'>('letters-to-word');
  const [withClues, setWithClues] = useState(true);

  const [anagrams, setAnagrams] = useState<AnagramItem[]>([
    {
      id: '1',
      original: 'LISTEN',
      definition: 'To hear with attention',
      type: 'word'
    }
  ]);
  const [shareConfig, setShareConfig] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [categoryTemplates, setCategoryTemplates] = useState<any[]>([]);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeEditorId, setActiveEditorId] = useState<string | null>(null);
  const [lastSelectionPath, setLastSelectionPath] = useState<[number] | null>(null);

  const [correctFeedbackDuration, setCorrectFeedbackDuration] = useState<'always' | 'momentary'>('momentary');

  const hasUnsavedChanges = true; // Always assume changes for simplicity
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
            setTitle(templateData.title || 'New Anagram Game');
            setWithClues((templateData.showDefinitions ?? true) || (templateData.enableHints ?? false));
            if (templateData.anagrams) {
              setAnagrams(templateData.anagrams);
            }
          }
        } catch (error) {
          console.error('Error loading blank template:', error);
        }
      }
    };

    const fetchCategoryTemplates = async () => {
      try {
        const templatesQuery = query(collection(db, 'categoryTemplates'), where('type', '==', 'anagram'));
        const templatesSnapshot = await getDocs(templatesQuery);
        const templates = templatesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCategoryTemplates(templates);
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };

    checkForTemplateSelection();
    checkTemplateSource();
    fetchCategoryTemplates();
  }, [location]);

  const loadTemplate = async () => {
    if (!selectedTemplate) return;
    
    setIsLoadingTemplate(true);
    try {
      const templateDoc = await getDoc(doc(db, 'categoryTemplates', selectedTemplate));
      if (templateDoc.exists()) {
        const templateData = templateDoc.data() as AnagramTemplate;
        setTitle(templateData.title);
        setWithClues(templateData.showDefinitions || templateData.enableHints);
        setCorrectFeedbackDuration(templateData.correctFeedbackDuration || 'momentary');
        setAnagrams(templateData.anagrams);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        title: 'Error',
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

  const handleAddAnagram = () => {
    const newAnagram: AnagramItem = {
      id: Date.now().toString(),
      original: '',
      definition: '',
      type: 'word'
    };
    setAnagrams([...anagrams, newAnagram]);
  };

  const handleRemoveAnagram = (index: number) => {
    if (anagrams.length <= 1) {
      toast({
        title: 'Minimum Required',
        description: 'You must have at least one anagram',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    setAnagrams(anagrams.filter((_, i) => i !== index));
  };

  const handleAnagramChange = (index: number, field: keyof AnagramItem, value: string) => {
    const updated = [...anagrams];
    updated[index] = { ...updated[index], [field]: value };
    setAnagrams(updated);
  };

  const handleMoveAnagramUp = (index: number) => {
    if (index === 0) return;
    const updated = [...anagrams];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setAnagrams(updated);
  };

  const handleMoveAnagramDown = (index: number) => {
    if (index === anagrams.length - 1) return;
    const updated = [...anagrams];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setAnagrams(updated);
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

    if (anagrams.length === 0) {
      toast({
        title: 'Anagrams Required',
        description: 'Please add at least one anagram',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    for (let i = 0; i < anagrams.length; i++) {
      if (!anagrams[i].original.trim()) {
        toast({
          title: 'Incomplete Anagram',
          description: `Please enter text for anagram ${i + 1}`,
          status: 'error',
          duration: 3000,
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      // Ensure all anagrams have the correct type
      const finalAnagrams = anagrams.map(anagram => ({ ...anagram, type: 'word' as const }));

      const gameConfig = {
        title,
        type: 'anagram' as const,
        description: `Anagram game with ${anagrams.length} ${anagrams.length === 1 ? 'puzzle' : 'puzzles'}`,
        difficulty: 'medium' as const,
        timeLimit: 300,
        targetScore: anagrams.length * 100,
        maxAttempts: 3,
        shuffleIntensity: 'medium' as const,
        gameMode,
        showDefinitions: withClues,
        enableHints: withClues,
        correctFeedbackDuration,
        anagrams: finalAnagrams,
        share: shareConfig,
        email: currentUser?.email,
        userId: currentUser?.uid,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'userGameConfigs'), gameConfig);
      console.log('Game configuration saved with ID:', docRef.id);

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
        description: 'Configuration saved successfully!',
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

  const getStableAnagramId = (anagramIndex: number) => {
    return `anagram-${anagramIndex}`;
  };

  if (isLoading) {
    return (
      <Center p={8}>
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <EditorSelectionContext.Provider value={{
      activeEditorId,
      setActiveEditorId,
      lastSelectionPath,
      setLastSelectionPath
    }}>
      <Box maxW="4xl" mx="auto" p={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Box>
            <Heading size="lg" mb={2}>
              Create Anagram Game
            </Heading>
            <Text color="gray.600">
              Create letter-to-word or word-to-sentence anagram puzzles for your students to solve.
            </Text>
          </Box>

          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <Heading size="md">Basic Settings</Heading>
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

                <FormControl isRequired>
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
                  <FormLabel>Correct Answer Feedback</FormLabel>
                  <Select
                    value={correctFeedbackDuration}
                    onChange={(e) => setCorrectFeedbackDuration(e.target.value as 'always' | 'momentary')}
                  >
                    <option value="momentary">Show briefly (1 second)</option>
                    <option value="always">Show always</option>
                  </Select>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    Choose how long to show green checkmarks and highlighting when students place words correctly
                  </Text>
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

          {/* Anagram Puzzles */}
          <Card>
            <CardHeader>
              <Heading size="md">Anagram Puzzles</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4}>
                {/* Radio button controls for clues */}
                <FormControl>
                  <RadioGroup
                    value={withClues ? 'with' : 'without'}
                    onChange={(value) => setWithClues(value === 'with')}
                  >
                    <HStack spacing={6}>
                      <Radio value="without">Without clues</Radio>
                      <Radio value="with">With clues</Radio>
                    </HStack>
                  </RadioGroup>
                </FormControl>

                {/* Table header */}
                {withClues && (
                  <HStack spacing={4} w="full">
                    <Text fontWeight="bold" fontSize="md" flex="1">Word</Text>
                    <Text fontWeight="bold" fontSize="md" flex="1">Clue</Text>
                  </HStack>
                )}

                {!withClues && (
                  <HStack spacing={4} w="full">
                    <Text fontWeight="bold" fontSize="md" flex="1">Word</Text>
                  </HStack>
                )}

                {/* Anagram items */}
                {anagrams.map((anagram, index) => (
                  <HStack key={getStableAnagramId(index)} spacing={4} w="full" align="start">
                    <Text minW="20px" color="gray.600" fontSize="sm" pt={2}>
                      {index + 1}.
                    </Text>
                    
                    {withClues && (
                      <>
                        <Box flex="1">
                          <Input
                            value={anagram.original}
                            onChange={(e) => handleAnagramChange(index, 'original', e.target.value)}
                            placeholder="Enter the word"
                            isInvalid={saveAttempted && !anagram.original.trim()}
                            className="apple-input"
                          />
                        </Box>
                        <Box flex="1" border="1px" borderColor="gray.200" borderRadius="md">
                          <SlateEditor
                            value={anagram.definition}
                            onChange={(value) => handleAnagramChange(index, 'definition', value)}
                            placeholder="Enter clue"
                            compact={true}
                            showToolbar={true}
                            className="apple-input"
                          />
                        </Box>
                      </>
                    )}

                    {!withClues && (
                      <Box flex="1">
                        <Input
                          value={anagram.original}
                          onChange={(e) => handleAnagramChange(index, 'original', e.target.value)}
                          placeholder="Enter the word"
                          isInvalid={saveAttempted && !anagram.original.trim()}
                          className="apple-input"
                        />
                      </Box>
                    )}

                    <HStack spacing={1}>
                      <IconButton
                        icon={<ChevronUpIcon />}
                        aria-label="Move up"
                        size="sm"
                        variant="ghost"
                        isDisabled={index === 0}
                        onClick={() => handleMoveAnagramUp(index)}
                      />
                      <IconButton
                        icon={<ChevronDownIcon />}
                        aria-label="Move down"
                        size="sm"
                        variant="ghost"
                        isDisabled={index === anagrams.length - 1}
                        onClick={() => handleMoveAnagramDown(index)}
                      />
                      <IconButton
                        icon={<DeleteIcon />}
                        aria-label="Remove anagram"
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleRemoveAnagram(index)}
                      />
                    </HStack>
                  </HStack>
                ))}

                {/* Add new item button and limits */}
                <HStack justify="space-between" w="full" pt={2}>
                  <HStack>
                    <Button
                      leftIcon={<AddIcon />}
                      onClick={handleAddAnagram}
                      variant="ghost"
                      size="sm"
                      color="gray.600"
                    >
                      Add a new word
                    </Button>
                  </HStack>
                  <Text fontSize="sm" color="gray.500">
                    min 1 max 100
                  </Text>
                </HStack>

                {anagrams.length === 0 && (
                  <Alert status="info">
                    <AlertIcon />
                    <AlertDescription>
                      Add at least one anagram to create a functional game.
                    </AlertDescription>
                  </Alert>
                )}
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
                <FormLabel mb="0">Share this game publicly</FormLabel>
                <Switch
                  isChecked={shareConfig}
                  onChange={(e) => setShareConfig(e.target.checked)}
                />
              </FormControl>
              <Text fontSize="sm" color="gray.600" mt={2}>
                Public games can be used by other teachers as templates.
              </Text>
            </CardBody>
          </Card>

          {/* Action Buttons */}
          <HStack spacing={4} justify="flex-end">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveConfig}
              colorScheme="blue"
              isLoading={isLoading}
              loadingText="Saving..."
            >
              Save Game Configuration
            </Button>
          </HStack>
        </VStack>
      </Box>
    </EditorSelectionContext.Provider>
  );
};

export default AnagramConfig; 