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

const WhackAMoleConfig: React.FC = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  
  const [initialData, setInitialData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopyOperation, setIsCopyOperation] = useState(false);

  // Load template data if templateId is provided
  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId) return;
      
      // Check if this is a copy operation
      const urlParams = new URLSearchParams(window.location.search);
      const isCopy = urlParams.get('copy') === 'true';
      setIsCopyOperation(isCopy);
      
      setIsLoading(true);
      try {
        // Try multiple collections like other configs
        const collections = ['userGameConfigs', 'gameConfigs', 'blankGameTemplates', 'categoryTemplates'];
        let docSnap = null;
        let foundCollection = '';

        for (const collectionName of collections) {
          const docRef = doc(db, collectionName, templateId);
          docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            foundCollection = collectionName;
            break;
          }
        }

        if (docSnap && docSnap.exists()) {
          const data = docSnap.data();
          
          // Check permissions and copy logic
          if (isCopy) {
            setIsEditing(false);
            toast({
              title: "Creating a copy",
              description: "Creating a new copy of this game configuration.",
              status: "info",
              duration: 5000,
            });
          } else if (data.userId !== currentUser?.uid && foundCollection === 'userGameConfigs') {
            setIsEditing(false);
            toast({
              title: "Creating a copy",
              description: "You're not the owner of this configuration, so you'll create a copy instead.",
              status: "info",
              duration: 5000,
            });
          } else {
            setIsEditing(true);
          }

          // Prepare initial data for ConfigurationFramework
          const loadedData: any = {
            ...data,
            title: isCopy ? `Copy of ${data.title || 'Untitled Game'}` : data.title
          };

          // Transform legacy categories format to new format if needed
          if (loadedData.categories && Array.isArray(loadedData.categories)) {
            loadedData.categories = loadedData.categories.map((category: any) => {
              // If category has 'words' array (legacy format), convert to 'items' array
              if (category.words && Array.isArray(category.words) && !category.items) {
                console.log('Converting legacy category format for:', category.title, 'with words:', category.words);
                return {
                  id: category.id || `cat-${generateId()}`,
                  title: category.title || '',
                  items: category.words.map((word: string, index: number) => ({
                    id: `item-${generateId()}`,
                    content: word,
                    text: word
                  }))
                };
              }
              
              // If category already has items, ensure they have proper structure
              if (category.items && Array.isArray(category.items)) {
                console.log('Ensuring proper structure for category:', category.title, 'with items:', category.items);
                return {
                  id: category.id || `cat-${generateId()}`,
                  title: category.title || '',
                  items: category.items.map((item: any, index: number) => ({
                    id: item.id || `item-${generateId()}`,
                    content: item.content || item.text || item,
                    text: item.text || item.content || item
                  }))
                };
              }
              
              // Fallback for categories without words or items
              console.log('Creating fallback category for:', category.title);
              return {
                id: category.id || `cat-${generateId()}`,
                title: category.title || '',
              items: [{
                  id: `item-${generateId()}`,
                content: '',
                text: ''
              }]
              };
            });
          }

          setInitialData(loadedData);
          } else {
            toast({
              title: "Configuration not found",
              description: "The requested configuration could not be found.",
              status: "error",
              duration: 5000,
            });
          navigate('/configure/whack-a-mole');
        }
      } catch (error) {
        console.error("Error loading configuration:", error);
          toast({
            title: "Error",
            description: "Failed to load the configuration.",
            status: "error",
            duration: 5000,
          });
        navigate('/configure/whack-a-mole');
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [templateId, currentUser, navigate, toast]);

  // Don't render the framework until loading is complete
  if (templateId && isLoading) {
    return null; // or a loading spinner
  }

  return (
    <ConfigurationFramework 
      schema={whackAMoleSchema}
      initialData={initialData}
      isEditing={isEditing}
      documentId={isCopyOperation ? undefined : templateId}
    />
  );
};

export default WhackAMoleConfig; 