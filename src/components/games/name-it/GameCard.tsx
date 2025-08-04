import React, { useMemo } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { GameCard as GameCardType, GameIcon } from './types';
import { calculateIconPositions } from './gameLogic';

interface GameCardProps {
  card: GameCardType;
  onIconClick?: (iconId: string) => void;
  isClickable?: boolean;
  isHighlighted?: boolean;
  matchedIconId?: string;
  showAnimation?: boolean;
}

interface IconElementProps {
  icon: GameIcon;
  position: {
    x: number;
    y: number;
    rotation: number;
    fontSize: number;
  };
  onClick?: () => void;
  isClickable: boolean;
  isMatched?: boolean;
}

const IconElement: React.FC<IconElementProps> = ({
  icon,
  position,
  onClick,
  isClickable,
  isMatched
}) => {
  const handleClick = () => {
    if (isClickable && onClick) {
      onClick();
    }
  };

  return (
    <Box
      position="absolute"
      left={`${position.x}%`}
      top={`${position.y}%`}
      transform={`translate(-50%, -50%) rotate(${position.rotation}deg)`}
      fontSize={`${position.fontSize}px`}
      cursor={isClickable ? 'pointer' : 'default'}
      userSelect="none"
      transition="all 0.2s ease"
      zIndex={isMatched ? 10 : 1}
      _hover={isClickable ? {
        transform: `translate(-50%, -50%) rotate(${position.rotation}deg) scale(1.1)`,
        zIndex: 5
      } : {}}
      onClick={handleClick}
      sx={{
        filter: isMatched ? 'brightness(1.3) drop-shadow(0 0 8px gold)' : 'none',
        animation: isMatched ? 'pulse 0.5s ease-in-out' : 'none',
        '@keyframes pulse': {
          '0%': { transform: `translate(-50%, -50%) rotate(${position.rotation}deg) scale(1)` },
          '50%': { transform: `translate(-50%, -50%) rotate(${position.rotation}deg) scale(1.2)` },
          '100%': { transform: `translate(-50%, -50%) rotate(${position.rotation}deg) scale(1)` }
        }
      }}
    >
      {icon.type === 'image' ? (
        <div
          dangerouslySetInnerHTML={{ __html: icon.html }}
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        />
      ) : (
        <Text
          fontSize="inherit"
          lineHeight="1"
          textAlign="center"
          dangerouslySetInnerHTML={{ __html: icon.html }}
        />
      )}
    </Box>
  );
};

export const GameCard: React.FC<GameCardProps> = ({
  card,
  onIconClick,
  isClickable = false,
  isHighlighted = false,
  matchedIconId,
  showAnimation = false
}) => {
  // ✅ SAFETY: Validate card and icons before rendering
  if (!card || !card.icons || !Array.isArray(card.icons) || card.icons.length === 0) {
    console.warn('⚠️ GAMECARD: Invalid card or empty icons, skipping render:', {
      hasCard: !!card,
      hasIcons: !!card?.icons,
      isArray: Array.isArray(card?.icons),
      length: card?.icons?.length || 0
    });
    return (
      <Box
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        width="200px"
        height="200px"
        borderRadius="50%"
        border="2px dashed"
        borderColor="gray.300"
        backgroundColor="gray.50"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize="sm" color="gray.500" textAlign="center">
          Loading card...
        </Text>
      </Box>
    );
  }

  // Memoize icon positions to prevent constant recalculation with new random values
  const iconPositions = useMemo(() => {
    console.log(`🎴 Calculating stable positions for card ${card.id}`);
    return calculateIconPositions(card.icons);
  }, [card.id, card.icons]);
  
  const getCardPosition = () => {
    switch (card.position) {
      case 'center':
        return { top: '55%', left: '50%', transform: 'translate(-50%, -50%)' };
      case 'player1':
        return { top: '55%', left: '15%', transform: 'translate(-50%, -50%)' };
      case 'player2':
        return { top: '55%', right: '15%', transform: 'translate(50%, -50%)' };
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  const getCardSize = () => {
    return card.position === 'center' ? '240px' : '200px';
  };

  const handleIconClick = (iconId: string) => {
    if (onIconClick && isClickable) {
      onIconClick(iconId);
    }
  };

  return (
    <Box
      position="absolute"
      {...getCardPosition()}
      width={getCardSize()}
      height={getCardSize()}
      borderRadius="50%"
      border="3px solid"
      borderColor={isHighlighted ? 'blue.400' : 'gray.300'}
      backgroundColor="white"
      boxShadow={isHighlighted ? '0 0 20px rgba(59, 130, 246, 0.5)' : '0 4px 8px rgba(0,0,0,0.1)'}
      transition="all 0.3s ease"
      zIndex={card.position === 'center' ? 2 : 1}
      className={showAnimation ? 'fly-in' : ''}
      sx={{
        '@keyframes fly-in': {
          '0%': {
            transform: 'translateY(-200px) scale(0.5)',
            opacity: 0
          },
          '100%': {
            transform: getCardPosition().transform + ' scale(1)',
            opacity: 1
          }
        },
        '.fly-in': {
          animation: 'fly-in 0.5s ease-out'
        }
      }}
    >
      {iconPositions
        .filter(positionedIcon => positionedIcon && positionedIcon.icon && positionedIcon.icon.id)
        .map((positionedIcon, index) => (
          <IconElement
            key={`${card.id}-${positionedIcon.icon.id}-${index}`}
            icon={positionedIcon.icon}
            position={positionedIcon}
            onClick={() => handleIconClick(positionedIcon.icon.id)}
            isClickable={isClickable}
            isMatched={matchedIconId === positionedIcon.icon.id}
          />
        ))}
      
      {/* Card label for debugging or player identification */}
      {process.env.NODE_ENV === 'development' && (
        <Box
          position="absolute"
          bottom="-30px"
          left="50%"
          transform="translateX(-50%)"
          fontSize="12px"
          color="gray.500"
          fontWeight="bold"
          textAlign="center"
        >
          {card.position}
        </Box>
      )}
    </Box>
  );
};

export default GameCard; 