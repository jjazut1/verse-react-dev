import React, { useState } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import {
  Box,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Heading,
  SimpleGrid,
  IconButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Select,
  useToast,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { generateCategoryItems } from '../services/categoryAgent';

// Type definitions
interface WordCategory {
  id: string;
  name: string;
  words: string[];
  isTarget: boolean;
}

interface WordVolleyFormData {
  title: string;
  description: string;
  gameSpeed: number;
  paddleSize: number;
  gameDuration: number;
  enableTextToSpeech: boolean;
  targetCategory: WordCategory;
  nonTargetCategory: WordCategory;
  share: boolean;
}

// Word Category Manager Component
const WordCategoryManager: React.FC<{
  formData: Partial<WordVolleyFormData>;
  updateField: (field: string, value: any) => void;
}> = ({ formData, updateField }) => {
  const toast = useToast();
  
  // Initialize categories synchronously if they don't exist
  if (!formData.targetCategory) {
    const defaultTargetCategory: WordCategory = {
      id: 'target',
      name: 'Short A Words',
      words: ['cat', 'bat', 'hat', 'mat', 'rat', 'sat', 'fat', 'pat', 'lap', 'cap'],
      isTarget: true
    };
    updateField('targetCategory', defaultTargetCategory);
  }

  if (!formData.nonTargetCategory) {
    const defaultNonTargetCategory: WordCategory = {
      id: 'non-target',
      name: 'Other Words',
      words: ['dog', 'tree', 'house', 'car', 'sun', 'moon', 'book', 'pen', 'cup', 'ball'],
      isTarget: false
    };
    updateField('nonTargetCategory', defaultNonTargetCategory);
  }

  const targetCategory = formData.targetCategory || {
    id: 'target',
    name: 'Short A Words',
    words: ['cat', 'bat', 'hat', 'mat', 'rat'],
    isTarget: true
  };

  const nonTargetCategory = formData.nonTargetCategory || {
    id: 'non-target',
    name: 'Other Words',
    words: ['dog', 'tree', 'house', 'car', 'sun'],
    isTarget: false
  };

  // Local AI generation state
  const [genTarget, setGenTarget] = useState<{ prompt: string; count: number; replace: boolean; loading: boolean }>({ prompt: '', count: 10, replace: true, loading: false });
  const [genNonTarget, setGenNonTarget] = useState<{ prompt: string; count: number; replace: boolean; loading: boolean }>({ prompt: '', count: 10, replace: true, loading: false });

  const MAX_WORDS = 50;

  const handleGenerate = async (which: 'target' | 'nonTarget') => {
    const state = which === 'target' ? genTarget : genNonTarget;
    if (!state.prompt.trim()) {
      toast({ title: 'Enter a prompt to generate words', status: 'warning', duration: 3000 });
      return;
    }
    which === 'target' ? setGenTarget({ ...state, loading: true }) : setGenNonTarget({ ...state, loading: true });
    try {
      const items = await generateCategoryItems({ prompt: state.prompt.trim(), count: state.count });
      const trimmed = (items || [])
        .map((t) => (typeof t === 'string' ? t.trim() : ''))
        .filter((t) => t.length > 0)
        .slice(0, MAX_WORDS);
      if (which === 'target') {
        const current = targetCategory.words || [];
        const merged = state.replace ? trimmed : [...current, ...trimmed];
        updateField('targetCategory', { ...targetCategory, words: merged.slice(0, MAX_WORDS) });
      } else {
        const current = nonTargetCategory.words || [];
        const merged = state.replace ? trimmed : [...current, ...trimmed];
        updateField('nonTargetCategory', { ...nonTargetCategory, words: merged.slice(0, MAX_WORDS) });
      }
      toast({ title: 'Words generated', status: 'success', duration: 2000 });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Word Volley generation failed', e);
      toast({ title: 'Generation failed', status: 'error', duration: 4000 });
    } finally {
      which === 'target' ? setGenTarget({ ...state, loading: false }) : setGenNonTarget({ ...state, loading: false });
    }
  };

  const handleWordChange = (categoryType: 'target' | 'nonTarget', index: number, value: string) => {
    if (categoryType === 'target') {
      const newWords = [...(targetCategory.words || [])];
      newWords[index] = value;
      updateField('targetCategory', { ...targetCategory, words: newWords });
    } else {
      const newWords = [...(nonTargetCategory.words || [])];
      newWords[index] = value;
      updateField('nonTargetCategory', { ...nonTargetCategory, words: newWords });
    }
  };

  const handleAddWord = (categoryType: 'target' | 'nonTarget') => {
    if (categoryType === 'target') {
      const currentWords = targetCategory.words || [];
      if (currentWords.length >= 50) return; // Limit to 50 words
      const newWords = [...currentWords, ''];
      updateField('targetCategory', { ...targetCategory, words: newWords });
    } else {
      const currentWords = nonTargetCategory.words || [];
      if (currentWords.length >= 50) return; // Limit to 50 words
      const newWords = [...currentWords, ''];
      updateField('nonTargetCategory', { ...nonTargetCategory, words: newWords });
    }
  };

  const handleRemoveWord = (categoryType: 'target' | 'nonTarget', index: number) => {
    if (categoryType === 'target') {
      const newWords = (targetCategory.words || []).filter((_, i) => i !== index);
      updateField('targetCategory', { ...targetCategory, words: newWords });
    } else {
      const newWords = (nonTargetCategory.words || []).filter((_, i) => i !== index);
      updateField('nonTargetCategory', { ...nonTargetCategory, words: newWords });
    }
  };

  const handleCategoryNameChange = (categoryType: 'target' | 'nonTarget', name: string) => {
    if (categoryType === 'target') {
      updateField('targetCategory', { ...targetCategory, name });
    } else {
      updateField('nonTargetCategory', { ...nonTargetCategory, name });
    }
  };

  return (
    <Box>
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
                  <Badge colorScheme="green">
                    {(targetCategory.words || []).filter(w => w.trim()).length} / 50 words
                  </Badge>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={4}>
                  <FormControl>
                    <FormLabel>Category Name</FormLabel>
                    <Input
                      value={targetCategory.name || ''}
                      onChange={(e) => handleCategoryNameChange('target', e.target.value)}
                      placeholder="e.g., Short A Words"
                      className="apple-input"
                    />
                  </FormControl>

                  {/* AI Assistant for Target */}
                  <FormControl>
                    <FormLabel>Use AI to Generate Words (Optional)</FormLabel>
                    <HStack align="stretch" spacing={2}>
                      <Input
                        placeholder="Describe words (e.g., short a CVC words)"
                        value={genTarget.prompt}
                        onChange={(e) => setGenTarget((prev) => ({ ...prev, prompt: e.target.value }))}
                      />
                      <Select
                        width="110px"
                        value={genTarget.count}
                        onChange={(e) => setGenTarget((prev) => ({ ...prev, count: Number(e.target.value) }))}
                      >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={20}>20</option>
                        <option value={25}>25</option>
                      </Select>
                      <Select
                        width="130px"
                        value={genTarget.replace ? 'replace' : 'append'}
                        onChange={(e) => setGenTarget((prev) => ({ ...prev, replace: e.target.value === 'replace' }))}
                      >
                        <option value="replace">Replace</option>
                        <option value="append">Append</option>
                      </Select>
                      <Button colorScheme="purple" isLoading={genTarget.loading} onClick={() => handleGenerate('target')}>
                        Generate
                      </Button>
                    </HStack>
                  </FormControl>

                  <Box width="100%">
                    <FormLabel>Words</FormLabel>
                    <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={3}>
                      {(targetCategory.words || []).map((word, index) => (
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
                      isDisabled={(targetCategory.words || []).length >= 50}
                    >
                      {(targetCategory.words || []).length >= 50 ? 'Maximum Reached (50)' : 'Add Target Word'}
                    </Button>
                    {(targetCategory.words || []).length >= 45 && (targetCategory.words || []).length < 50 && (
                      <Text fontSize="sm" color="orange.600" mt={1}>
                        {50 - (targetCategory.words || []).length} words remaining
                      </Text>
                    )}
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
                  <Badge colorScheme="red">
                    {(nonTargetCategory.words || []).filter(w => w.trim()).length} / 50 words
                  </Badge>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={4}>
                  <FormControl>
                    <FormLabel>Category Name</FormLabel>
                    <Input
                      value={nonTargetCategory.name || ''}
                      onChange={(e) => handleCategoryNameChange('nonTarget', e.target.value)}
                      placeholder="e.g., Other Words"
                      className="apple-input"
                    />
                  </FormControl>

                  {/* AI Assistant for Non-Target */}
                  <FormControl>
                    <FormLabel>Use AI to Generate Words (Optional)</FormLabel>
                    <HStack align="stretch" spacing={2}>
                      <Input
                        placeholder="Describe words (e.g., non-short a words)"
                        value={genNonTarget.prompt}
                        onChange={(e) => setGenNonTarget((prev) => ({ ...prev, prompt: e.target.value }))}
                      />
                      <Select
                        width="110px"
                        value={genNonTarget.count}
                        onChange={(e) => setGenNonTarget((prev) => ({ ...prev, count: Number(e.target.value) }))}
                      >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={20}>20</option>
                        <option value={25}>25</option>
                      </Select>
                      <Select
                        width="130px"
                        value={genNonTarget.replace ? 'replace' : 'append'}
                        onChange={(e) => setGenNonTarget((prev) => ({ ...prev, replace: e.target.value === 'replace' }))}
                      >
                        <option value="replace">Replace</option>
                        <option value="append">Append</option>
                      </Select>
                      <Button colorScheme="purple" isLoading={genNonTarget.loading} onClick={() => handleGenerate('nonTarget')}>
                        Generate
                      </Button>
                    </HStack>
                  </FormControl>

                  <Box width="100%">
                    <FormLabel>Words</FormLabel>
                    <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={3}>
                      {(nonTargetCategory.words || []).map((word, index) => (
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
                      isDisabled={(nonTargetCategory.words || []).length >= 50}
                    >
                      {(nonTargetCategory.words || []).length >= 50 ? 'Maximum Reached (50)' : 'Add Non-Target Word'}
                    </Button>
                    {(nonTargetCategory.words || []).length >= 45 && (nonTargetCategory.words || []).length < 50 && (
                      <Text fontSize="sm" color="orange.600" mt={1}>
                        {50 - (nonTargetCategory.words || []).length} words remaining
                      </Text>
                    )}
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

// Generate configuration for saving
const generateConfig = (formData: Partial<WordVolleyFormData>, user: any) => {
  // Create safe defaults for all required fields
  const safeFormData = {
    title: formData.title || 'Pong Game',
    description: formData.description || 'Educational Pong-style word categorization game',
    gameSpeed: formData.gameSpeed || 5,
    paddleSize: formData.paddleSize || 5,
    gameDuration: formData.gameDuration || 3,
    enableTextToSpeech: formData.enableTextToSpeech ?? true,
    targetCategory: formData.targetCategory || {
      id: 'target',
      name: 'Short A Words',
      words: ['cat', 'bat', 'hat', 'mat', 'rat'],
      isTarget: true
    },
    nonTargetCategory: formData.nonTargetCategory || {
      id: 'non-target',
      name: 'Other Words',
      words: ['dog', 'tree', 'house', 'car', 'sun'],
      isTarget: false
    },
    share: formData.share || false,
  };

  // Clean up empty words
  const cleanTargetWords = (safeFormData.targetCategory.words || []).filter(word => word && word.trim());
  const cleanNonTargetWords = (safeFormData.nonTargetCategory.words || []).filter(word => word && word.trim());

  return {
    title: safeFormData.title,
    type: 'word-volley' as const,
    description: safeFormData.description,
    timeLimit: safeFormData.gameDuration * 60, // Convert minutes to seconds
    targetScore: Math.max(cleanTargetWords.length, cleanNonTargetWords.length) * 10,
    gameSpeed: safeFormData.gameSpeed,
    paddleSize: safeFormData.paddleSize,
    gameDuration: safeFormData.gameDuration, // Store duration in minutes for display
    enableTextToSpeech: safeFormData.enableTextToSpeech, // Include TTS setting
    targetCategory: {
      ...safeFormData.targetCategory,
      words: cleanTargetWords
    },
    nonTargetCategory: {
      ...safeFormData.nonTargetCategory,
      words: cleanNonTargetWords
    },
    share: safeFormData.share,
    email: user?.email || '',
    userId: user?.uid || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
};

// Export the schema
export const wordVolleySchema = {
  gameType: 'word-volley' as const,
  title: 'Word Volley Game',
  description: 'Educational Pong-style word categorization game',
  sections: [
    {
      title: 'Game Settings',
      description: 'Configure the basic game settings and difficulty',
      fields: [
        {
          name: 'title',
          label: 'Game Title',
          type: 'text' as const,
          required: true,
          placeholder: 'Enter game title',
          defaultValue: 'Pong Game',
          helpText: 'Name for your Word Volley game'
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea' as const,
          placeholder: 'Enter game description',
          defaultValue: 'Educational Pong-style word categorization game',
          helpText: 'Brief description of the game'
        },

        {
          name: 'gameSpeed',
          label: 'Game Speed',
          type: 'select' as const,
          required: true,
          options: [
            { value: 2, label: 'Slow' },
            { value: 5, label: 'Medium' },
            { value: 8, label: 'Normal' },
            { value: 11, label: 'Fast' },
            { value: 15, label: 'Very Fast' }
          ],
          defaultValue: 5,
          width: '140px',
          helpText: 'Controls ball speed (Slow to Very Fast)'
        },
        {
          name: 'paddleSize',
          label: 'Paddle Size',
          type: 'select' as const,
          required: true,
          options: [
            { value: 1, label: 'Small' },
            { value: 3, label: 'Medium' },
            { value: 5, label: 'Normal' },
            { value: 7, label: 'Large' },
            { value: 10, label: 'Extra Large' }
          ],
          defaultValue: 5,
          width: '140px',
          helpText: 'Controls paddle size (Small to Extra Large)'
        },
        {
          name: 'gameDuration',
          label: 'Game Duration (minutes)',
          type: 'select' as const,
          required: true,
          options: [
            { value: 1, label: '1 minute' },
            { value: 2, label: '2 minutes' },
            { value: 3, label: '3 minutes' },
            { value: 4, label: '4 minutes' },
            { value: 5, label: '5 minutes' }
          ],
          defaultValue: 3,
          width: '140px',
          helpText: 'How long each game session lasts'
        },
        {
          name: 'enableTextToSpeech',
          label: 'Enable Text-to-Speech for words',
          type: 'switch' as const,
          defaultValue: true,
          helpText: 'Enable audio pronunciation of words during gameplay'
        }
      ]
    },
    {
      title: 'Word Categories',
      description: 'Configure target words (to hit) and non-target words (to avoid)',
      component: WordCategoryManager
    },
    {
      title: 'Sharing Settings',
      description: 'Control who can access this configuration',
      fields: [
        {
          name: 'share',
          label: 'Share this configuration with other teachers',
          type: 'switch' as const,
          defaultValue: false,
          helpText: 'Allow other teachers to use this game configuration'
        }
      ]
    }
  ],
  generateConfig
}; 