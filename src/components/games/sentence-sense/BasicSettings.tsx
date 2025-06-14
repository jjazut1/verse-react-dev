import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  VStack,
} from '@chakra-ui/react';
import { ConfigSectionProps } from './types';

export const BasicSettings: React.FC<ConfigSectionProps> = ({ config, onUpdate }) => (
  <Card>
    <CardHeader>
      <Heading size="md">Game Settings</Heading>
    </CardHeader>
    <CardBody>
      <VStack spacing={4} align="stretch">
        <FormControl>
          <FormLabel>Game Title</FormLabel>
          <Input
            value={config.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Enter game title"
          />
        </FormControl>

        <FormControl>
          <FormLabel>Feedback Duration</FormLabel>
          <Select
            value={config.correctFeedbackDuration}
            onChange={(e) => onUpdate({ correctFeedbackDuration: e.target.value as 'always' | 'momentary' })}
          >
            <option value="momentary">Momentary (2 seconds)</option>
            <option value="always">Always Visible</option>
          </Select>
        </FormControl>
      </VStack>
    </CardBody>
  </Card>
); 