import React from 'react';
import { VStack, Heading, Text } from '@chakra-ui/react';

export const ConfigHeader: React.FC = () => (
  <VStack spacing={6} align="stretch">
    {/* Header */}
    <VStack align="start" spacing={1}>
      <Heading size="lg" color="blue.500">
        📝 Sentence Sense Configuration
      </Heading>
      <Text color="gray.600" fontSize="sm">
        Configure your word arrangement game
      </Text>
    </VStack>
  </VStack>
); 