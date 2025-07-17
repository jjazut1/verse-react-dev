import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@chakra-ui/react';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ConfigurationFramework } from '../../components/common/ConfigurationFramework';
import { sentenceSenseSchema } from '../../schemas/sentenceSenseSchema';

const SentenceSenseConfig: React.FC = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  
  const [initialData, setInitialData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isCopyOperation, setIsCopyOperation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = () => {
    navigate('/teacher');
  };

  useEffect(() => {
    if (!templateId || templateId === 'new') {
      return;
    }

    const loadConfiguration = async () => {
      setIsLoading(true);
      
      try {
        const isCopy = new URLSearchParams(window.location.search).get('copy') === 'true';
        
        // Collections to search through in order
        const collections = [
          { name: 'userGameConfigs', ref: 'userGameConfigs' },
          { name: 'gameConfigs', ref: 'gameConfigs' },
          { name: 'blankGameTemplates', ref: 'blankGameTemplates' },
          { name: 'categoryTemplates', ref: 'categoryTemplates' }
        ];
        
        let docSnap = null;
        let foundCollection = '';
        let isAdminConfig = false;
        
        // Try each collection
        for (const collection of collections) {
          const tempDocSnap = await getDoc(doc(db, collection.ref, templateId));
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
              description: "Creating a new copy of this Sentence Sense configuration.",
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
              `Copy of ${data.title || 'Untitled Sentence Sense Game'}` : 
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
          navigate('/configure/sentence-sense');
        }
      } catch (error) {
        console.error("Error loading configuration:", error);
        toast({
          title: "Error",
          description: "Failed to load the configuration.",
          status: "error",
          duration: 5000,
        });
        navigate('/configure/sentence-sense');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfiguration();
  }, [templateId, currentUser, navigate, toast]);

  if (isLoading) {
    return <div>Loading configuration...</div>;
  }

  return (
    <ConfigurationFramework
      schema={sentenceSenseSchema}
      onCancel={handleCancel}
      initialData={initialData}
      isEditing={isEditing}
      documentId={isEditing ? templateId : undefined}
    />
  );
};

export default SentenceSenseConfig; 