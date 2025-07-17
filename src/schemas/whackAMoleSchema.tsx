import React, { useState, useRef, createContext, useContext, memo, useEffect } from 'react';
import { ConfigSchema } from '../components/common/ConfigurationFramework';
import { serverTimestamp } from 'firebase/firestore';
import {
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  Box,
  IconButton,
  Heading,
  Badge,
  Collapse,
  Flex,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';
import SlateEditor from '../components/SlateEditor';
import { isEqual } from 'lodash';

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
  
  /* Number input fields */
  .chakra-numberinput__field {
    background-color: #F8F9FC !important;
    border-color: #E2E8F0 !important;
    border-radius: 8px !important;
  }
  
  .chakra-numberinput__field:focus-within {
    border-color: #007AFF !important;
    box-shadow: 0 0 0 1px #007AFF !important;
    background-color: white !important;
  }
  
  /* Textarea fields */
  .chakra-textarea {
    background-color: #F8F9FC !important;
    border-color: #E2E8F0 !important;
    border-radius: 8px !important;
  }
  
  .chakra-textarea:focus {
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

  /* Add styling for active category */
  .category-box {
    transition: all 0.2s ease;
    border: 1px solid #E2E8F0;
  }
  
  .category-box:focus-within {
    border-color: #007AFF;
    box-shadow: 0 0 0 1px #007AFF;
    background-color: #F7FAFF;
  }

  /* Category header styling */
  .category-header {
    background-color: #f5f7fa;
    margin: -16px -16px 16px -16px;
    padding: 12px 16px;
    border-top-left-radius: 7px;
    border-top-right-radius: 7px;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .category-box:focus-within .category-header {
    background-color: #EBF5FF;
    border-bottom-color: #C5E0FF;
  }
  
  /* Category order buttons */
  .order-buttons {
    display: flex;
    gap: 4px;
  }

  /* Switch styling */
  .chakra-switch__track[data-checked] {
    background-color: #007AFF !important;
  }
  
  .chakra-switch__track:not([data-checked]) {
    background-color: #CBD5E0 !important;
  }
`;

// Add styles to the document only once
if (!document.querySelector('#whack-a-mole-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'whack-a-mole-styles';
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

// Interfaces
interface CategoryItem {
  id: string;
  content: any; // Rich text content for SlateEditor
  text?: string; // Plain text for game compatibility
}

interface Category {
  id: string;
  title: string;
  items: CategoryItem[];
}

// Create context for editor selection
interface EditorSelectionContextType {
  activeEditorId: string | null;
  setActiveEditorId: (id: string | null) => void;
  lastSelectionPath: [number, number] | null; // [categoryIndex, itemIndex] or null
  setLastSelectionPath: (path: [number, number] | null) => void;
}

const EditorSelectionContext = createContext<EditorSelectionContextType>({
  activeEditorId: null,
  setActiveEditorId: () => {},
  lastSelectionPath: null,
  setLastSelectionPath: () => {}
});

// Use the editor selection context
const useEditorSelection = () => useContext(EditorSelectionContext);

// Utility function to generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

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

// Delete an item from a category
const deleteItemFromCategory = (
  categories: Category[],
  categoryIndex: number,
  itemIndex: number
): Category[] => {
  return categories.map((category, catIdx) => {
    if (catIdx !== categoryIndex) return category;
    
    const newItems = [...(category.items || [])];
    newItems.splice(itemIndex, 1);
    
    return {
      ...category,
      items: newItems
    };
  });
};

// Custom component for category management
const CategoryManager: React.FC<{
  formData: any;
  updateField: (fieldName: string, value: any) => void;
  errors: Record<string, string>;
  saveAttempted: boolean;
}> = ({ formData, updateField, errors, saveAttempted }) => {
  const toast = useToast();
  
  // Editor selection state
  const [activeEditorId, setActiveEditorId] = useState<string | null>(null);
  const [lastSelectionPath, setLastSelectionPath] = useState<[number, number] | null>(null);
  
  // Track last added item for focus management
  const lastAddedItemRef = useRef<{categoryIndex: number, itemIndex: number, id: string | null}>({
    categoryIndex: 0, 
    itemIndex: 0,
    id: null
  });

  // Initialize exactly two categories if they don't exist
  if (!formData.categories || formData.categories.length !== 2) {
    console.log('🚀 [CategoryManager] SYNC INIT - Creating default two categories');
    const defaultCategories: Category[] = [
      {
        id: 'whack-these',
        title: 'Whack These',
        items: [{
          id: generateId(),
          content: '' // Use simple string
        }]
      },
      {
        id: 'do-not-whack',
        title: 'Do Not Whack These',
        items: [{
          id: generateId(),
          content: '' // Use simple string
        }]
      }
    ];
    updateField('categories', defaultCategories);
    console.log('🚀 [CategoryManager] SYNC INIT - Set formData.categories:', defaultCategories);
  }

  // Ensure both categories have items initialized
  let categoriesUpdated = false;
  const safeCategoryData = formData.categories?.map((category: any, index: number) => {
    if (!category.items) {
      console.log('🔧 [CategoryManager] SAFETY - Initializing missing items for category:', category.title);
      categoriesUpdated = true;
      return {
        ...category,
        items: [{
          id: generateId(),
          content: ''
        }]
      };
    }
    // Ensure correct IDs and titles for the two categories
    const updatedCategory = { ...category };
    if (index === 0) {
      updatedCategory.id = 'whack-these';
      updatedCategory.title = 'Whack These';
    } else if (index === 1) {
      updatedCategory.id = 'do-not-whack';
      updatedCategory.title = 'Do Not Whack These';
    }
    return updatedCategory;
  }) || [];

  if (categoriesUpdated) {
    updateField('categories', safeCategoryData);
  }

  const categories: Category[] = safeCategoryData;

  // Handler functions for item management
  const handleItemContentChange = (categoryIndex: number, itemIndex: number, content: any) => {
    console.log('Item content change:', { categoryIndex, itemIndex, content, contentType: typeof content });
    
    const newCategories = [...categories];
    
    // Handle rich text content
    let plainText = '';
    let richContent = content;
    
    // If content is HTML string, extract plain text and keep rich content
    if (typeof content === 'string') {
      // Extract plain text from HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      plainText = tempDiv.textContent || tempDiv.innerText || '';
      richContent = content; // Keep the HTML for rich text
    } else if (Array.isArray(content)) {
      // If it's Slate structure, extract plain text and keep structure
      const traverse = (nodes: any[]) => {
        for (const node of nodes) {
          if (typeof node.text === 'string') {
            plainText += node.text;
          } else if (node.children) {
            traverse(node.children);
          }
        }
      };
      traverse(content);
      richContent = content; // Keep the Slate structure
    } else {
      // Fallback for other types
      plainText = String(content || '');
      richContent = plainText;
    }

    console.log('Processed content:', { 
      plainText, 
      richContent: typeof richContent === 'string' ? richContent : 'Rich structure',
      contentType: typeof richContent
    });

    // Update the item with both plain text and rich content
    newCategories[categoryIndex].items[itemIndex] = {
      ...newCategories[categoryIndex].items[itemIndex],
      content: richContent, // Rich content for editor
      text: plainText // Plain text for game compatibility
    };
    
    updateField('categories', newCategories);
  };

  const handleAddItem = (categoryIndex: number) => {
    const newCategories = [...categories];
    if (newCategories[categoryIndex]) {
      const newItemId = generateId();
      newCategories[categoryIndex].items.push({
        id: newItemId,
        content: '' // Use simple string instead of Slate object
      });
      updateField('categories', newCategories);
      
      // Store information about the newly added item
      lastAddedItemRef.current = {
        categoryIndex,
        itemIndex: newCategories[categoryIndex].items.length - 1,
        id: newItemId
      };
      
      // Use setTimeout to focus the new item after the component has rendered
      setTimeout(() => {
        const { categoryIndex, itemIndex, id } = lastAddedItemRef.current;
        console.log(`Attempting to focus new item at category ${categoryIndex}, item ${itemIndex}, id ${id}`);
        
        const itemElement = document.querySelector(`[data-editor-id="${id}"]`);
        if (itemElement) {
          console.log('Found item element, focusing');
          // Find the actual editable element within the editor wrapper
          const editableElement = itemElement.querySelector('[contenteditable="true"]');
          if (editableElement) {
            (editableElement as HTMLElement).focus();
            // Set active editor ID and selection path
            setActiveEditorId(id);
            setLastSelectionPath([categoryIndex, itemIndex]);
          } else {
            console.log('Could not find editable element');
          }
        } else {
          console.log('Could not find item element with id:', id);
        }
      }, 100);
    }
  };

  const handleMoveItemUp = (categoryIndex: number, itemIndex: number) => {
    if (itemIndex <= 0) return;
    
    const newCategories = [...categories];
    const category = newCategories[categoryIndex];
    if (!category || !category.items) return;
    
    const temp = category.items[itemIndex];
    category.items[itemIndex] = category.items[itemIndex - 1];
    category.items[itemIndex - 1] = temp;
    
    updateField('categories', newCategories);
  };

  const handleMoveItemDown = (categoryIndex: number, itemIndex: number) => {
    const newCategories = [...categories];
    const category = newCategories[categoryIndex];
    if (!category || !category.items || itemIndex >= category.items.length - 1) return;
    
    const temp = category.items[itemIndex];
    category.items[itemIndex] = category.items[itemIndex + 1];
    category.items[itemIndex + 1] = temp;
    
    updateField('categories', newCategories);
  };

  // Handle editor focus event
  const handleEditorFocus = (editorId: string) => (event: React.FocusEvent<HTMLDivElement>) => {
    setActiveEditorId(editorId);
    // Find the category and item index based on the editor ID
    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
      const category = categories[categoryIndex];
      if (!category.items) continue;
      for (let itemIndex = 0; itemIndex < category.items.length; itemIndex++) {
        const item = category.items[itemIndex];
        if (item.id === editorId) {
          setLastSelectionPath([categoryIndex, itemIndex]);
          break;
        }
      }
    }
  };

  const handleDeleteItem = (categoryIndex: number, itemIndex: number) => {
    const updatedCategories = deleteItemFromCategory(categories, categoryIndex, itemIndex);
    
    // If this was the last item in the category, add a new empty item
    if (updatedCategories[categoryIndex] && updatedCategories[categoryIndex].items.length === 0) {
      updatedCategories[categoryIndex].items.push({
        id: generateId(),
        content: '' // Use simple string
      });
    }
    
    updateField('categories', updatedCategories);
  };

  return (
    <EditorSelectionContext.Provider value={{
      activeEditorId,
      setActiveEditorId,
      lastSelectionPath,
      setLastSelectionPath
    }}>
      <VStack spacing={6} align="stretch">
        <Text fontSize="sm" color="gray.600" mb={4}>
          Create two categories of words or phrases: items students should "whack" and items they should avoid.
        </Text>
        
        <Tabs>
          <TabList>
            <Tab>
              <HStack>
                <Text>Whack These</Text>
                <Badge colorScheme="green" variant="subtle">
                  {categories[0]?.items?.length || 0} items
                </Badge>
              </HStack>
            </Tab>
            <Tab>
              <HStack>
                <Text>Do Not Whack These</Text>
                <Badge colorScheme="red" variant="subtle">
                  {categories[1]?.items?.length || 0} items
                </Badge>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
            {/* Whack These Tab */}
            <TabPanel>
              <Box 
                p={4} 
                borderWidth="1px" 
                borderRadius="md" 
                className="category-box"
              >
                <VStack align="start" spacing={1} mb={4}>
                  <Heading size="md" color="green.600">Whack These</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Words or phrases that students should hit to earn points
                  </Text>
                </VStack>
                
                <Box mb={4}>
                  <FormLabel>Items</FormLabel>
                  <Text fontSize="sm" color="gray.600" mb={3}>
                    Enter items to be displayed on moles that players should hit. (Minimum 1 Item)
                  </Text>
                  
                  {(categories[0]?.items || []).map((item, itemIndex) => (
                    <Box 
                      key={item.id || `item-0-${itemIndex}`}
                      mb={2}
                    >
                      <Flex 
                        align="center"
                        direction="row"
                      >
                        <Text 
                          mr={2} 
                          fontWeight="bold" 
                          width="25px" 
                          color="gray.500"
                        >
                          {itemIndex + 1}.
                        </Text>
                        <Box 
                          flex="1" 
                          mr={2}
                        >
                          <MemoizedItemEditor
                            value={item.content}
                            onChange={(content) => handleItemContentChange(0, itemIndex, content)}
                            onFocus={handleEditorFocus(item.id)}
                            placeholder={`Enter word ${itemIndex + 1}`}
                            editorId={item.id}
                          />
                        </Box>
                        <HStack spacing={1}>
                          <IconButton
                            icon={<ChevronUpIcon boxSize={3} />}
                            aria-label="Move item up"
                            size="sm"
                            variant="ghost"
                            isDisabled={itemIndex === 0}
                            onClick={() => handleMoveItemUp(0, itemIndex)}
                            mr={1}
                            sx={appleStyleIconButton}
                            className="apple-button"
                          />
                          <IconButton
                            icon={<ChevronDownIcon boxSize={3} />}
                            aria-label="Move item down"
                            size="sm"
                            variant="ghost"
                            isDisabled={!categories[0]?.items || itemIndex === categories[0].items.length - 1}
                            onClick={() => handleMoveItemDown(0, itemIndex)}
                            mr={1}
                            sx={appleStyleIconButton}
                            className="apple-button"
                          />
                          <IconButton
                            icon={<DeleteIcon boxSize={4} />}
                            aria-label="Delete item"
                            size="sm"
                            variant="ghost"
                            isDisabled={!categories[0]?.items || categories[0].items.length <= 1}
                            onClick={() => handleDeleteItem(0, itemIndex)}
                            sx={subtleDeleteButton}
                            className="apple-button"
                          />
                        </HStack>
                      </Flex>
                    </Box>
                  ))}
                  
                  <Button 
                    leftIcon={<AddIcon />}
                    onClick={() => handleAddItem(0)}
                    size="sm" 
                    colorScheme="green"
                    _hover={{ bg: 'green.600' }}
                    className="apple-button apple-button-primary"
                    mt={4}
                  >
                    Add Item to Whack
                  </Button>
                </Box>
              </Box>
            </TabPanel>

            {/* Do Not Whack These Tab */}
            <TabPanel>
              <Box 
                p={4} 
                borderWidth="1px" 
                borderRadius="md" 
                className="category-box"
              >
                <VStack align="start" spacing={1} mb={4}>
                  <Heading size="md" color="red.600">Do Not Whack These</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Words or phrases that students should avoid (distractors that cause point penalties)
                  </Text>
                </VStack>
                
                <Box mb={4}>
                  <FormLabel>Items</FormLabel>
                  <Text fontSize="sm" color="gray.600" mb={3}>
                    Enter items to be displayed on moles that players should avoid hitting. (Minimum 1 Item)
                  </Text>
                  
                  {(categories[1]?.items || []).map((item, itemIndex) => (
                    <Box 
                      key={item.id || `item-1-${itemIndex}`}
                      mb={2}
                    >
                      <Flex 
                        align="center"
                        direction="row"
                      >
                        <Text 
                          mr={2} 
                          fontWeight="bold" 
                          width="25px" 
                          color="gray.500"
                        >
                          {itemIndex + 1}.
                        </Text>
                        <Box 
                          flex="1" 
                          mr={2}
                        >
                          <MemoizedItemEditor
                            value={item.content}
                            onChange={(content) => handleItemContentChange(1, itemIndex, content)}
                            onFocus={handleEditorFocus(item.id)}
                            placeholder={`Enter word ${itemIndex + 1}`}
                            editorId={item.id}
                          />
                        </Box>
                        <HStack spacing={1}>
                          <IconButton
                            icon={<ChevronUpIcon boxSize={3} />}
                            aria-label="Move item up"
                            size="sm"
                            variant="ghost"
                            isDisabled={itemIndex === 0}
                            onClick={() => handleMoveItemUp(1, itemIndex)}
                            mr={1}
                            sx={appleStyleIconButton}
                            className="apple-button"
                          />
                          <IconButton
                            icon={<ChevronDownIcon boxSize={3} />}
                            aria-label="Move item down"
                            size="sm"
                            variant="ghost"
                            isDisabled={!categories[1]?.items || itemIndex === categories[1].items.length - 1}
                            onClick={() => handleMoveItemDown(1, itemIndex)}
                            mr={1}
                            sx={appleStyleIconButton}
                            className="apple-button"
                          />
                          <IconButton
                            icon={<DeleteIcon boxSize={4} />}
                            aria-label="Delete item"
                            size="sm"
                            variant="ghost"
                            isDisabled={!categories[1]?.items || categories[1].items.length <= 1}
                            onClick={() => handleDeleteItem(1, itemIndex)}
                            sx={subtleDeleteButton}
                            className="apple-button"
                          />
                        </HStack>
                      </Flex>
                    </Box>
                  ))}
                  
                  <Button 
                    leftIcon={<AddIcon />}
                    onClick={() => handleAddItem(1)}
                    size="sm" 
                    colorScheme="red"
                    _hover={{ bg: 'red.600' }}
                    className="apple-button apple-button-primary"
                    mt={4}
                  >
                    Add Item to Avoid
                  </Button>
                </Box>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
        
        {categories.length === 0 && (
          <Box textAlign="center" py={8} color="gray.500">
            <Text>No categories created yet.</Text>
            <Text fontSize="sm">Categories will be automatically created.</Text>
          </Box>
        )}
      </VStack>
    </EditorSelectionContext.Provider>
  );
};

// Convert Category to WordCategory format (for backward compatibility)
const convertCategoryToWordCategory = (category: Category) => {
  return {
    title: category.title,
    words: (category.items || []).map(item => {
      // First try to use the plain text field
      if (item.text) return item.text;
      
      // Extract plain text from the rich text content
      if (typeof item.content === 'string') {
        // Extract from HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = item.content;
        return tempDiv.textContent || tempDiv.innerText || '';
      }
      
      try {
        // Extract text from Slate structure
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
        
        traverse(Array.isArray(item.content) ? item.content : []);
        return text.trim();
      } catch (e) {
        console.error('Error extracting text from rich content:', e);
        return '';
      }
    }).filter(Boolean)
  };
};

export const whackAMoleSchema: ConfigSchema = {
  gameType: 'whack-a-mole',
  title: 'Whack-a-Mole Configuration',
  description: 'Create a 3D word categorization game where students "whack" the correct moles that appear.',
  
  sections: [
    {
      title: 'Game Settings',
      description: 'Configure basic game parameters',
      fields: [
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          placeholder: 'Enter a title for this game',
          defaultValue: ''
        },
        {
          name: 'gameTime',
          label: 'Game Time (seconds)',
          type: 'number',
          required: true,
          min: 30,
          max: 300,
          defaultValue: 30,
          width: '200px',
          helpText: 'How long each game session lasts'
        },
        {
          name: 'gameSpeed',
          label: 'Game Speed',
          type: 'select',
          required: true,
          options: [
            { value: 1, label: 'Slow (10-12 moles)' },
            { value: 2, label: 'Medium (14-16 moles)' },
            { value: 3, label: 'Fast (17-19 moles)' }
          ],
          defaultValue: 2,
          width: '300px',
          helpText: 'Controls how frequently moles appear during the game'
        },
        {
          name: 'instructions',
          label: 'Game Instructions',
          type: 'textarea',
          placeholder: 'Enter custom instructions for players',
          helpText: 'Custom instructions to show on the game start screen. If left empty, default instructions will be shown.'
        }
      ]
    },
    {
      title: 'Scoring Settings',
      description: 'Configure how points are awarded and deducted',
      fields: [
        {
          name: 'pointsPerHit',
          label: 'Points Per Hit',
          type: 'number',
          required: true,
          min: 1,
          max: 100,
          defaultValue: 10,
          width: '150px',
          helpText: 'Points awarded for hitting a correct mole'
        },
        {
          name: 'penaltyPoints',
          label: 'Penalty Points',
          type: 'number',
          required: true,
          min: 0,
          max: 50,
          defaultValue: 5,
          width: '150px',
          helpText: 'Points deducted for hitting an incorrect mole'
        },
        {
          name: 'bonusPoints',
          label: 'Bonus Points',
          type: 'number',
          required: true,
          min: 0,
          max: 100,
          defaultValue: 10,
          width: '150px',
          helpText: 'Extra points for hitting multiple correct moles in a row'
        },
        {
          name: 'bonusThreshold',
          label: 'Bonus Threshold',
          type: 'number',
          required: true,
          min: 2,
          max: 10,
          defaultValue: 3,
          width: '150px',
          helpText: 'How many consecutive hits needed to trigger bonus points'
        }
      ]
    },
    {
      title: 'Categories',
      description: 'Create words that students should "whack" and words they should avoid',
      component: CategoryManager
    },
    {
      title: 'Sharing',
      description: 'Make your game available to other teachers',
      fields: [
        {
          name: 'share',
          label: 'Share this game publicly',
          type: 'switch',
          defaultValue: false,
          helpText: 'Public games can be used by other teachers as templates'
        }
      ]
    }
  ],
  
  customValidation: (formData) => {
    // Basic validation (like working schemas)
    if (!formData || !formData.title || !formData.title.trim()) {
      return 'Please enter a title for your game';
    }

    // Validate that we have exactly two categories
    if (!formData.categories || formData.categories.length !== 2) {
      return 'Both "Whack These" and "Do Not Whack These" categories are required';
    }
    
    // Check both categories have items
    const whackTheseCategory = formData.categories[0];
    const doNotWhackCategory = formData.categories[1];
    
    if (!whackTheseCategory.items || whackTheseCategory.items.length === 0) {
      return '"Whack These" category must have at least one item';
    }
    
    if (!doNotWhackCategory.items || doNotWhackCategory.items.length === 0) {
      return '"Do Not Whack These" category must have at least one item';
    }
    
    // Check if items have content in both categories
    for (const [categoryIndex, category] of formData.categories.entries()) {
      const categoryName = categoryIndex === 0 ? 'Whack These' : 'Do Not Whack These';
      
      for (const item of category.items) {
        const hasContent = item.text || 
          (typeof item.content === 'string' && item.content.trim()) ||
          (Array.isArray(item.content) && item.content.some((node: any) => 
            typeof node.text === 'string' && node.text.trim()
          ));
        if (!hasContent) {
          return `All items in "${categoryName}" category must have content`;
        }
      }
    }
    
    return undefined;
  },
  
  generateConfig: (formData, currentUser) => {
    // Handle case where formData is undefined or null
    if (!formData) {
      formData = {};
    }
    
    // CRITICAL: Force initialization of required fields if they don't exist
    if (formData.share === undefined) {
      formData.share = false;
    }
    
    // Initialize formData fields if they don't exist (extra safety)
    const safeFormData = {
      title: 'Whack-a-Mole Game',
      gameTime: 30,
      pointsPerHit: 10,
      penaltyPoints: 5,
      bonusPoints: 10,
      bonusThreshold: 3,
      gameSpeed: 2,
      instructions: '',
      share: false,
      categories: [],
      ...formData // Override with actual values if they exist
    };
    
    // Ensure all fields have proper default values
    const share = safeFormData.share !== undefined ? Boolean(safeFormData.share) : false;
    const gameTime = Number(safeFormData.gameTime) || 30;
    const pointsPerHit = Number(safeFormData.pointsPerHit) || 10;
    const penaltyPoints = Number(safeFormData.penaltyPoints) || 5;
    const bonusPoints = Number(safeFormData.bonusPoints) || 10;
    const bonusThreshold = Number(safeFormData.bonusThreshold) || 3;
    const gameSpeed = Number(safeFormData.gameSpeed) || 2;
    const instructions = safeFormData.instructions || '';
    
    // Convert the two categories to the format expected by the game
    // The game expects the first category to be the "correct" category (Whack These)
    const whackTheseCategory = safeFormData.categories?.[0];
    const doNotWhackCategory = safeFormData.categories?.[1];
    
    const wordCategories = [];
    
    // Add "Whack These" category as the first (correct) category
    if (whackTheseCategory) {
      wordCategories.push(convertCategoryToWordCategory(whackTheseCategory));
    }
    
    // Add "Do Not Whack These" category as additional categories
    if (doNotWhackCategory) {
      wordCategories.push(convertCategoryToWordCategory(doNotWhackCategory));
    }
    
    // Create final config object with all required fields
    const config = {
      type: 'whack-a-mole' as const,
      title: safeFormData.title || 'Whack-a-Mole Game',
      gameTime: gameTime,
      pointsPerHit: pointsPerHit,
      penaltyPoints: penaltyPoints,
      bonusPoints: bonusPoints,
      bonusThreshold: bonusThreshold,
      speed: gameSpeed,
      instructions: instructions,
      categories: wordCategories,
      richCategories: [whackTheseCategory, doNotWhackCategory].filter(Boolean).map((category: Category) => {
        return {
          id: category.id || generateId(), // Ensure id is never undefined
          title: category.title || '',
          items: (category.items || []).map(item => {
            // Ensure we extract plain text properly for the text field
            let plainText = item.text || '';
            
            // If we don't have plain text, extract it from content
            if (!plainText && item.content) {
              if (typeof item.content === 'string') {
                // Extract from HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = item.content;
                plainText = tempDiv.textContent || tempDiv.innerText || '';
              } else if (Array.isArray(item.content)) {
                // Extract from Slate structure
                const traverse = (nodes: any[]) => {
                  for (const node of nodes) {
                    if (typeof node.text === 'string') {
                      plainText += node.text;
                    } else if (node.children) {
                      traverse(node.children);
                    }
                  }
                };
                traverse(item.content);
              }
            }
            
            // Ensure no undefined values
            const processedItem: any = {
              id: item.id || generateId(), // Ensure id is never undefined
              text: plainText || '' // Ensure text is never undefined
            };
            
            // Only add content field if it has a valid value (avoid undefined)
            if (item.content !== undefined && item.content !== null) {
              processedItem.content = item.content;
            }
            
            return processedItem;
          })
        };
      }),
      share: share,
      description: `3D word categorization game with "Whack These" and "Do Not Whack These" categories`,
      email: currentUser?.email,
      userId: currentUser?.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    return config;
  }
}; 