import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  FormControl,
  FormLabel,
  Heading,
  Textarea,
  VStack,
  HStack,
  Text,
  IconButton,
  Badge,
  Alert,
  AlertIcon,
  Button,
  Flex,
  Box,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { SentenceEditorProps, SentenceItem } from './types';

export const SentenceEditor: React.FC<SentenceEditorProps> = ({
  config,
  onAddSentence,
  onUpdateSentence,
  onRemoveSentence,
}) => (
  <Card>
    <CardHeader>
      <Flex justify="space-between" align="center">
        <VStack align="start" spacing={1}>
          <Heading size="md">Sentences</Heading>
          <Text fontSize="sm" color="gray.600">
            Add sentences for students to arrange from scrambled words
          </Text>
        </VStack>
        <Button
          leftIcon={<AddIcon />}
          onClick={onAddSentence}
          colorScheme="blue"
          size="sm"
        >
          Add Sentence
        </Button>
      </Flex>
    </CardHeader>
    <CardBody>
      <VStack spacing={4} align="stretch">
        {config.sentences.length === 0 ? (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            No sentences added yet. Click "Add Sentence" to get started.
          </Alert>
        ) : (
          <Accordion allowMultiple>
            {config.sentences.map((sentence, index) => (
              <AccordionItem key={sentence.id} border="1px" borderColor="gray.200" borderRadius="md" mb={2}>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <HStack justify="space-between">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">
                          Sentence {index + 1}
                          {sentence.original && (
                            <Badge ml={2} colorScheme="blue" variant="outline">
                              {sentence.original.split(' ').length} words
                            </Badge>
                          )}
                        </Text>
                        {sentence.original && (
                          <Text fontSize="sm" color="gray.600" noOfLines={1}>
                            {sentence.original}
                          </Text>
                        )}
                      </VStack>
                      <HStack spacing={2}>
                        <IconButton
                          aria-label="Delete sentence"
                          icon={<DeleteIcon />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveSentence(index);
                          }}
                        />
                      </HStack>
                    </HStack>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack spacing={4} align="stretch">
                    <FormControl isRequired>
                      <FormLabel>Sentence</FormLabel>
                      <Textarea
                        value={sentence.original}
                        onChange={(e) => onUpdateSentence(index, { original: e.target.value })}
                        placeholder="Enter the complete sentence (e.g., 'The quick brown fox jumps over the lazy dog')"
                        rows={2}
                      />
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        This sentence will be broken into words and scrambled for the student to rearrange.
                      </Text>
                    </FormControl>

                    {sentence.original && (
                      <Box bg="gray.50" p={3} borderRadius="md">
                        <Text fontSize="sm" fontWeight="medium" mb={2}>Preview:</Text>
                        <Text fontSize="sm" color="gray.600">
                          <strong>Words to arrange:</strong> {sentence.original.split(' ').map((word, i) => (
                            <Badge key={i} mr={1} mb={1} colorScheme="blue" variant="outline" style={{ textTransform: 'none' }}>
                              {word}
                            </Badge>
                          ))}
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </VStack>
    </CardBody>
  </Card>
); 