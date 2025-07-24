import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '@chakra-ui/react';
import { ConfigurationFramework } from '../../components/common/ConfigurationFramework';
import { wordVolleySchema } from '../../schemas/wordVolleySchema';

interface OutletContextType {
  onError?: (message: string) => void;
}

interface WordVolleyConfigDoc {
  id: string;
  title?: string;
  description?: string;
  gameSpeed?: number;
  paddleSize?: number;
  gameDuration?: number;
  enableTextToSpeech?: boolean;
  targetCategory?: any;
  nonTargetCategory?: any;
  share?: boolean;
  userId?: string;
  email?: string;
  [key: string]: any;
}

const WordVolleyConfig = () => {
  const navigate = useNavigate();
  const { onError } = useOutletContext<OutletContextType>();
  const { templateId } = useParams();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [initialData, setInitialData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load configuration when templateId is provided
  useEffect(() => {
    const loadConfiguration = async () => {
      if (!templateId || templateId === 'new') {
        setIsEditing(false);
        setInitialData(null);
        return;
      }

      if (!currentUser) {
        console.warn('No current user available for loading configuration');
        return;
      }

      setLoading(true);
      
      try {
        // Check if this is a copy operation
        const urlParams = new URLSearchParams(window.location.search);
        const isCopy = urlParams.get('copy') === 'true';
        
        if (isCopy) {
          setIsEditing(false); // Copying creates a new document
        } else {
          setIsEditing(true); // Regular editing
        }

        // Search multiple collections for the configuration
        const collections = [
          'wordVolleyConfigs',
          'gameConfigurations', 
          'templates',
          'sharedTemplates'
        ];

        let configDoc: WordVolleyConfigDoc | null = null;
        let foundCollection = '';

        for (const collectionName of collections) {
          try {
            const docRef = doc(db, collectionName, templateId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              configDoc = { id: docSnap.id, ...docSnap.data() } as WordVolleyConfigDoc;
              foundCollection = collectionName;
              console.log(`✅ Found Word Volley config in ${collectionName}:`, configDoc);
              break;
            }
          } catch (error) {
            console.warn(`Failed to check ${collectionName}:`, error);
            continue;
          }
        }

        if (!configDoc) {
          console.error('❌ Configuration not found in any collection');
          toast({
            title: 'Configuration Not Found',
            description: 'The requested game configuration could not be found.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          navigate('/');
          return;
        }

        // Check permissions for shared templates
        if (foundCollection === 'sharedTemplates' && configDoc.userId !== currentUser.uid) {
          console.log('✅ Loading shared template (read-only access)');
          setIsEditing(false); // Force copy mode for shared templates
        } else if (configDoc.userId && configDoc.userId !== currentUser.uid) {
          console.error('❌ Permission denied: User does not own this configuration');
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to edit this configuration.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          navigate('/');
          return;
        }

        // Transform the loaded data to match the form structure
        const formData = {
          title: configDoc.title || 'Word Volley Game',
          description: configDoc.description || '',
          gameSpeed: configDoc.gameSpeed || 5,
          paddleSize: configDoc.paddleSize || 5,
          gameDuration: configDoc.gameDuration || 3,
          enableTextToSpeech: configDoc.enableTextToSpeech ?? true,
          targetCategory: configDoc.targetCategory || {
            id: 'target',
            name: 'Target Words',
            words: [],
            isTarget: true
          },
          nonTargetCategory: configDoc.nonTargetCategory || {
            id: 'non-target',
            name: 'Non-Target Words', 
            words: [],
            isTarget: false
          },
          share: configDoc.share || false
        };

        console.log('📝 Prepared form data:', formData);
        setInitialData(formData);

      } catch (error) {
        console.error('❌ Error loading Word Volley configuration:', error);
        toast({
          title: 'Error Loading Configuration',
          description: 'Failed to load the game configuration. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadConfiguration();
  }, [templateId, currentUser, navigate, toast]);

  const handleCancel = () => {
    navigate('/');
  };

  if (loading) {
    return <div>Loading configuration...</div>;
  }

  return (
    <ConfigurationFramework
      schema={wordVolleySchema}
      onCancel={handleCancel}
      initialData={initialData}
      isEditing={isEditing}
      documentId={isEditing ? templateId : undefined}
    />
  );
};

export default WordVolleyConfig; 