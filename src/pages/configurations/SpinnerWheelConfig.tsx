import React, { useState, useEffect, useRef, createContext, useContext, memo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  Switch,
  useToast,
  Heading,
  Text,
  IconButton,
  Select,
  Flex,
  Badge,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertDescription,
  Divider,
  Card,
  CardBody,
  CardHeader,
  useColorModeValue
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, RepeatIcon, ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUnsavedChangesContext } from '../../contexts/UnsavedChangesContext';
import { generateAndUploadThumbnail } from '../../utils/thumbnailGenerator';
import SlateEditor from '../../components/SlateEditor';
import { isEqual } from 'lodash';

// Create context for editor selection
interface EditorSelectionContextType {
  activeEditorId: string | null;
  setActiveEditorId: (id: string | null) => void;
  lastSelectionPath: [number] | null; // [itemIndex] for spinner wheel items
  setLastSelectionPath: (path: [number] | null) => void;
}

const EditorSelectionContext = createContext<EditorSelectionContextType>({
  activeEditorId: null,
  setActiveEditorId: () => {},
  lastSelectionPath: null,
  setLastSelectionPath: () => {}
});

// Use the editor selection context
const useEditorSelection = () => useContext(EditorSelectionContext);

// Add Apple-style CSS for styling
const styles = `
  /* Global Apple-style design */
  .apple-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
  }
  
  /* Section styling */
  .apple-section {
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 20px;
    margin-bottom: 24px;
    border: 1px solid #E2E8F0;
    transition: all 0.2s ease;
  }

  .apple-section:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  /* Section header */
  .apple-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid #E2E8F0;
    padding-bottom: 12px;
  }
  
  /* Input fields */
  .apple-input {
    border-radius: 8px !important;
    border-color: #E2E8F0 !important;
    background-color: #F8F9FC !important;
    transition: all 0.2s ease !important;
  }
  
  .apple-input:focus-within {
    border-color: #007AFF !important;
    box-shadow: 0 0 0 1px #007AFF !important;
    background-color: white !important;
  }
  
  /* Custom editor styling */
  .narrow-editor {
    width: 100%;
  }
  
  .narrow-editor [contenteditable="true"] {
    padding: 8px 12px;
    min-height: 38px;
    line-height: 1.5;
  }
  
  /* Ensure the formatting toolbar aligns with input field */
  .item-editor-wrapper .slate-toolbar {
    border-radius: 6px;
    margin-top: 2px;
  }
  
  /* Buttons */
  .apple-button {
    border-radius: 8px !important;
    font-weight: 500 !important;
    transition: all 0.2s ease !important;
  }
  
  .apple-button-primary {
    background-color: #007AFF !important;
    color: white !important;
  }
  
  .apple-button-primary:hover {
    background-color: #0063CC !important;
    transform: translateY(-1px) !important;
  }
  
  .apple-button-primary:active {
    transform: translateY(0) scale(0.98) !important;
  }
  
  .apple-button-secondary {
    background-color: #F1F5F9 !important;
    color: #1E293B !important;
    border: 1px solid #E2E8F0 !important;
  }
  
  .apple-button-secondary:hover {
    background-color: #E2E8F0 !important;
    transform: translateY(-1px) !important;
  }
  
  .apple-button-secondary:active {
    transform: translateY(0) scale(0.98) !important;
  }
`;

// Add styles to the document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

// Define apple style icon button
const appleStyleIconButton = {
  width: '32px',
  height: '32px',
  padding: '0',
  minWidth: 'auto',
  borderRadius: '8px',
  fontWeight: '500',
  transition: 'all 0.2s ease',
  color: 'gray.500',
  _hover: {
    bg: 'blue.50',
    color: 'blue.500',
    transform: 'translateY(-1px)'
  },
  _active: {
    transform: 'scale(0.98)',
  }
};

// Define a subtle style for the delete button
const subtleDeleteButton = {
  ...appleStyleIconButton,
  color: 'gray.500',
  _hover: {
    bg: 'red.50',
    color: 'red.500',
  }
};

// Define interfaces
interface SpinnerWheelItem {
  id: string;
  text: string;
  color?: string;
  content?: any; // Rich text content for SlateEditor
}

interface SpinnerWheelConfig {
  id?: string;
  title: string;
  type: 'spinner-wheel';
  items: SpinnerWheelItem[];
  removeOnSelect: boolean;
  wheelTheme: 'primaryColors' | 'pastel' | 'bright' | 'patriotic' | 'greenShades' | 'desert' | 'ocean' | 'sunset' | 'custom';
  customColors: string[];
  soundEnabled: boolean;
  maxSpins?: number;
  instructions: string;
  share: boolean;
  userId: string;
  email: string;
  createdAt?: any;
  updatedAt: any;
  thumbnail?: string;
}

interface OutletContextType {
  onError?: (message: string) => void;
}

// Create a wrapper component for SlateEditor that adds onFocus capability
const ItemEditor = ({ 
  value, 
  onChange, 
  placeholder, 
  onFocus, 
  editorId 
}: { 
  value: any; 
  onChange: (value: any) => void; 
  placeholder?: string; 
  onFocus?: (event: React.FocusEvent<HTMLDivElement>) => void;
  editorId: string;
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Convert complex Slate objects to plain strings if needed
  const getEditorValue = () => {
    if (typeof value === 'string') {
      return value;
    }
  
    // If it's a Slate object, extract the text
    if (Array.isArray(value)) {
      try {
        let text = '';
        const traverse = (nodes: any[]) => {
          for (const node of nodes) {
            if (typeof node.text === 'string') {
              text += node.text;
            } else if (node.children) {
              traverse(node.children);
            }
          }
        };
        traverse(value);
        return text;
      } catch (e) {
        console.error('Error extracting text from Slate content:', e);
        return '';
      }
    }
    
    return '';
  };

  // Create a handler for SlateEditor's onChange
  const handleSlateChange = (newValue: string) => {
    // Pass the string directly to the parent component
    onChange(newValue);
  };

  useEffect(() => {
    if (wrapperRef.current) {
      const divElement = wrapperRef.current;
      // Add focus event listener to the div
      const handleFocus = (e: FocusEvent) => {
        if (onFocus && e.target instanceof HTMLDivElement) {
          onFocus(e as unknown as React.FocusEvent<HTMLDivElement>);
        }
      };
      
      divElement.addEventListener('focusin', handleFocus);
      
      return () => {
        divElement.removeEventListener('focusin', handleFocus);
      };
    }
  }, [onFocus]);

  return (
    <div 
      ref={wrapperRef} 
      className="item-editor-wrapper" 
      data-editor-id={editorId}
      style={{
        width: '100%'
      }}
    >
      <SlateEditor
        value={getEditorValue()}
        onChange={handleSlateChange}
        placeholder={placeholder}
        className="apple-input narrow-editor"
      />
    </div>
  );
};

// Memoize the ItemEditor to improve performance
const MemoizedItemEditor = memo(ItemEditor, (prevProps, nextProps) => {
  // Compare props for equality (except complex objects like onChange function)
  if (prevProps.placeholder !== nextProps.placeholder) return false;
  if (prevProps.editorId !== nextProps.editorId) return false;
  
  // Deep compare content (this is the expensive part)
  try {
    return isEqual(prevProps.value, nextProps.value);
  } catch (e) {
    // If comparison fails, re-render to be safe
    return false;
  }
});

// Update createSlateContent to return a string instead of Slate objects
const createSlateContent = (text: any): string => {
  // Debug the input
  if (typeof text !== 'string') {
    console.log(`createSlateContent received non-string value:`, text, `type: ${typeof text}`);
    
    // If it's a Slate object, extract the text
    if (Array.isArray(text)) {
      try {
        let extractedText = '';
        const traverse = (nodes: any[]) => {
          for (const node of nodes) {
            if (typeof node.text === 'string') {
              extractedText += node.text;
            } else if (node.children) {
              traverse(node.children);
            }
          }
        };
        traverse(text);
        return extractedText;
      } catch (e) {
        console.error('Error extracting text from content array:', e);
      }
    }
  }
  
  // Convert to string directly
  return typeof text === 'string' ? text : String(text || '');
};

// Utility function to generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

const SpinnerWheelConfig: React.FC = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  const { onError } = useOutletContext<OutletContextType>();
  const { setHasUnsavedChanges } = useUnsavedChangesContext();

  // Editor selection state
  const [activeEditorId, setActiveEditorId] = useState<string | null>(null);
  const [lastSelectionPath, setLastSelectionPath] = useState<[number] | null>(null);
  // Track last added item for focus management
  const lastAddedItemRef = useRef<{itemIndex: number, id: string | null}>({
    itemIndex: 0,
    id: null
  });

  // Form state
  const [title, setTitle] = useState('My Spinner Wheel');
  const [items, setItems] = useState<SpinnerWheelItem[]>([
    { id: generateId(), text: 'Item 1', color: '#FF6B6B', content: 'Item 1' },
    { id: generateId(), text: 'Item 2', color: '#4ECDC4', content: 'Item 2' },
    { id: generateId(), text: 'Item 3', color: '#45B7D1', content: 'Item 3' },
    { id: generateId(), text: 'Item 4', color: '#96CEB4', content: 'Item 4' }
  ]);
  const [removeOnSelect, setRemoveOnSelect] = useState(false);
  const [wheelTheme, setWheelTheme] = useState<'primaryColors' | 'pastel' | 'bright' | 'patriotic' | 'greenShades' | 'desert' | 'ocean' | 'sunset' | 'custom'>('primaryColors');
  const [customColors, setCustomColors] = useState<string[]>(['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [maxSpins, setMaxSpins] = useState<number>(0); // 0 = unlimited
  const [instructions, setInstructions] = useState('Click the SPIN button to randomly select an item from the wheel!');
  const [shareConfig, setShareConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Store initial form values for comparison
  const initialFormValuesRef = useRef({
    title: 'My Spinner Wheel',
    items: [
      { id: '1', text: 'Item 1', color: '#FF6B6B', content: 'Item 1' },
      { id: '2', text: 'Item 2', color: '#4ECDC4', content: 'Item 2' },
      { id: '3', text: 'Item 3', color: '#45B7D1', content: 'Item 3' },
      { id: '4', text: 'Item 4', color: '#96CEB4', content: 'Item 4' }
    ] as SpinnerWheelItem[],
    removeOnSelect: false,
    wheelTheme: 'primaryColors' as 'primaryColors' | 'pastel' | 'bright' | 'patriotic' | 'greenShades' | 'desert' | 'ocean' | 'sunset' | 'custom',
    customColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
    soundEnabled: true,
    maxSpins: 0,
    instructions: 'Click the SPIN button to randomly select an item from the wheel!',
    shareConfig: false
  });

  // Color themes
  const colorThemes = {
    primaryColors: ['#FF6B6B', '#FFD93D', '#6BCF7F', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],
    pastel: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E1BAFF', '#FFBADB', '#C9BAFF'],
    bright: ['#FF0000', '#FF8800', '#FFFF00', '#88FF00', '#00FF00', '#00FF88', '#00FFFF', '#0088FF'],
    patriotic: ['#DC143C', '#FFFFFF', '#000080', '#FF0000', '#87CEEB', '#4169E1', '#C0C0C0', '#191970'],
    greenShades: ['#90EE90', '#32CD32', '#228B22', '#006400', '#2E8B57', '#6B8E23', '#00FF7F', '#ADFF2F'],
    desert: ['#F4A460', '#D2B48C', '#F5F5DC', '#A0522D', '#B7410E', '#FF8C00', '#E2725B', '#C3B091'],
    ocean: ['#ADD8E6', '#87CEEB', '#00BFFF', '#40E0D0', '#008080', '#000080', '#00FFFF', '#4682B4'],
    sunset: ['#FFC0CB', '#FF7F50', '#FFA500', '#FFD700', '#FFFF00', '#FF6347', '#DDA0DD', '#E6E6FA'],
    custom: customColors
  };

  // Check if user is authenticated
  useEffect(() => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to access configuration pages.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      navigate('/');
    }
  }, [currentUser, navigate, toast]);

  // Load blank template from database on component mount
  useEffect(() => {
    const loadBlankTemplate = async () => {
      if (templateId) return; // Don't load blank template if we have a specific template ID
      
      try {
        console.log('Loading blank spinner wheel template from database...');
        const blankTemplatesSnapshot = await getDocs(collection(db, 'blankGameTemplates'));
        
        // Find the spinner wheel template
        const spinnerWheelTemplate = blankTemplatesSnapshot.docs.find(doc => {
          const data = doc.data();
          return data.type === 'spinner-wheel';
        });
        
        if (spinnerWheelTemplate) {
          const templateData = spinnerWheelTemplate.data();
          console.log('Found spinner wheel template:', templateData);
          
          // Update form state with template data
          setTitle(templateData.title || 'My Spinner Wheel');
          setItems(templateData.items?.map((item: any) => ({
            ...item,
            id: item.id || generateId(),
            content: item.content || item.text || ''
          })) || []);
          setRemoveOnSelect(templateData.removeOnSelect || false);
          // Map old 'rainbow' theme to new 'primaryColors'
          const mappedTheme = templateData.wheelTheme === 'rainbow' ? 'primaryColors' : templateData.wheelTheme;
          setWheelTheme(mappedTheme || 'primaryColors');
          setCustomColors(templateData.customColors || ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']);
          setSoundEnabled(templateData.soundEnabled ?? true);
          setMaxSpins(templateData.maxSpins || 0);
          setInstructions(templateData.instructions || 'Click the SPIN button to randomly select an item from the wheel!');
          setShareConfig(templateData.share || false);
          
          // Update initial values for comparison
          initialFormValuesRef.current = {
            title: templateData.title || 'My Spinner Wheel',
            items: templateData.items?.map((item: any) => ({
              ...item,
              id: item.id || generateId(),
              content: item.content || item.text || ''
            })) || [],
            removeOnSelect: templateData.removeOnSelect || false,
            wheelTheme: mappedTheme || 'primaryColors',
            customColors: templateData.customColors || ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
            soundEnabled: templateData.soundEnabled ?? true,
            maxSpins: templateData.maxSpins || 0,
            instructions: templateData.instructions || 'Click the SPIN button to randomly select an item from the wheel!',
            shareConfig: templateData.share || false
          };
        } else {
          console.log('No spinner wheel template found in blankGameTemplates, using defaults');
        }
      } catch (error) {
        console.error('Error loading blank template:', error);
        // Continue with default values if template loading fails
      }
    };
    
    if (currentUser && !templateId) {
      loadBlankTemplate();
    }
  }, [currentUser, templateId]);

  // Load existing configuration if templateId is provided
  useEffect(() => {
    if (templateId && currentUser) {
      loadTemplate();
    }
  }, [templateId, currentUser]);

  const loadTemplate = async () => {
    if (!templateId) return;

    setIsLoading(true);
    try {
      // First try to load from userGameConfigs
      const docRef = doc(db, 'userGameConfigs', templateId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const config = docSnap.data() as SpinnerWheelConfig;
        
        // Populate form fields
        setTitle(config.title || 'My Spinner Wheel');
        setItems(config.items?.map((item: any) => ({
          ...item,
          id: item.id || generateId(),
          content: item.content || item.text || ''
        })) || []);
        setRemoveOnSelect(config.removeOnSelect || false);
        setWheelTheme(config.wheelTheme || 'primaryColors');
        setCustomColors(config.customColors || ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']);
        setSoundEnabled(config.soundEnabled ?? true);
        setMaxSpins(config.maxSpins || 0);
        setInstructions(config.instructions || 'Click the SPIN button to randomly select an item from the wheel!');
        setShareConfig(config.share || false);
        setIsEditing(true);

        // Update initial values for comparison
        initialFormValuesRef.current = {
          title: config.title || 'My Spinner Wheel',
          items: config.items?.map((item: any) => ({
            ...item,
            id: item.id || generateId(),
            content: item.content || item.text || ''
          })) || [],
          removeOnSelect: config.removeOnSelect || false,
          wheelTheme: config.wheelTheme || 'primaryColors',
          customColors: config.customColors || ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
          soundEnabled: config.soundEnabled ?? true,
          maxSpins: config.maxSpins || 0,
          instructions: config.instructions || 'Click the SPIN button to randomly select an item from the wheel!',
          shareConfig: config.share || false
        };

        // Reset unsaved changes flag after loading
        setHasUnsavedChanges(false);
      } else {
        // If not found in userGameConfigs, try blankGameTemplates
        console.log(`Template ${templateId} not found in userGameConfigs, trying blankGameTemplates`);
        const blankTemplateRef = doc(db, 'blankGameTemplates', templateId);
        const blankTemplateSnap = await getDoc(blankTemplateRef);
        
        if (blankTemplateSnap.exists()) {
          const templateData = blankTemplateSnap.data();
          console.log(`Found template in blankGameTemplates:`, templateData);
          
          // Populate form fields from blank template
          setTitle(templateData.title || 'My Spinner Wheel');
          setItems(templateData.items?.map((item: any) => ({
            ...item,
            id: item.id || generateId(),
            content: item.content || item.text || ''
          })) || []);
          setRemoveOnSelect(templateData.removeOnSelect || false);
          // Map old 'rainbow' theme to new 'primaryColors'
          const mappedTheme = templateData.wheelTheme === 'rainbow' ? 'primaryColors' : templateData.wheelTheme;
          setWheelTheme(mappedTheme || 'primaryColors');
          setCustomColors(templateData.customColors || ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']);
          setSoundEnabled(templateData.soundEnabled ?? true);
          setMaxSpins(templateData.maxSpins || 0);
          setInstructions(templateData.instructions || 'Click the SPIN button to randomly select an item from the wheel!');
          setShareConfig(templateData.share || false);
          setIsEditing(false); // This is a new configuration based on a template
          
          // Update initial values for comparison
          initialFormValuesRef.current = {
            title: templateData.title || 'My Spinner Wheel',
            items: templateData.items?.map((item: any) => ({
              ...item,
              id: item.id || generateId(),
              content: item.content || item.text || ''
            })) || [],
            removeOnSelect: templateData.removeOnSelect || false,
            wheelTheme: mappedTheme || 'primaryColors',
            customColors: templateData.customColors || ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
            soundEnabled: templateData.soundEnabled ?? true,
            maxSpins: templateData.maxSpins || 0,
            instructions: templateData.instructions || 'Click the SPIN button to randomly select an item from the wheel!',
            shareConfig: templateData.share || false
          };
          
          // Reset unsaved changes flag after loading
          setHasUnsavedChanges(false);
        } else {
          if (onError) {
            onError("The requested configuration could not be found.");
          } else {
            toast({
              title: "Configuration not found",
              description: "The requested configuration could not be found.",
              status: "error",
              duration: 5000,
            });
          }
          navigate('/configure/spinner-wheel');
        }
      }
    } catch (error) {
      console.error("Error loading configuration:", error);
      if (onError) {
        onError("Failed to load the configuration.");
      } else {
        toast({
          title: "Error",
          description: "Failed to load the configuration.",
          status: "error",
          duration: 5000,
        });
      }
      navigate('/configure/spinner-wheel');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form changes to track unsaved changes
  useEffect(() => {
    // Skip this check during initial load
    if (isLoading) return;
    
    const currentValues = {
      title,
      items: JSON.parse(JSON.stringify(items)), // Deep copy for comparison
      removeOnSelect,
      wheelTheme,
      customColors: [...customColors], // Shallow copy for comparison
      soundEnabled,
      maxSpins,
      instructions,
      shareConfig
    };
    
    // Deep comparison between current and initial values
    const hasChanges = 
      currentValues.title !== initialFormValuesRef.current.title ||
      currentValues.removeOnSelect !== initialFormValuesRef.current.removeOnSelect ||
      currentValues.wheelTheme !== initialFormValuesRef.current.wheelTheme ||
      currentValues.soundEnabled !== initialFormValuesRef.current.soundEnabled ||
      currentValues.maxSpins !== initialFormValuesRef.current.maxSpins ||
      currentValues.instructions !== initialFormValuesRef.current.instructions ||
      currentValues.shareConfig !== initialFormValuesRef.current.shareConfig ||
      JSON.stringify(currentValues.items) !== JSON.stringify(initialFormValuesRef.current.items) ||
      JSON.stringify(currentValues.customColors) !== JSON.stringify(initialFormValuesRef.current.customColors);
    
    setHasUnsavedChanges(hasChanges);
  }, [title, items, removeOnSelect, wheelTheme, customColors, soundEnabled, maxSpins, instructions, shareConfig, isLoading, setHasUnsavedChanges]);

  // Generate colors for items based on theme
  const getItemColors = () => {
    const themeColors = colorThemes[wheelTheme];
    return items.map((item, index) => ({
      ...item,
      color: themeColors[index % themeColors.length]
    }));
  };

  // Add new item
  const addItem = () => {
    const newId = generateId();
    const newItem: SpinnerWheelItem = {
      id: newId,
      text: `Item ${items.length + 1}`,
      color: colorThemes[wheelTheme][items.length % colorThemes[wheelTheme].length],
      content: `Item ${items.length + 1}`
    };
    setItems([...items, newItem]);
    lastAddedItemRef.current = { itemIndex: items.length, id: newId };
    
    // Use setTimeout to focus the new item after the component has rendered
    setTimeout(() => {
      const { itemIndex, id } = lastAddedItemRef.current;
      console.log(`Attempting to focus new item at index ${itemIndex}, id ${id}`);
      
      const itemElement = document.querySelector(`[data-editor-id="${id}"]`);
      if (itemElement) {
        console.log('Found item element, focusing');
        // Find the actual editable element within the editor wrapper
        const editableElement = itemElement.querySelector('[contenteditable="true"]');
        if (editableElement) {
          (editableElement as HTMLElement).focus();
          // Set active editor ID and selection path
          setActiveEditorId(id);
          setLastSelectionPath([itemIndex]);
        } else {
          console.log('Could not find editable element');
        }
      } else {
        console.log('Could not find item element with id:', id);
      }
    }, 100);
  };

  // Remove item
  const removeItem = (id: string) => {
    if (items.length > 2) { // Keep at least 2 items
      setItems(items.filter(item => item.id !== id));
    }
  };

  // Update item text
  const updateItem = (id: string, content: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        // Extract plain text for the text field (for backward compatibility)
        const plainText = createSlateContent(content);
        return { 
          ...item, 
          text: plainText,
          content: content
        };
      }
      return item;
    }));
  };

  // Handle editor focus event
  const handleEditorFocus = (editorId: string) => (event: React.FocusEvent<HTMLDivElement>) => {
    setActiveEditorId(editorId);
    // Find the item index based on the editor ID
    const itemIndex = items.findIndex(item => item.id === editorId);
    if (itemIndex !== -1) {
      setLastSelectionPath([itemIndex]);
    }
  };

  // Handle move item up
  const handleMoveItemUp = (itemIndex: number) => {
    if (itemIndex <= 0) return;
    
    const newItems = [...items];
    const temp = newItems[itemIndex];
    newItems[itemIndex] = newItems[itemIndex - 1];
    newItems[itemIndex - 1] = temp;
    
    setItems(newItems);
  };

  // Handle move item down
  const handleMoveItemDown = (itemIndex: number) => {
    if (itemIndex >= items.length - 1) return;
    
    const newItems = [...items];
    const temp = newItems[itemIndex];
    newItems[itemIndex] = newItems[itemIndex + 1];
    newItems[itemIndex + 1] = temp;
    
    setItems(newItems);
  };

  // Save configuration
  const handleSave = async () => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to save configurations.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for your spinner wheel.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (items.length < 2) {
      toast({
        title: 'Minimum Items Required',
        description: 'Please add at least 2 items to the spinner wheel.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const baseConfig = {
        title: title.trim(),
        type: 'spinner-wheel' as const,
        items: getItemColors(),
        removeOnSelect,
        wheelTheme,
        customColors,
        soundEnabled,
        maxSpins,
        instructions: instructions.trim(),
        share: shareConfig,
        userId: currentUser.uid,
        email: currentUser.email || '',
        updatedAt: serverTimestamp()
      };

      // Add createdAt only for new configurations
      const config = isEditing 
        ? baseConfig 
        : { ...baseConfig, createdAt: serverTimestamp() };

      // Generate thumbnail
      const docId = templateId || doc(collection(db, 'userGameConfigs')).id;
      const thumbnailUrl = await generateAndUploadThumbnail(docId, config);
      if (thumbnailUrl) {
        (config as any).thumbnail = thumbnailUrl;
      }

      // Save to database
      await setDoc(doc(db, 'userGameConfigs', docId), config);

      toast({
        title: isEditing ? 'Configuration Updated' : 'Configuration Saved',
        description: isEditing ? 'Your spinner wheel has been updated successfully.' : 'Your spinner wheel has been saved successfully.',
        status: 'success',
        duration: 3000,
      });

      // Update initial values to current values after successful save
      initialFormValuesRef.current = {
        title: title.trim(),
        items: JSON.parse(JSON.stringify(getItemColors())),
        removeOnSelect,
        wheelTheme,
        customColors: [...customColors],
        soundEnabled,
        maxSpins,
        instructions: instructions.trim(),
        shareConfig
      };

      setHasUnsavedChanges(false);

      // Navigate to teacher dashboard if this is a new configuration
      if (!isEditing) {
        navigate('/teacher');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Save Failed',
        description: 'There was an error saving your configuration. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Center p={8}>
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <EditorSelectionContext.Provider value={{
        activeEditorId,
        setActiveEditorId,
        lastSelectionPath,
        setLastSelectionPath
    }}>
      <Box maxW="4xl" mx="auto" p={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Box>
            <Heading size="lg" mb={2}>
              {isEditing ? 'Edit Spinner Wheel' : 'Create Spinner Wheel'}
            </Heading>
            <Text color="gray.600">
              Create an interactive spinner wheel for random selection, vocabulary practice, or decision making.
            </Text>
          </Box>

          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <Heading size="md">Basic Settings</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Title</FormLabel>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter wheel title"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Instructions</FormLabel>
                  <Textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Enter instructions for students"
                    rows={3}
                  />
                </FormControl>
              </VStack>
            </CardBody>
          </Card>

          {/* Wheel Items */}
          <Card>
            <CardHeader>
              <Flex justify="space-between" align="center">
                <Heading size="md">Wheel Items</Heading>
                <Button leftIcon={<AddIcon />} onClick={addItem} colorScheme="blue" size="sm" className="apple-button apple-button-primary">
                  Add Item
                </Button>
              </Flex>
            </CardHeader>
            <CardBody>
              <VStack spacing={3}>
                {items.map((item, index) => (
                  <Box key={item.id} w="full">
                    <Flex align="center" direction="row">
                      <Box
                        w={4}
                        h={4}
                        borderRadius="full"
                        bg={colorThemes[wheelTheme][index % colorThemes[wheelTheme].length]}
                        mr={3}
                        flexShrink={0}
                      />
                      <Text 
                        mr={2} 
                        fontWeight="bold" 
                        width="25px" 
                        color="gray.500"
                        flexShrink={0}
                      >
                        {index + 1}.
                      </Text>
                      <Box flex="1" mr={2}>
                        <MemoizedItemEditor
                          value={item.content || item.text}
                          onChange={(content) => updateItem(item.id, content)}
                          onFocus={handleEditorFocus(item.id)}
                          placeholder={`Item ${index + 1}`}
                          editorId={item.id}
                        />
                      </Box>
                      <HStack spacing={1}>
                        <IconButton
                          icon={<ChevronUpIcon boxSize={3} />}
                          aria-label="Move item up"
                          size="sm"
                          variant="ghost"
                          isDisabled={index === 0}
                          onClick={() => handleMoveItemUp(index)}
                          sx={appleStyleIconButton}
                          className="apple-button"
                        />
                        <IconButton
                          icon={<ChevronDownIcon boxSize={3} />}
                          aria-label="Move item down"
                          size="sm"
                          variant="ghost"
                          isDisabled={index === items.length - 1}
                          onClick={() => handleMoveItemDown(index)}
                          sx={appleStyleIconButton}
                          className="apple-button"
                        />
                        <IconButton
                          aria-label="Remove item"
                          icon={<DeleteIcon />}
                          onClick={() => removeItem(item.id)}
                          isDisabled={items.length <= 2}
                          colorScheme="red"
                          variant="ghost"
                          size="sm"
                          sx={subtleDeleteButton}
                          className="apple-button"
                        />
                      </HStack>
                    </Flex>
                  </Box>
                ))}
                {items.length < 2 && (
                  <Alert status="info" size="sm">
                    <AlertIcon />
                    <AlertDescription>Add at least 2 items to create a functional spinner wheel.</AlertDescription>
                  </Alert>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <Heading size="md">Appearance</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Color Theme</FormLabel>
                  <Select value={wheelTheme} onChange={(e) => setWheelTheme(e.target.value as any)}>
                    <option value="primaryColors">Primary Colors</option>
                    <option value="pastel">Pastel</option>
                    <option value="bright">Bright</option>
                    <option value="patriotic">Patriotic</option>
                    <option value="greenShades">Green Shades</option>
                    <option value="desert">Desert</option>
                    <option value="ocean">Ocean</option>
                    <option value="sunset">Sunset</option>
                    <option value="custom">Custom</option>
                  </Select>
                </FormControl>

                {wheelTheme === 'custom' && (
                  <FormControl>
                    <FormLabel>Custom Colors</FormLabel>
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      Enter hex color codes separated by commas
                    </Text>
                    <Input
                      value={customColors.join(', ')}
                      onChange={(e) => setCustomColors(e.target.value.split(',').map(c => c.trim()))}
                      placeholder="#FF6B6B, #4ECDC4, #45B7D1"
                    />
                  </FormControl>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Game Settings */}
          <Card>
            <CardHeader>
              <Heading size="md">Game Settings</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4}>
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">Remove selected items</FormLabel>
                  <Switch
                    isChecked={removeOnSelect}
                    onChange={(e) => setRemoveOnSelect(e.target.checked)}
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">Enable sound effects</FormLabel>
                  <Switch
                    isChecked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Maximum spins (0 = unlimited)</FormLabel>
                  <NumberInput
                    value={maxSpins}
                    onChange={(_, value) => setMaxSpins(value || 0)}
                    min={0}
                    max={100}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
              </VStack>
            </CardBody>
          </Card>

          {/* Sharing Settings */}
          <Card>
            <CardHeader>
              <Heading size="md">Sharing</Heading>
            </CardHeader>
            <CardBody>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Share this configuration publicly</FormLabel>
                <Switch
                  isChecked={shareConfig}
                  onChange={(e) => setShareConfig(e.target.checked)}
                />
              </FormControl>
              <Text fontSize="sm" color="gray.600" mt={2}>
                Public configurations can be used by other teachers as templates.
              </Text>
            </CardBody>
          </Card>

          {/* Action Buttons */}
          <HStack spacing={4} justify="flex-end">
            <Button
              onClick={() => navigate('/teacher')}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              colorScheme="blue"
              isLoading={isLoading}
              loadingText="Saving..."
            >
              {isEditing ? 'Update Configuration' : 'Save Game Configuration'}
            </Button>
          </HStack>
        </VStack>
      </Box>
    </EditorSelectionContext.Provider>
  );
};

export default SpinnerWheelConfig; 