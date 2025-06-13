import React from 'react';
import { 
  VStack, 
  Button
} from '@chakra-ui/react';
import { GameConfig } from '../../../types/game';
import { SpinnerWheelItem } from './types';

interface ZoomedControlsProps {
  isZoomed: boolean;
  selected: string | null;
  items: SpinnerWheelItem[];
  config: GameConfig;
  onZoomOut: () => void;
  onRemoveSelected: () => void;
}

export const ZoomedControls: React.FC<ZoomedControlsProps> = ({
  isZoomed,
  selected,
  items,
  config,
  onZoomOut,
  onRemoveSelected
}) => {
  if (!isZoomed) return null;

  return (
    <>
      {/* Floating buttons when zoomed - positioned above pointer area */}
      <VStack 
        position="absolute" 
        top="80px" 
        left="-155px" 
        spacing={3}
        zIndex={1000}
      >
        <Button
          onClick={onZoomOut}
          bg="#4ECDC4"
          color="white"
          _hover={{ bg: "#45B7D1" }}
          _active={{ bg: "#3A9BC1" }}
          size="md"
          fontSize="lg"
          px={6}
          py={4}
          borderRadius="full"
          shadow="lg"
        >
          🔍 ZOOM OUT
        </Button>
        
        {((config as any).removeOnSelect) && selected && (
          <Button
            onClick={onRemoveSelected}
            bg="#F5F5DC"
            color="#8B4513"
            _hover={{ bg: "#F0E68C" }}
            _active={{ bg: "#DDD6C1" }}
            size="md"
            fontSize="lg"
            px={6}
            py={4}
            borderRadius="full"
            shadow="lg"
            leftIcon={<span>🗑️</span>}
          >
            REMOVE
          </Button>
        )}
      </VStack>
    </>
  );
}; 