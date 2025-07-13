import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { generateAndUploadThumbnail } from '../../utils/thumbnailGenerator';
import {
  Box,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Switch,
  Button,
  useToast,
  Heading,
  Text,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertDescription,
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';

// Common configuration interface
export interface BaseGameConfig {
  id?: string;
  title: string;
  type: string;
  description?: string;
  instructions?: string;
  share: boolean;
  userId?: string;
  email?: string;
  createdAt?: any;
  updatedAt?: any;
  thumbnail?: string;
}

// Configuration field types
export interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'switch' | 'slider' | 'custom';
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: any;
  validation?: (value: any) => string | undefined;
  component?: React.ComponentType<any>;
}

// Configuration section interface
export interface ConfigSection {
  title: string;
  description?: string;
  fields: ConfigField[];
  component?: React.ComponentType<any>; // For complex custom sections
}

// Configuration schema interface
export interface ConfigSchema {
  gameType: string;
  title: string;
  description: string;
  sections: ConfigSection[];
  customValidation?: (config: any) => string | undefined;
  generateConfig?: (formData: any, currentUser?: any) => any;
}

// Configuration Framework Props
interface ConfigurationFrameworkProps {
  schema: ConfigSchema;
  onSave?: (config: any) => Promise<void>;
  onCancel?: () => void;
  initialData?: any;
  isEditing?: boolean;
  documentId?: string; // Add document ID for updates
}

// Apple-style CSS (shared across all configurations)
const styles = `
  body {
    background-color: #E6F3FF !important;
    min-height: 100vh;
  }
  
  .apple-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    background-color: #E6F3FF;
    min-height: 100vh;
    padding: 20px;
  }
  
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
`;

// Field renderer component
const FieldRenderer: React.FC<{
  field: ConfigField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  saveAttempted?: boolean;
}> = ({ field, value, onChange, error, saveAttempted }) => {
  const isInvalid = saveAttempted && field.required && !value;

  switch (field.type) {
    case 'text':
      return (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          isInvalid={isInvalid}
          className="apple-input"
        />
      );
    
    case 'textarea':
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          isInvalid={isInvalid}
          className="apple-input"
          rows={3}
        />
      );
    
    case 'number':
      return (
        <NumberInput
          value={value || field.defaultValue || 0}
          onChange={(valueString) => onChange(parseInt(valueString) || field.defaultValue || 0)}
          min={field.min}
          max={field.max}
          step={field.step}
          isInvalid={isInvalid}
        >
          <NumberInputField className="apple-input" />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      );
    
    case 'select':
      return (
        <Select
          value={value || field.defaultValue || ''}
          onChange={(e) => {
            // Find the original option to preserve the correct type (number vs string)
            const selectedOption = field.options?.find(opt => opt.value.toString() === e.target.value);
            onChange(selectedOption ? selectedOption.value : e.target.value);
          }}
          placeholder={field.placeholder}
          isInvalid={isInvalid}
          className="apple-input"
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    
    case 'switch':
      return (
        <Switch
          isChecked={value || false}
          onChange={(e) => onChange(e.target.checked)}
          colorScheme="blue"
        />
      );
    
    case 'custom':
      if (field.component) {
        const Component = field.component;
        return <Component value={value} onChange={onChange} field={field} />;
      }
      return null;
    
    default:
      return <Text>Unsupported field type: {field.type}</Text>;
  }
};

// Section renderer component
const SectionRenderer: React.FC<{
  section: ConfigSection;
  formData: any;
  updateField: (fieldName: string, value: any) => void;
  errors: Record<string, string>;
  saveAttempted: boolean;
}> = ({ section, formData, updateField, errors, saveAttempted }) => {
  // If section has a custom component, use it
  if (section.component) {
    const Component = section.component;
    return (
      <Card>
        <CardHeader>
          <Heading size="md">{section.title}</Heading>
          {section.description && (
            <Text color="gray.600" fontSize="sm" mt={1}>
              {section.description}
            </Text>
          )}
        </CardHeader>
        <CardBody>
          <Component
            formData={formData}
            updateField={updateField}
            errors={errors}
            saveAttempted={saveAttempted}
          />
        </CardBody>
      </Card>
    );
  }

  // Render standard fields
  return (
    <Card>
      <CardHeader>
        <Heading size="md">{section.title}</Heading>
        {section.description && (
          <Text color="gray.600" fontSize="sm" mt={1}>
            {section.description}
          </Text>
        )}
      </CardHeader>
      <CardBody>
        <VStack spacing={4}>
          {section.fields.map((field) => (
            <FormControl key={field.name} isInvalid={!!errors[field.name]}>
              <FormLabel>{field.label}</FormLabel>
              <FieldRenderer
                field={field}
                value={formData[field.name]}
                onChange={(value) => updateField(field.name, value)}
                error={errors[field.name]}
                saveAttempted={saveAttempted}
              />
              {field.helpText && (
                <Text fontSize="sm" color="gray.600" mt={1}>
                  {field.helpText}
                </Text>
              )}
              {errors[field.name] && (
                <Alert status="error" mt={2}>
                  <AlertIcon />
                  <AlertDescription>{errors[field.name]}</AlertDescription>
                </Alert>
              )}
            </FormControl>
          ))}
        </VStack>
      </CardBody>
    </Card>
  );
};

// Main Configuration Framework Component
export const ConfigurationFramework: React.FC<ConfigurationFrameworkProps> = ({
  schema,
  onSave,
  onCancel,
  initialData = {},
  isEditing = false,
  documentId,
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();
  
  // Initialize form data with default values from schema
  const initializeFormData = () => {
    const defaults: any = {};
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          defaults[field.name] = field.defaultValue;
        }
      });
    });
    return { ...defaults, ...initialData };
  };

  const [formData, setFormData] = useState(initializeFormData());
  const [isLoading, setIsLoading] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
  const { safeNavigate } = useUnsavedChanges(hasUnsavedChanges);

  // Inject CSS styles
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Update form field
  const updateField = (fieldName: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [fieldName]: value }));
    // Clear error when field is updated
    if (errors[fieldName]) {
      setErrors((prev: Record<string, string>) => ({ ...prev, [fieldName]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validate all fields
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.required && !formData[field.name]) {
          newErrors[field.name] = `${field.label} is required`;
        }
        if (field.validation) {
          const validationError = field.validation(formData[field.name]);
          if (validationError) {
            newErrors[field.name] = validationError;
          }
        }
      });
    });

    // Custom validation
    if (schema.customValidation) {
      const customError = schema.customValidation(formData);
      if (customError) {
        newErrors.custom = customError;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    setSaveAttempted(true);
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors below before saving.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      // Generate final config using schema function or default
      const finalConfig = schema.generateConfig 
        ? schema.generateConfig(formData, currentUser)
        : {
            ...formData,
            type: schema.gameType,
            userId: currentUser?.uid,
            email: currentUser?.email,
            createdAt: serverTimestamp(),
          };

      if (onSave) {
        await onSave(finalConfig);
      } else {
        // Default save behavior
        if (documentId) {
          await updateDoc(doc(db, 'userGameConfigs', documentId), finalConfig);
        } else {
          const docRef = await addDoc(collection(db, 'userGameConfigs'), finalConfig);
          
          // Generate thumbnail
          try {
            const thumbnailUrl = await generateAndUploadThumbnail(docRef.id, finalConfig);
            await updateDoc(doc(db, 'userGameConfigs', docRef.id), {
              thumbnail: thumbnailUrl
            });
          } catch (thumbnailError) {
            console.error('Error generating thumbnail:', thumbnailError);
          }
        }
      }

      toast({
        title: 'Success',
        description: 'Configuration saved successfully!',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      
      // Check if it's a Firebase undefined field error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isUndefinedFieldError = errorMessage.includes('Unsupported field value: undefined');
      
      let userFriendlyMessage = 'Failed to save configuration. Please try again.';
      if (isUndefinedFieldError) {
        // Extract the field name from the error
        const fieldMatch = errorMessage.match(/found in field (\w+)/);
        const fieldName = fieldMatch ? fieldMatch[1] : 'unknown field';
        userFriendlyMessage = `Configuration error: The "${fieldName}" field has an invalid value. Please refresh the page and try again.`;
      }
      
      toast({
        title: 'Save Failed',
        description: userFriendlyMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      safeNavigate('/');
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
    <Box className="apple-container" p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>
            {isEditing ? `Edit ${schema.title}` : `Create ${schema.title}`}
          </Heading>
          <Text color="gray.600">
            {schema.description}
          </Text>
        </Box>

        {/* Global errors */}
        {errors.custom && (
          <Alert status="error">
            <AlertIcon />
            <AlertDescription>{errors.custom}</AlertDescription>
          </Alert>
        )}

        {/* Render sections */}
        {schema.sections.map((section, index) => (
          <SectionRenderer
            key={index}
            section={section}
            formData={formData}
            updateField={updateField}
            errors={errors}
            saveAttempted={saveAttempted}
          />
        ))}

        {/* Action Buttons */}
        <HStack spacing={4} justify="flex-end">
          <Button
            onClick={handleCancel}
            variant="ghost"
            className="apple-button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            colorScheme="blue"
            isLoading={isLoading}
            loadingText="Saving..."
            className="apple-button apple-button-primary"
          >
            Save Game Configuration
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default ConfigurationFramework; 