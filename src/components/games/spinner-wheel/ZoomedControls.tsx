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
  wheelSize?: number; // Add optional wheelSize prop
}

export const ZoomedControls: React.FC<ZoomedControlsProps> = ({
  isZoomed,
  selected,
  items,
  config,
  onZoomOut,
  onRemoveSelected,
  wheelSize = 480 // Default to original size
}) => {
  if (!isZoomed) return null;

  // Button size adjustments for smaller screens
  const buttonSize = wheelSize < 320 ? 'sm' : 'md';
  const fontSize = wheelSize < 320 ? 'sm' : 'md';
  const paddingX = wheelSize < 320 ? 3 : 4;
  const paddingY = wheelSize < 320 ? 2 : 3;

  return (
    <>
      {/* Floating buttons when zoomed - positioned at top center */}
      <VStack 
        position="fixed" // Use fixed positioning for better mobile support
        top="70px" // Optimized position below PWA header
        left="50%" // Center horizontally
        transform="translateX(-50%)" // Adjust for true centering
        spacing={4} // Increased spacing between buttons to prevent mistakes
        zIndex={1001} // Higher z-index to ensure visibility
        align="center"
        // Make background match page background to be invisible
        bg="#E6F3FF" // Match the page background color
        borderRadius="lg"
        p={3}
        // Remove visible styling to make container invisible
        shadow="none"
        border="none"
      >
        {/* ZOOM OUT button - always show when zoomed */}
        <Button
          onClick={onZoomOut}
          bg="#4ECDC4"
          color="white"
          _hover={{ bg: "#45B7D1" }}
          _active={{ bg: "#3A9BC1" }}
          size={buttonSize}
          fontSize={fontSize}
          px={paddingX}
          py={paddingY}
          borderRadius="full"
          shadow="lg"
          border="2px solid white"
          minW="120px" // Ensure consistent button width
        >
          🔍 ZOOM OUT
        </Button>
        
        {/* REMOVE button - only show if removeOnSelect is enabled and item is selected */}
        {((config as any).removeOnSelect) && selected && (
          <Button
            onClick={onRemoveSelected}
            bg="#F5F5DC"
            color="#8B4513"
            _hover={{ bg: "#F0E68C" }}
            _active={{ bg: "#DDD6C1" }}
            size={buttonSize}
            fontSize={fontSize}
            px={paddingX}
            py={paddingY}
            borderRadius="full"
            shadow="lg"
            border="2px solid white"
            leftIcon={<span>🗑️</span>}
            minW="120px" // Ensure consistent button width
          >
            REMOVE
          </Button>
        )}
      </VStack>
    </>
  );
}; 