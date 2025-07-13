import React, { useEffect } from 'react';
import { ConfigSchema } from '../components/common/ConfigurationFramework';
import { serverTimestamp } from 'firebase/firestore';
import {
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Textarea,
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
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';

// Custom component for sentence management
const SentenceManager: React.FC<{
  formData: any;
  updateField: (fieldName: string, value: any) => void;
  errors: Record<string, string>;
  saveAttempted: boolean;
}> = ({ formData, updateField, errors, saveAttempted }) => {
  // Initialize sentences field if it doesn't exist
  useEffect(() => {
    if (formData && !formData.sentences) {
      updateField('sentences', []);
    }
  }, [formData, updateField]);

  // Get sentences with safe fallback
  const sentences = formData?.sentences || [];
  
  const addSentence = () => {
    // Check if we're at maximum capacity
    if (sentences.length >= 50) {
      return;
    }
    
    const newSentence = {
      id: Date.now().toString(),
      original: '',
      difficulty: 'medium'
    };
    updateField('sentences', [...sentences, newSentence]);
  };
  
  const updateSentence = (index: number, field: string, value: string) => {
    const updatedSentences = [...sentences];
    updatedSentences[index] = { ...updatedSentences[index], [field]: value };
    updateField('sentences', updatedSentences);
  };
  
  const removeSentence = (index: number) => {
    if (sentences.length > 0) {
      const updatedSentences = sentences.filter((_: any, i: number) => i !== index);
      updateField('sentences', updatedSentences);
    }
  };
  
  return (
    <VStack spacing={6} align="stretch">
      <FormControl>
        <FormLabel mb={3}>Sentences</FormLabel>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Add sentences for students to arrange from scrambled words
        </Text>
      </FormControl>
      
      {/* Sentence Management */}
      <VStack spacing={4} align="stretch">
        {sentences.length === 0 ? (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <AlertDescription>
              No sentences added yet. Click "Add Sentence" to get started.
            </AlertDescription>
          </Alert>
        ) : (
          <Accordion allowMultiple>
            {sentences.map((sentence: any, index: number) => (
              <AccordionItem key={sentence.id} border="1px" borderColor="gray.200" borderRadius="md" mb={2}>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <HStack justify="space-between">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">
                          Sentence {index + 1}
                          {sentence.original && (
                            <Badge ml={2} colorScheme="blue" variant="outline">
                              {sentence.original.split(' ').length} words
                            </Badge>
                          )}
                        </Text>
                        {sentence.original && (
                          <Text fontSize="sm" color="gray.600" noOfLines={1}>
                            {sentence.original}
                          </Text>
                        )}
                      </VStack>
                      <IconButton
                        aria-label="Delete sentence"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSentence(index);
                        }}
                      />
                    </HStack>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack spacing={4} align="stretch">
                    <FormControl isRequired>
                      <FormLabel>Sentence</FormLabel>
                      <Textarea
                        value={sentence.original || ''}
                        onChange={(e) => updateSentence(index, 'original', e.target.value)}
                        placeholder="Enter the complete sentence (e.g., 'The quick brown fox jumps over the lazy dog')"
                        rows={2}
                      />
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        This sentence will be broken into words and scrambled for the student to rearrange.
                      </Text>
                    </FormControl>

                    {sentence.original && (
                      <Box bg="gray.50" p={3} borderRadius="md">
                        <Text fontSize="sm" fontWeight="medium" mb={2}>Preview:</Text>
                        <Text fontSize="sm" color="gray.600">
                          <strong>Words to arrange:</strong> {sentence.original.split(' ').map((word: string, i: number) => (
                            <Badge key={i} mr={1} mb={1} colorScheme="blue" variant="outline" style={{ textTransform: 'none' }}>
                              {word}
                            </Badge>
                          ))}
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        )}
        
        <Button
          leftIcon={<AddIcon />}
          onClick={addSentence}
          variant="outline"
          colorScheme="blue"
          size="sm"
          alignSelf="flex-start"
          isDisabled={sentences.length >= 50}
        >
          Add Sentence
        </Button>
        
        <Flex justify="space-between" fontSize="sm" color="gray.500">
          <Text>
            {sentences.length === 0 ? 'No sentences added yet' : 
             sentences.length === 1 ? '1 sentence added' : 
             `${sentences.length} sentences added`}
          </Text>
          <Text>
            {sentences.length >= 50 ? 'Maximum reached' : `${50 - sentences.length} remaining`}
          </Text>
        </Flex>
      </VStack>
      
      {/* Summary Statistics */}
      {sentences.length > 0 && (
        <Box bg="gray.50" p={4} borderRadius="md">
          <Text fontSize="sm" fontWeight="medium" mb={2}>Configuration Summary:</Text>
          <VStack spacing={1} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm">Total Sentences:</Text>
              <Badge colorScheme="blue">{sentences.length}</Badge>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="sm">Average Words per Sentence:</Text>
              <Badge colorScheme="green">
                {Math.round(sentences.reduce((acc: number, sentence: any) => 
                  acc + (sentence.original?.split(' ').length || 0), 0) / sentences.length)}
              </Badge>
            </HStack>
          </VStack>
        </Box>
      )}
      
      {/* Validation Errors */}
      {errors?.sentences && (
        <Alert status="error">
          <AlertIcon />
          <AlertDescription>{errors.sentences}</AlertDescription>
        </Alert>
      )}
    </VStack>
  );
};

export const sentenceSenseSchema: ConfigSchema = {
  gameType: 'sentence-sense',
  title: 'Sentence Sense',
  description: 'Create word arrangement games where students arrange scrambled words into correct sentences.',
  
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
          defaultValue: 'Sentence Sense Game'
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
          helpText: 'Allow students to hear words and sentences spoken aloud'
        }
      ]
    },
    {
      title: 'Sentences',
      description: 'Create your sentence arrangement challenges',
      fields: [],
      component: SentenceManager
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
    // Handle case where formData is undefined or null
    if (!formData) {
      return 'Configuration data is not available';
    }
    
    // Basic validation
    if (!formData.title || !formData.title.trim()) {
      return 'Please enter a title for your game';
    }
    
    // Validate sentences
    if (!formData.sentences || formData.sentences.length === 0) {
      return 'Please add at least one sentence';
    }
    
    // Check sentence count range (1-50)
    if (formData.sentences.length > 50) {
      return 'Maximum 50 sentences allowed';
    }
    
    // Check if all sentences have content
    for (let i = 0; i < formData.sentences.length; i++) {
      const sentence = formData.sentences[i];
      if (!sentence.original || !sentence.original.trim()) {
        return `Sentence ${i + 1}: Please enter sentence text`;
      }
      if (sentence.original.trim().split(' ').length < 2) {
        return `Sentence ${i + 1}: Sentence must contain at least 2 words`;
      }
    }
    
    return undefined;
  },
  
  generateConfig: (formData, currentUser) => {
    // Handle case where formData is undefined or null
    if (!formData) {
      formData = {};
    }
    
    // CRITICAL: Force initialization of required fields if they don't exist
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
      title: 'Sentence Sense Game',
      showHints: true,
      enableTextToSpeech: true,
      share: false,
      sentences: [],
      ...formData // Override with actual values if they exist
    };
    
    // Ensure all boolean fields have proper default values
    const showHints = safeFormData.showHints !== undefined ? Boolean(safeFormData.showHints) : true;
    const enableTextToSpeech = safeFormData.enableTextToSpeech !== undefined ? Boolean(safeFormData.enableTextToSpeech) : true;
    const share = safeFormData.share !== undefined ? Boolean(safeFormData.share) : false;
    
    // Convert sentences to the format expected by the game
    const sentences = (safeFormData.sentences || []).map((sentence: any, index: number) => ({
      id: sentence.id || index.toString(),
      original: sentence.original,
      definition: sentence.definition || '',
      difficulty: sentence.difficulty || 'medium'
    }));
    
    // Create final config object
    const config = {
      title: safeFormData.title || 'Sentence Sense Game',
      type: 'sentence-sense' as const,
      description: `Sentence arrangement game with ${sentences.length} ${sentences.length === 1 ? 'sentence' : 'sentences'}`,
      difficulty: 'medium' as const,
      timeLimit: 300,
      targetScore: sentences.length * 100,
      maxAttempts: 3,
      showHints: showHints,
      enableTextToSpeech: enableTextToSpeech,
      sentences: sentences,
      share: share,
      email: currentUser?.email,
      userId: currentUser?.uid,
      createdAt: serverTimestamp()
    };
    
    return config;
  }
}; 