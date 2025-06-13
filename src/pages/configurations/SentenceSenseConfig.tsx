import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  HStack,
  VStack,
  Spinner,
  Center,
  Text,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@chakra-ui/react';
import { SentenceSenseConfig as SentenceSenseConfigType } from '../../types/game';
import { useAuth } from '../../contexts/AuthContext';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Import modular components
import { ConfigHeader } from '../../components/games/sentence-sense/ConfigHeader';
import { BasicSettings } from '../../components/games/sentence-sense/BasicSettings';
import { SentenceEditor } from '../../components/games/sentence-sense/SentenceEditor';
import { ConfigSummary } from '../../components/games/sentence-sense/ConfigSummary';
import { SharingSettings } from '../../components/games/sentence-sense/SharingSettings';
import { createNewSentence, validateConfig } from '../../components/games/sentence-sense/utils';
import { ConfigFormData, SentenceItem } from '../../components/games/sentence-sense/types';

const SentenceSenseConfig: React.FC = () => {
  const { templateId: id } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ConfigFormData>({
    title: '',
    description: '',
    difficulty: 'medium',
    timeLimit: 300,
    targetScore: 100,
    share: false,
    enableHints: true,
    maxAttempts: 3,
    correctFeedbackDuration: 'momentary',
    sentences: []
  });

  const { showPrompt, confirmNavigation, cancelNavigation, safeNavigate } = useUnsavedChanges(hasUnsavedChanges);
  const isNewConfig = !id || id === 'new';
  
  // Track if we're working with a template that should be treated as new
  const [isTemplateBasedNew, setIsTemplateBasedNew] = useState(false);

  useEffect(() => {
    if (id && id !== 'new' && currentUser) {
      checkForBlankTemplate(id);
    }
  }, [id, currentUser]);

  const checkForBlankTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      
      // First check if it's a blank template
      const blankTemplateDoc = await getDoc(doc(db, 'blankGameTemplates', templateId));
      if (blankTemplateDoc.exists()) {
        const templateData = blankTemplateDoc.data();
        
        setConfig(prev => ({
          ...prev,
          title: templateData.title || 'New Sentence Sense Game',
          enableHints: templateData.enableHints ?? true,
          maxAttempts: templateData.maxAttempts ?? 3,
          correctFeedbackDuration: templateData.correctFeedbackDuration ?? 'momentary',
          sentences: templateData.sentences || [],
          description: templateData.description || ''
        }));
        
        setHasUnsavedChanges(true); // Mark as unsaved since this is a template being used to create new config
        setIsTemplateBasedNew(true); // Mark as template-based new config
        setLoading(false);
        
        // Change the URL to 'new' since this is creating a new config from a template
        navigate('/configure/sentence-sense/new', { replace: true });
        return;
      } else {
        // If not a blank template, try to load as user config
        loadConfig(templateId);
      }
    } catch (error) {
      console.error('Error loading blank template:', error);
      loadConfig(templateId);
    }
  };

  const loadConfig = async (configId: string) => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const configDoc = await getDoc(doc(db, 'userGameConfigs', configId));
      if (configDoc.exists()) {
        const data = configDoc.data() as SentenceSenseConfigType;
        
        // Check if the current user owns this configuration
        if (data.userId !== currentUser.uid) {
          console.error('User does not own this configuration');
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to edit this configuration.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          navigate('/teacher');
          return;
        }
        
        setConfig({
          title: data.title || '',
          description: data.description || '',
          difficulty: data.difficulty || 'medium',
          timeLimit: data.timeLimit || 300,
          targetScore: data.targetScore || 100,
          share: data.share || false,
          enableHints: data.enableHints ?? true,
          maxAttempts: data.maxAttempts ?? 3,
          correctFeedbackDuration: data.correctFeedbackDuration || 'momentary',
          sentences: data.sentences || []
        });
        setHasUnsavedChanges(false);
      } else {
        console.error('Configuration document does not exist:', configId);
        toast({
          title: 'Configuration not found',
          description: 'The requested configuration does not exist or may have been deleted.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        navigate('/teacher');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast({
        title: 'Error loading configuration',
        description: 'There was an error loading the configuration. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      navigate('/teacher');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!currentUser) {
      console.error('No current user when trying to save config');
      return;
    }

    const validationErrors = validateConfig(config.sentences, config.title);
    if (validationErrors.length > 0) {
      toast({
        title: 'Validation Error',
        description: validationErrors[0],
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setSaving(true);
    try {
      let docRef;
      if (isNewConfig || isTemplateBasedNew) {
        const configData = {
          type: 'sentence-sense' as const,
          ...config,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        docRef = await addDoc(collection(db, 'userGameConfigs'), configData);
        setIsTemplateBasedNew(false); // Reset the flag after successful creation
        navigate(`/configure/sentence-sense/${docRef.id}`, { replace: true });
      } else {
        // Additional safety check: verify the document exists before trying to update
        const existingDoc = await getDoc(doc(db, 'userGameConfigs', id!));
        if (!existingDoc.exists()) {
          // Document doesn't exist, treat this as a new config instead
          console.warn('Attempted to update non-existent document, creating new instead');
          const configData = {
            type: 'sentence-sense' as const,
            ...config,
            userId: currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          docRef = await addDoc(collection(db, 'userGameConfigs'), configData);
          navigate(`/configure/sentence-sense/${docRef.id}`, { replace: true });
        } else {
          const configData = {
            type: 'sentence-sense' as const,
            ...config,
            userId: currentUser.uid,
            updatedAt: serverTimestamp()
          };
          await updateDoc(doc(db, 'userGameConfigs', id!), configData);
        }
      }

      setHasUnsavedChanges(false);
      toast({
        title: 'Configuration saved successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error saving configuration',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<ConfigFormData>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const addSentence = () => {
    const newSentence = createNewSentence();
    updateConfig({
      sentences: [...config.sentences, newSentence]
    });
  };

  const updateSentence = (index: number, updates: Partial<SentenceItem>) => {
    const updatedSentences = [...config.sentences];
    updatedSentences[index] = { ...updatedSentences[index], ...updates };
    updateConfig({ sentences: updatedSentences });
  };

  const removeSentence = (index: number) => {
    const updatedSentences = config.sentences.filter((_, i) => i !== index);
    updateConfig({ sentences: updatedSentences });
  };

  if (loading) {
    return (
      <Box minH="100vh" p={6}>
        <Center h="200px">
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" thickness="4px" />
            <Text>Loading configuration...</Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box minH="100vh" p={6} maxW="4xl" mx="auto">
      <VStack spacing={6} align="stretch">
        <ConfigHeader />
        
        <BasicSettings config={config} onUpdate={updateConfig} />
        
        <SentenceEditor
          config={config}
          onUpdate={updateConfig}
          onAddSentence={addSentence}
          onUpdateSentence={updateSentence}
          onRemoveSentence={removeSentence}
        />
        
        <ConfigSummary config={config} onUpdate={updateConfig} />
        
        <SharingSettings config={config} onUpdate={updateConfig} />

        {/* Action Buttons */}
        <HStack spacing={4} justify="flex-end">
          <Button
            onClick={() => safeNavigate('/')}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            onClick={saveConfig}
            colorScheme="blue"
            isLoading={saving}
            loadingText="Saving..."
          >
            Save Game Configuration
          </Button>
        </HStack>
      </VStack>

      {/* Unsaved Changes Modal */}
      <Modal isOpen={showPrompt} onClose={cancelNavigation} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Unsaved Changes</ModalHeader>
          <ModalBody>
            You have unsaved changes. Are you sure you want to leave this page?
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={cancelNavigation}>
              Stay on This Page
            </Button>
            <Button colorScheme="red" onClick={confirmNavigation}>
              Leave Without Saving
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SentenceSenseConfig; 