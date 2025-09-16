import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@chakra-ui/react';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ConfigurationFramework } from '../../components/common/ConfigurationFramework';
import { sortCategoriesEggSchema } from '../../schemas/sortCategoriesEggSchema';

const SortCategoriesEggConfig: React.FC = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  
  // Debug logging (can be removed after fix is confirmed)
  // console.log('🔧 SortCategoriesEggConfig templateId:', templateId);
  // console.log('🔧 templateId type:', typeof templateId);
  // console.log('🔧 templateId length:', templateId?.length);
  
  const [initialData, setInitialData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopyOperation, setIsCopyOperation] = useState(false);

  // Load existing configuration if templateId is provided
  useEffect(() => {
    const loadConfiguration = async () => {
      // Skip loading if templateId is empty, null, undefined, or "new"
      if (!templateId || templateId === 'new' || templateId.trim() === '') {
        // console.log('✅ No valid templateId provided, creating new configuration');
        return;
      }
      
      // console.log('🔄 Loading configuration with templateId:', templateId);
      
      // Check if this is a copy operation
      const urlParams = new URLSearchParams(window.location.search);
      const isCopy = urlParams.get('copy') === 'true';
      setIsCopyOperation(isCopy);
      
      setIsLoading(true);
      try {
        let isAdminConfig = false;
        
        // Only support user configs and blank templates
        const collections = [
          { name: 'userGameConfigs', ref: doc(db, 'userGameConfigs', templateId) },
          { name: 'blankGameTemplates', ref: doc(db, 'blankGameTemplates', templateId) }
        ];
        
        let foundCollection = '';
        let docSnap = null;
        for (const collection of collections) {
          // console.log(`🔍 Checking collection: ${collection.name}`);
          const tempDocSnap = await getDoc(collection.ref);
          if (tempDocSnap.exists()) {
            docSnap = tempDocSnap;
            foundCollection = collection.name;
            // Treat blank templates as admin-owned, user configs as owned
            isAdminConfig = collection.name === 'blankGameTemplates';
            // console.log(`✅ Found in collection: ${collection.name}`);
            break;
          }
        }
        
        if (docSnap && docSnap.exists()) {
          const data = docSnap.data();
          
          // Check if this is a copy operation or user doesn't have permission
          if (isCopy) {
            setIsEditing(false);
            // Suppress toast when opening blank templates
            if (foundCollection !== 'blankGameTemplates') {
              toast({
                title: "Creating a copy",
                description: "Creating a new copy of this sort categories configuration.",
                status: "info",
                duration: 5000,
              });
            }
          } else if (isAdminConfig || data.userId !== currentUser?.uid) {
            setIsEditing(false);
            setIsCopyOperation(true); // Treat as copy if user doesn't own it or it's an admin config
            // Only show the toast for official templates, not blank templates
            if (isAdminConfig && foundCollection !== 'blankGameTemplates') {
              toast({
                title: "Creating a copy",
                description: "This is an official template. You'll create a copy that you can customize.",
                status: "info",
                duration: 5000,
              });
            }
          } else {
            setIsEditing(true);
          }
          
          // Populate initial data - for blank templates, DO NOT prefix "Copy of"
          const shouldPrefixCopy = (isCopy || data.userId !== currentUser?.uid) && foundCollection !== 'blankGameTemplates';
          const loadedData = {
            ...data,
            title: shouldPrefixCopy
              ? `Copy of ${data.title || 'Untitled Sort Categories Game'}`
              : (data.title || ''),
            share: (isCopy || isAdminConfig || data.userId !== currentUser?.uid) ? false : data.share, // Reset share to false for copies
          };
          
          setInitialData(loadedData);
        } else {
          // console.log('❌ Configuration not found for templateId:', templateId);
          toast({
            title: "Configuration not found",
            description: "The requested configuration could not be found in any collection.",
            status: "error",
            duration: 5000,
          });
          navigate('/configure/sort-categories-egg');
        }
      } catch (error) {
        console.error("Error loading configuration:", error);
        toast({
          title: "Error",
          description: "Failed to load the configuration.",
          status: "error",
          duration: 5000,
        });
        navigate('/configure/sort-categories-egg');
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
      schema={sortCategoriesEggSchema}
      initialData={initialData}
      isEditing={isEditing}
      documentId={isCopyOperation ? undefined : templateId}
    />
  );
};

export default SortCategoriesEggConfig; 