import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  FormControl,
  FormLabel,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  HStack,
  Text,
  Button,
} from '@chakra-ui/react';
import { GameConfig } from './types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameConfig: GameConfig;
  onConfigChange: (config: GameConfig) => void;
  onStartGame: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  gameConfig,
  onConfigChange,
  onStartGame,
}) => {
  const updateConfig = (updates: Partial<GameConfig>) => {
    onConfigChange({ ...gameConfig, ...updates });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Game Configuration</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Difficulty</FormLabel>
              <Select
                value={gameConfig.difficulty}
                onChange={(e) => updateConfig({
                  difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel>Number of Eggs</FormLabel>
              <NumberInput
                min={5}
                max={20}
                value={gameConfig.totalEggs}
                onChange={(_, value) => updateConfig({ totalEggs: value })}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel>Syllable Range</FormLabel>
              <HStack>
                <NumberInput
                  min={1}
                  max={gameConfig.maxSyllables}
                  value={gameConfig.minSyllables}
                  onChange={(_, value) => updateConfig({ minSyllables: value })}
                >
                  <NumberInputField placeholder="Min" />
                </NumberInput>
                <Text>to</Text>
                <NumberInput
                  min={gameConfig.minSyllables}
                  max={5}
                  value={gameConfig.maxSyllables}
                  onChange={(_, value) => updateConfig({ maxSyllables: value })}
                >
                  <NumberInputField placeholder="Max" />
                </NumberInput>
              </HStack>
            </FormControl>
            
            <Button colorScheme="blue" onClick={onStartGame} width="100%">
              Start Game
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}; 