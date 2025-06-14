import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useBreakpointValue
} from '@chakra-ui/react';
import { GameState, SortCategoriesConfig } from './types';
import GameConfig from './GameConfig';

interface ConfigModalProps {
  gameState: GameState;
  onClose: () => void;
  onConfigSelect: (config: SortCategoriesConfig) => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ 
  gameState, 
  onClose, 
  onConfigSelect 
}) => {
  const modalSize = useBreakpointValue({ base: "sm", md: "md", lg: "xl" });

  return (
    <Modal 
      isOpen={gameState.isConfigModalOpen} 
      onClose={onClose} 
      size={modalSize}
    >
      <ModalOverlay />
      <ModalContent maxH="90vh" overflow="hidden">
        <ModalHeader fontFamily="'Comic Neue', sans-serif">
          Select Game Configuration
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody p={0} overflow="auto">
          <GameConfig
            isOpen={gameState.isConfigModalOpen}
            onClose={onClose}
            onConfigSelect={onConfigSelect}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ConfigModal; 