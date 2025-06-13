import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Heading,
  VStack,
  HStack,
  Text,
  Badge,
} from '@chakra-ui/react';
import { ConfigSectionProps } from './types';

export const ConfigSummary: React.FC<ConfigSectionProps> = ({ config }) => (
  <Card>
    <CardHeader>
      <Heading size="md">Configuration Summary</Heading>
    </CardHeader>
    <CardBody>
      <VStack spacing={2} align="stretch">
        <HStack justify="space-between">
          <Text>Total Sentences:</Text>
          <Badge colorScheme="blue">{config.sentences.length}</Badge>
        </HStack>
        <HStack justify="space-between">
          <Text>Average Words per Sentence:</Text>
          <Badge colorScheme="green">
            {config.sentences.length > 0 
              ? Math.round(config.sentences.reduce((acc, sentence) => 
                  acc + (sentence.original?.split(' ').length || 0), 0) / config.sentences.length)
              : 0}
          </Badge>
        </HStack>
        <HStack justify="space-between">
          <Text>Public Game:</Text>
          <Badge colorScheme={config.share ? "blue" : "gray"}>
            {config.share ? "Yes" : "No"}
          </Badge>
        </HStack>
      </VStack>
    </CardBody>
  </Card>
); 