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
      if (!templateId) return;
      
      // Check if this is a copy operation
      const urlParams = new URLSearchParams(window.location.search);
      const isCopy = urlParams.get('copy') === 'true';
      setIsCopyOperation(isCopy);
      
      setIsLoading(true);
      try {
        const docRef = doc(db, 'userGameConfigs', templateId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
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
          } else if (data.userId !== currentUser?.uid) {
            setIsEditing(false);
            setIsCopyOperation(true); // Treat as copy if user doesn't own it
            toast({
              title: "Creating a copy",
              description: "You're not the owner of this configuration, so you'll create a copy instead.",
              status: "info",
              duration: 5000,
            });
          } else {
            setIsEditing(true);
          }
          
          // Populate initial data - if copy, append "Copy of " to title
          const loadedData = {
            ...data,
            title: (isCopy || data.userId !== currentUser?.uid) ? `Copy of ${data.title || 'Untitled Spinner Wheel'}` : (data.title || ''),
          };
          
          setInitialData(loadedData);
        } else {
          toast({
            title: "Configuration not found",
            description: "The requested configuration could not be found.",
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