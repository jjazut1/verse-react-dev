import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  FormControl,
  FormLabel,
  Heading,
  Switch,
  Text,
} from '@chakra-ui/react';
import { ConfigSectionProps } from './types';

export const SharingSettings: React.FC<ConfigSectionProps> = ({ config, onUpdate }) => (
  <Card>
    <CardHeader>
      <Heading size="md">Sharing</Heading>
    </CardHeader>
    <CardBody>
      <FormControl display="flex" alignItems="center">
        <FormLabel mb="0">Share this game publicly</FormLabel>
        <Switch
          isChecked={config.share}
          onChange={(e) => onUpdate({ share: e.target.checked })}
          colorScheme="blue"
        />
      </FormControl>
      <Text fontSize="sm" color="gray.600" mt={2}>
        Public games can be used by other teachers as templates.
      </Text>
    </CardBody>
  </Card>
); 