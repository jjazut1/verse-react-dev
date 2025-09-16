import React from 'react';
import { useToast, Select } from '@chakra-ui/react';
import { generateCategoryItems } from '../services/categoryAgent';
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
  RadioGroup,
  Radio,
  Stack,
  Flex,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import SlateEditor from '../components/SlateEditor';

// Custom component for anagram word/definition management
const AnagramManager: React.FC<{
  formData: any;
  updateField: (fieldName: string, value: any) => void;
  errors: Record<string, string>;
  saveAttempted: boolean;
}> = ({ formData, updateField, errors }) => {
  const toast = useToast();
  // Initialize fields SYNCHRONOUSLY before component renders
  if (formData.withDefinitions === undefined) {
    updateField('withDefinitions', false);
    formData.withDefinitions = false; // Also set it directly to avoid race condition
  }
  
  if (!formData.anagrams || formData.anagrams.length === 0) {
    const defaultAnagrams = [{ id: '1', word: 'listen', definition: 'To hear with attention' }];
    updateField('anagrams', defaultAnagrams);
    formData.anagrams = defaultAnagrams; // Also set it directly to avoid race condition
  } else {
    // CRITICAL FIX: Check if anagrams have 'original' field instead of 'word' (from saved configs)
    const needsConversion = formData.anagrams.some((anagram: any) => anagram.original && !anagram.word);
    if (needsConversion) {
      const convertedAnagrams = formData.anagrams.map((anagram: any) => ({
        id: anagram.id || Date.now().toString(),
        word: anagram.original || anagram.word || '', // Use 'original' field if 'word' doesn't exist
        definition: anagram.definition || ''
      }));
      updateField('anagrams', convertedAnagrams);
      formData.anagrams = convertedAnagrams;
    }
  }

  // Additional useEffect for safety
  React.useEffect(() => {
    if (formData.withDefinitions === undefined) {
      updateField('withDefinitions', false);
    }
    if (!formData.anagrams || formData.anagrams.length === 0) {
      updateField('anagrams', [{ id: '1', word: 'listen', definition: 'To hear with attention' }]);
    } else {
      // Check for format conversion in useEffect as well
      const needsConversion = formData.anagrams.some((anagram: any) => anagram.original && !anagram.word);
      if (needsConversion) {
        const convertedAnagrams = formData.anagrams.map((anagram: any) => ({
          id: anagram.id || Date.now().toString(),
          word: anagram.original || anagram.word || '',
          definition: anagram.definition || ''
        }));
        updateField('anagrams', convertedAnagrams);
      }
    }
  }, [formData.withDefinitions, formData.anagrams]);
  
  const withDefinitions = formData.withDefinitions ?? false;
  const anagrams = formData.anagrams || [{ id: '1', word: 'LISTEN', definition: 'To hear with attention' }];

  // AI generator state
  const [genPrompt, setGenPrompt] = React.useState('');
  const [genReplace, setGenReplace] = React.useState(false); // false = append (default)
  const [genLoading, setGenLoading] = React.useState(false);

  const handleGenerate = async () => {
    if (!genPrompt.trim()) {
      toast({ title: 'Enter a prompt to generate words', status: 'warning', duration: 2500 });
      return;
    }
    setGenLoading(true);
    try {
      const mode = withDefinitions ? 'word_defs' : 'items';
      const items = await generateCategoryItems({ prompt: genPrompt.trim(), count: 5, mode });
      // eslint-disable-next-line no-console
      
      let generated: any[] = [];
      if (withDefinitions) {
        let pairs = (items as any[]).filter((o) => o && typeof (o as any).word === 'string' && typeof (o as any).definition === 'string');
        // Fallback: try to split simple "word - definition" strings
        if (pairs.length === 0) {
          const asStrings = (items as any[]).map((s) => String(s)).filter(Boolean);
          pairs = asStrings.map((l) => {
            const m = l.split(/\s*[-:–]\s+/);
            return { word: (m[0] || '').trim(), definition: (m[1] || '').trim() };
          }).filter((o) => o.word && o.definition);
        }
        generated = pairs.map((o) => ({ id: Date.now().toString() + Math.random(), word: String(o.word).trim(), definition: o.definition || '' }));
      } else {
        const words = (items as any[]).map((s) => String(s)).filter(Boolean);
        generated = words.map((w) => ({ id: Date.now().toString() + Math.random(), word: String(w).trim(), definition: '' }));
      }
      const next = genReplace ? generated : [...anagrams, ...generated];
      if (generated.length === 0) {
        toast({ title: 'No words generated', status: 'info', duration: 2000 });
        return;
      }
      updateField('anagrams', next.slice(0, 100));
      toast({ title: 'Generated', status: 'success', duration: 1500 });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Anagram generate failed', e);
      toast({ title: 'Generation failed', status: 'error', duration: 3000 });
    } finally {
      setGenLoading(false);
    }
  };
  
  const handleDefinitionModeChange = (value: string) => {
    updateField('withDefinitions', value === 'true');
  };
  
  const handleWordChange = (index: number, value: string) => {
    const newAnagrams = [...anagrams];
    newAnagrams[index].word = value;
    updateField('anagrams', newAnagrams);
  };
  
  const handleDefinitionChange = (index: number, value: string) => {
    const newAnagrams = [...anagrams];
    newAnagrams[index].definition = value;
    updateField('anagrams', newAnagrams);
  };
  
  const addAnagram = () => {
    const newAnagram = {
      id: Date.now().toString(),
      word: '',
      definition: ''
    };
    updateField('anagrams', [...anagrams, newAnagram]);
  };
  
  const removeAnagram = (index: number) => {
    if (anagrams.length > 1) {
      const newAnagrams = anagrams.filter((_: any, i: number) => i !== index);
      updateField('anagrams', newAnagrams);
    }
  };
  
  return (
    <VStack spacing={6} align="stretch">
      {/* Definition Mode Selection */}
      <FormControl>
        <FormLabel mb={3}>Anagram Puzzles</FormLabel>
        <RadioGroup 
          value={withDefinitions ? 'true' : 'false'} 
          onChange={handleDefinitionModeChange}
        >
          <Stack direction="row" spacing={8}>
            <Radio value="false">Without definitions</Radio>
            <Radio value="true">With definitions</Radio>
          </Stack>
        </RadioGroup>
      </FormControl>
      
      {/* AI Assistant */}
      <FormControl>
        <FormLabel>Use AI to Generate Words (Optional)</FormLabel>
        <HStack align="stretch" spacing={2}>
          <Input
            placeholder="Describe the words (e.g., 2nd grade animals vocabulary)"
            value={genPrompt}
            onChange={(e) => setGenPrompt(e.target.value)}
          />
          <Select width="130px" value={genReplace ? 'replace' : 'append'} onChange={(e) => setGenReplace(e.target.value === 'replace')}>
            <option value="append">Append</option>
            <option value="replace">Replace</option>
          </Select>
          <Button colorScheme="purple" isLoading={genLoading} onClick={handleGenerate}>Generate</Button>
        </HStack>
      </FormControl>

      {/* Word and Definition Management */}
      <VStack spacing={4} align="stretch">
        {anagrams.map((anagram: any, index: number) => (
          <Box key={anagram.id} p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
            <HStack spacing={4} align="start">
              <Text fontWeight="bold" minW="20px">{index + 1}.</Text>
              <VStack spacing={3} flex={1}>
                <FormControl>
                  <FormLabel fontSize="sm">Word</FormLabel>
                  <Input
                    value={anagram.word}
                    onChange={(e) => handleWordChange(index, e.target.value)}
                    placeholder="Enter word"
                    className="apple-input"
                  />
                </FormControl>
                {withDefinitions && (
                  <FormControl>
                    <FormLabel fontSize="sm">Definition</FormLabel>
                    <Box border="1px" borderColor="gray.200" borderRadius="md">
                      <SlateEditor
                        value={anagram.definition}
                        onChange={(value) => handleDefinitionChange(index, value)}
                        placeholder="Enter definition"
                        compact={true}
                        showToolbar={true}
                        className="apple-input"
                      />
                    </Box>
                  </FormControl>
                )}
              </VStack>
              {anagrams.length > 1 && (
                <IconButton
                  icon={<DeleteIcon />}
                  onClick={() => removeAnagram(index)}
                  colorScheme="red"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove anagram"
                />
              )}
            </HStack>
          </Box>
        ))}
        
        <Button
          leftIcon={<AddIcon />}
          onClick={addAnagram}
          variant="outline"
          colorScheme="blue"
          size="sm"
          alignSelf="flex-start"
        >
          Add a new word
        </Button>
        
        <Flex justify="flex-end" fontSize="sm" color="gray.500">
          min 1 max 100
        </Flex>
      </VStack>
      
      {/* Validation Errors */}
      {errors.anagrams && (
        <Alert status="error">
          <AlertIcon />
          <AlertDescription>{errors.anagrams}</AlertDescription>
        </Alert>
      )}
    </VStack>
  );
};

export const anagramSchema: ConfigSchema = {
  gameType: 'anagram',
  title: 'Anagram',
  description: 'Create letter-to-word anagram puzzles for your students to solve.',
  
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
          placeholder: 'Enter game title',
          defaultValue: 'Anagram Game'
        },
        {
          name: 'showHints',
          label: 'Show Hint Button',
          type: 'switch',
          defaultValue: true,
          helpText: 'Allow students to get hints during the game'
        },
        {
          name: 'enableTextToSpeech',
          label: 'Enable Text-to-Speech',
          type: 'switch',
          defaultValue: true,
          helpText: 'Allow students to hear words and definitions spoken aloud'
        }
      ]
    },
    {
      title: 'Anagram Puzzles',
      description: 'Create your anagram word puzzles',
      fields: [],
      component: AnagramManager
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
    // Basic validation
    if (!formData.title || !formData.title.trim()) {
      return 'Please enter a title for your game';
    }
    
    // Validate anagrams
    if (!formData.anagrams || formData.anagrams.length === 0) {
      return 'Please add at least one anagram word';
    }
    
    // Check if all anagrams have words
    for (const anagram of formData.anagrams) {
      if (!anagram.word || !anagram.word.trim()) {
        return 'All anagrams must have a word';
      }
      if (formData.withDefinitions && (!anagram.definition || !anagram.definition.trim())) {
        return 'All anagrams must have a definition when "With definitions" is selected';
      }
    }
    
    return undefined;
  },
  
  generateConfig: (formData, currentUser) => {
    // CRITICAL: Force initialization of required fields if they don't exist
    if (formData.withDefinitions === undefined) {
      formData.withDefinitions = false;
    }
    
    if (formData.showHints === undefined) {
      formData.showHints = true;
    }
    
    if (formData.enableTextToSpeech === undefined) {
      formData.enableTextToSpeech = true;
    }
    
    if (formData.share === undefined) {
      formData.share = false;
    }
    
    // Initialize formData fields if they don't exist (extra safety)
    const safeFormData = {
      title: 'Anagram Game',
      withDefinitions: false,
      showHints: true,
      enableTextToSpeech: true,
      share: false,
      anagrams: [{ id: '1', word: 'LISTEN', definition: 'To hear with attention' }],
      ...formData // Override with actual values if they exist
    };
    
    // Ensure all boolean fields have proper default values
    const withDefinitions = safeFormData.withDefinitions !== undefined ? Boolean(safeFormData.withDefinitions) : false;
    const showHints = safeFormData.showHints !== undefined ? Boolean(safeFormData.showHints) : true;
    const enableTextToSpeech = safeFormData.enableTextToSpeech !== undefined ? Boolean(safeFormData.enableTextToSpeech) : true;
    const share = safeFormData.share !== undefined ? Boolean(safeFormData.share) : false;
    
    // Convert anagrams to the format expected by the game
    const anagrams = (safeFormData.anagrams || []).map((anagram: any, index: number) => ({
      id: anagram.id || index.toString(),
      original: anagram.word,
      definition: anagram.definition || '',
      type: 'word' as const
    }));
    
    // Create final config object
    const config = {
      title: safeFormData.title || 'Anagram Game',
      type: 'anagram' as const,
      description: `Anagram game with ${anagrams.length} ${anagrams.length === 1 ? 'puzzle' : 'puzzles'}`,
      difficulty: 'medium' as const,
      timeLimit: 300,
      targetScore: anagrams.length * 100,
      maxAttempts: 3,
      shuffleIntensity: 'medium' as const,
      gameMode: 'letters-to-word',
      showDefinitions: withDefinitions,
      enableHints: showHints,
      enableTextToSpeech: enableTextToSpeech,
      correctFeedbackDuration: 'momentary',
      anagrams: anagrams,
      share: share,
      email: currentUser?.email,
      userId: currentUser?.uid,
      createdAt: serverTimestamp()
    };

    
    return config;
  }
}; 