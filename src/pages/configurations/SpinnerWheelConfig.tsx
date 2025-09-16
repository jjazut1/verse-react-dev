import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@chakra-ui/react';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ConfigurationFramework } from '../../components/common/ConfigurationFramework';
import { spinnerWheelSchema } from '../../schemas/spinnerWheelSchema';

const SpinnerWheelConfig: React.FC = () => {
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
        
        // Only load from user configs and blank templates
        const collections = [
          { name: 'userGameConfigs', ref: doc(db, 'userGameConfigs', templateId) },
          { name: 'blankGameTemplates', ref: doc(db, 'blankGameTemplates', templateId) }
        ];
        
        let foundCollection = '';
        let docSnap = null;
        for (const collection of collections) {
          const tempDocSnap = await getDoc(collection.ref);
          if (tempDocSnap.exists()) {
            docSnap = tempDocSnap;
            foundCollection = collection.name;
            isAdminConfig = collection.name === 'blankGameTemplates';
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
              description: "Creating a new copy of this spinner wheel configuration.",
              status: "info",
              duration: 5000,
            });
          } else if (isAdminConfig || data.userId !== currentUser?.uid) {
            setIsEditing(false);
            setIsCopyOperation(true); // Treat as copy if user doesn't own it or it's an admin config
            // Suppress toast for blank templates
          } else {
            setIsEditing(true);
          }
          
          const shouldPrefixCopy = (isCopy || isAdminConfig || data.userId !== currentUser?.uid) && (foundCollection !== 'blankGameTemplates');
          const loadedData = {
            ...data,
            title: shouldPrefixCopy ? `Copy of ${data.title || 'Untitled Spinner Wheel'}` : (data.title || ''),
            share: (isCopy || isAdminConfig || data.userId !== currentUser?.uid) ? false : data.share,
          };
          
          setInitialData(loadedData);
        } else {
          toast({
            title: "Configuration not found",
            description: "The requested configuration could not be found in any collection.",
            status: "error",
            duration: 5000,
          });
          navigate('/configure/spinner-wheel');
        }
      } catch (error) {
        console.error("Error loading configuration:", error);
        toast({
          title: "Error",
          description: "Failed to load the configuration.",
          status: "error",
          duration: 5000,
        });
        navigate('/configure/spinner-wheel');
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
      schema={spinnerWheelSchema}
      initialData={initialData}
      isEditing={isEditing}
      documentId={isCopyOperation ? undefined : templateId}
    />
  );
};

export default SpinnerWheelConfig; 