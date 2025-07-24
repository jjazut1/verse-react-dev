import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@chakra-ui/react';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ConfigurationFramework } from '../../components/common/ConfigurationFramework';
import { whackAMoleSchema } from '../../schemas/whackAMoleSchema';

// Helper function to generate consistent IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface WhackAMoleConfigDoc {
  id: string;
  title?: string;
  gameTime?: number;
  speed?: number;
  gameSpeed?: number;
  instructions?: string;
  pointsPerHit?: number;
  penaltyPoints?: number;
  bonusPoints?: number;
  bonusThreshold?: number;
  categories?: any[];
  richCategories?: any[];
  share?: boolean;
  userId?: string;
  email?: string;
  [key: string]: any;
}

const WhackAMoleConfig: React.FC = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  
  const [initialData, setInitialData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopyOperation, setIsCopyOperation] = useState(false);

  // Load configuration when templateId is provided
  useEffect(() => {
    const loadConfiguration = async () => {
      if (!templateId || templateId === 'new') {
        setIsEditing(false);
        setInitialData({});
        return;
      }

      if (!currentUser) {
        console.warn('No current user available for loading configuration');
        return;
      }

      setIsLoading(true);
      
      try {
        // Check if this is a copy operation
        const urlParams = new URLSearchParams(window.location.search);
        const isCopy = urlParams.get('copy') === 'true';
        setIsCopyOperation(isCopy);
        
        if (isCopy) {
          setIsEditing(false); // Copying creates a new document
        } else {
          setIsEditing(true); // Regular editing
        }

        // Search multiple collections for the configuration
        const collections = [
          'userGameConfigs',
          'gameConfigs', 
          'blankGameTemplates',
          'categoryTemplates'
        ];

        let configDoc: WhackAMoleConfigDoc | null = null;
        let foundCollection = '';
        let isAdminConfig = false;

        for (const collectionName of collections) {
          try {
            const docRef = doc(db, collectionName, templateId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              configDoc = { id: docSnap.id, ...docSnap.data() } as WhackAMoleConfigDoc;
              foundCollection = collectionName;
              isAdminConfig = collectionName === 'gameConfigs' || collectionName === 'blankGameTemplates' || collectionName === 'categoryTemplates';
              console.log(`✅ Found Whack-a-Mole config in ${collectionName}:`, configDoc);
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
          navigate('/configure/whack-a-mole');
          return;
        }

        // Check permissions for shared templates and admin configs
        if (isCopy) {
          setIsEditing(false);
          toast({
            title: "Creating a copy",
            description: "Creating a new copy of this Whack-a-Mole configuration.",
            status: "info",
            duration: 5000,
          });
        } else if (isAdminConfig) {
          setIsEditing(false);
          setIsCopyOperation(true);
          toast({
            title: "Creating a copy",
            description: "This is an official template. You'll create a copy that you can customize.",
            status: "info",
            duration: 5000,
          });
        } else if (configDoc.userId && configDoc.userId !== currentUser.uid) {
          setIsEditing(false);
          setIsCopyOperation(true);
          toast({
            title: "Creating a copy",
            description: "You're not the owner of this configuration, so you'll create a copy instead.",
            status: "info",
            duration: 5000,
          });
        }

        // Transform the loaded data to match the form structure
        const shouldCopy = isCopy || isAdminConfig || (configDoc.userId && configDoc.userId !== currentUser.uid);
        
        const formData: any = {
          title: shouldCopy ? `Copy of ${configDoc.title || 'Whack-a-Mole Game'}` : (configDoc.title || 'Whack-a-Mole Game'),
          gameTime: configDoc.gameTime || 30,
          gameSpeed: configDoc.speed || configDoc.gameSpeed || 2,
          instructions: configDoc.instructions || '',
          pointsPerHit: configDoc.pointsPerHit || 10,
          penaltyPoints: configDoc.penaltyPoints || 5,
          bonusPoints: configDoc.bonusPoints || 10,
          bonusThreshold: configDoc.bonusThreshold || 3,
          categories: [] as any[],
          share: shouldCopy ? false : (configDoc.share || false)
        };

        // Transform legacy categories format to new format if needed
        if (configDoc.categories && Array.isArray(configDoc.categories)) {
          formData.categories = configDoc.categories.map((category: any, index: number) => {
            // If category has 'words' array (legacy format), convert to 'items' array
            if (category.words && Array.isArray(category.words) && !category.items) {
              console.log('Converting legacy category format for:', category.title, 'with words:', category.words);
              return {
                id: index === 0 ? 'whack-these' : 'do-not-whack',
                title: index === 0 ? 'Whack These' : 'Do Not Whack These',
                items: category.words.map((word: string) => ({
                  id: generateId(),
                  content: word,
                  text: word
                }))
              };
            }
            
            // If category already has items, ensure they have proper structure
            if (category.items && Array.isArray(category.items)) {
              console.log('Ensuring proper structure for category:', category.title, 'with items:', category.items);
              return {
                id: index === 0 ? 'whack-these' : 'do-not-whack',
                title: index === 0 ? 'Whack These' : 'Do Not Whack These',
                items: category.items.map((item: any) => ({
                  id: item.id || generateId(),
                  content: typeof item.content === 'string' ? item.content : (item.text || item),
                  text: typeof item.text === 'string' ? item.text : (item.content || item)
                }))
              };
            }
            
            // Fallback for categories without words or items
            console.log('Creating fallback category for:', category.title);
            return {
              id: index === 0 ? 'whack-these' : 'do-not-whack',
              title: index === 0 ? 'Whack These' : 'Do Not Whack These',
              items: [{
                id: generateId(),
                content: '',
                text: ''
              }]
            };
          });
        } else if (configDoc.richCategories && Array.isArray(configDoc.richCategories)) {
          // Handle richCategories format
          formData.categories = configDoc.richCategories.map((category: any, index: number) => ({
            id: index === 0 ? 'whack-these' : 'do-not-whack',
            title: index === 0 ? 'Whack These' : 'Do Not Whack These',
            items: (category.items || []).map((item: any) => ({
              id: item.id || generateId(),
              content: typeof item.content === 'string' ? item.content : (item.text || ''),
              text: typeof item.text === 'string' ? item.text : (item.content || '')
            }))
          }));
        }

        // Ensure we have exactly 2 categories
        if (formData.categories.length === 0) {
          formData.categories = [
            {
              id: 'whack-these',
              title: 'Whack These',
              items: [{ id: generateId(), content: '', text: '' }]
            },
            {
              id: 'do-not-whack',
              title: 'Do Not Whack These',
              items: [{ id: generateId(), content: '', text: '' }]
            }
          ];
        } else if (formData.categories.length === 1) {
          formData.categories.push({
            id: 'do-not-whack',
            title: 'Do Not Whack These',
            items: [{ id: generateId(), content: '', text: '' }]
          });
        }

        console.log('📝 Prepared Whack-a-Mole form data:', formData);
        setInitialData(formData);

      } catch (error) {
        console.error('❌ Error loading Whack-a-Mole configuration:', error);
        toast({
          title: 'Error Loading Configuration',
          description: 'Failed to load the game configuration. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/configure/whack-a-mole');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfiguration();
  }, [templateId, currentUser, navigate, toast]);

  const handleCancel = () => {
    navigate('/');
  };

  if (isLoading) {
    return <div>Loading configuration...</div>;
  }

  return (
    <ConfigurationFramework 
      schema={whackAMoleSchema}
      initialData={initialData}
      isEditing={isEditing}
      documentId={isEditing && !isCopyOperation ? templateId : undefined}
      onCancel={handleCancel}
    />
  );
};

export default WhackAMoleConfig; 