import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@chakra-ui/react';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ConfigurationFramework } from '../../components/common/ConfigurationFramework';
import { nameItSchema } from '../../schemas/nameItSchema';

const NameItConfig: React.FC = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  
  const [initialData, setInitialData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing configuration if templateId is provided
  useEffect(() => {
    const loadConfiguration = async () => {
      // Skip loading if templateId is empty, null, undefined, or "new"
      if (!templateId || templateId === 'new' || templateId.trim() === '') {
        return;
      }
      
      setIsLoading(true);
      try {
        // Try multiple collections to find the template
        const collections = [
          { name: 'userGameConfigs', ref: doc(db, 'userGameConfigs', templateId) },
          { name: 'gameConfigs', ref: doc(db, 'gameConfigs', templateId) },
          { name: 'blankGameTemplates', ref: doc(db, 'blankGameTemplates', templateId) }
        ];
        
        let foundCollection = '';
        let docSnap = null;
        for (const collection of collections) {
          const tempDocSnap = await getDoc(collection.ref);
          if (tempDocSnap.exists()) {
            docSnap = tempDocSnap;
            foundCollection = collection.name;
            break;
          }
        }
        
        if (docSnap && docSnap.exists()) {
          const data = docSnap.data();
          setInitialData(data);
          setIsEditing(true);
          console.log(`✅ Name It template loaded from ${foundCollection}:`, data);
        } else {
          toast({
            title: 'Configuration not found',
            status: 'error',
            duration: 3000,
          });
          navigate('/teacher');
        }
      } catch (error) {
        console.error('Error loading configuration:', error);
        toast({
          title: 'Error loading configuration',
          status: 'error',
          duration: 3000,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadConfiguration();
  }, [templateId, navigate, toast]);

  const handleCancel = () => {
    navigate('/teacher');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <ConfigurationFramework
      schema={nameItSchema}
      onCancel={handleCancel}
      initialData={initialData}
      isEditing={isEditing}
    />
  );
};

export default NameItConfig; 