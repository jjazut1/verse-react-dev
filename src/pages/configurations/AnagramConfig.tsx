import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@chakra-ui/react';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ConfigurationFramework } from '../../components/common/ConfigurationFramework';
import { anagramSchema } from '../../schemas/anagramSchema';

const AnagramConfig: React.FC = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  
  const [initialData, setInitialData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopyOperation, setIsCopyOperation] = useState(false);

  // Load existing configuration if templateId is provided
  useEffect(() => {
    const loadConfiguration = async () => {
      // Skip loading if templateId is empty, null, undefined, or "new"
      if (!templateId || templateId === 'new' || templateId.trim() === '') {
        return;
      }
      
      // Check if this is a copy operation
      const urlParams = new URLSearchParams(window.location.search);
      const isCopy = urlParams.get('copy') === 'true';
      setIsCopyOperation(isCopy);
      
      setIsLoading(true);
      try {
        let isAdminConfig = false;
        
        // Try multiple collections to find the template
        const collections = [
          { name: 'userGameConfigs', ref: doc(db, 'userGameConfigs', templateId) },
          { name: 'gameConfigs', ref: doc(db, 'gameConfigs', templateId) },
          { name: 'blankGameTemplates', ref: doc(db, 'blankGameTemplates', templateId) },
          { name: 'categoryTemplates', ref: doc(db, 'categoryTemplates', templateId) }
        ];
        
        let foundCollection = '';
        let docSnap = null;
        for (const collection of collections) {
          const tempDocSnap = await getDoc(collection.ref);
          if (tempDocSnap.exists()) {
            docSnap = tempDocSnap;
            foundCollection = collection.name;
            isAdminConfig = collection.name === 'gameConfigs' || collection.name === 'blankGameTemplates' || collection.name === 'categoryTemplates';
            break;
          }
        }
        
        if (docSnap && docSnap.exists()) {
          const data = docSnap.data();
          
          // Check if this is a copy operation or user doesn't have permission
          if (isCopy) {
            setIsEditing(false);
            toast({
              title: "Creating a copy",
              description: "Creating a new copy of this anagram game configuration.",
              status: "info",
              duration: 5000,
            });
          } else if (isAdminConfig || data.userId !== currentUser?.uid) {
            setIsEditing(false);
            setIsCopyOperation(true); // Treat as copy if user doesn't own it or it's an admin config
            toast({
              title: "Creating a copy",
              description: isAdminConfig ? 
                "This is an official template. You'll create a copy that you can customize." :
                "You're not the owner of this configuration, so you'll create a copy instead.",
              status: "info",
              duration: 5000,
            });
          } else {
            setIsEditing(true);
          }
          
          // Populate initial data - if copy, append "Copy of " to title
          const loadedData = {
            ...data,
            title: (isCopy || isAdminConfig || data.userId !== currentUser?.uid) ? 
              `Copy of ${data.title || 'Untitled Anagram Game'}` : 
              (data.title || ''),
            share: (isCopy || isAdminConfig || data.userId !== currentUser?.uid) ? false : data.share, // Reset share to false for copies
          };
          
          setInitialData(loadedData);
        } else {
          toast({
            title: "Configuration not found",
            description: "The requested configuration could not be found in any collection.",
            status: "error",
            duration: 5000,
          });
          navigate('/configure/anagram');
        }
      } catch (error) {
        console.error("Error loading configuration:", error);
        toast({
          title: "Error",
          description: "Failed to load the configuration.",
          status: "error",
          duration: 5000,
        });
        navigate('/configure/anagram');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfiguration();
  }, [templateId, currentUser, navigate, toast]);

  // Don't render the framework until loading is complete
  if (templateId && isLoading) {
    return null; // or a loading spinner
  }

  return (
    <ConfigurationFramework 
      schema={anagramSchema}
      initialData={initialData}
      isEditing={isEditing}
      documentId={isCopyOperation ? undefined : templateId}
      onCancel={() => navigate('/')}
    />
  );
};

export default AnagramConfig; 