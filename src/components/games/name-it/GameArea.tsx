import React, { useEffect, useMemo } from 'react';
import { Box, Text, VStack, HStack, Badge, Progress } from '@chakra-ui/react';
import { GameState, Player } from './types';
import { GameCard } from './GameCard';

interface GameAreaProps {
  gameState: GameState;
  onIconClick: (iconId: string, playerId: string) => void;
  localPlayerId: string;
  timeLeft: number;
  formattedTime: string;
  isGameActive: boolean;
}

interface PlayerScoreDisplayProps {
  player: Player;
  isLocal: boolean;
  position: 'left' | 'right';
  matchedIconId?: string;
}

const PlayerScoreDisplay: React.FC<PlayerScoreDisplayProps> = ({
  player,
  isLocal,
  position,
  matchedIconId
}) => {
  const isConnected = player.connectionStatus === 'connected';
  
  return (
    <VStack
      spacing={2}
      position="absolute"
      bottom="20px"
      {...(position === 'left' ? { left: '20px' } : { right: '20px' })}
      minWidth="120px"
    >
      {/* Player Name */}
      <HStack spacing={2}>
        <Badge
          colorScheme={isLocal ? 'blue' : 'green'}
          variant={isConnected ? 'solid' : 'outline'}
          fontSize="sm"
          px={3}
          py={1}
          borderRadius="full"
        >
          {isLocal ? '👤' : '🔗'} {position === 'left' ? 'Player 1' : 'Player 2'}
        </Badge>
        {!isConnected && !isLocal && (
          <Badge colorScheme="red" variant="outline" fontSize="xs">
            Disconnected
          </Badge>
        )}
      </HStack>
      
      {/* Score */}
      <Box textAlign="center">
        <Text fontSize="2xl" fontWeight="bold" color="blue.600">
          {player.score}
        </Text>
        <Text fontSize="xs" color="gray.500">
          matches
        </Text>
      </Box>
      
      {/* Match animation */}
      {matchedIconId && (
        <Box
          position="absolute"
          top="-20px"
          left="50%"
          transform="translateX(-50%)"
          fontSize="24px"
          animation="scoreUp 1s ease-out"
          sx={{
            '@keyframes scoreUp': {
              '0%': { opacity: 0, transform: 'translateX(-50%) translateY(20px)' },
              '50%': { opacity: 1, transform: 'translateX(-50%) translateY(-10px)' },
              '100%': { opacity: 0, transform: 'translateX(-50%) translateY(-40px)' }
            }
          }}
        >
          +1 🎉
        </Box>
      )}
    </VStack>
  );
};

export const GameArea: React.FC<GameAreaProps> = ({
  gameState,
  onIconClick,
  localPlayerId,
  timeLeft,
  formattedTime,
  isGameActive
}) => {
  // ✅ CRITICAL: Validate GameArea props to catch React Error #300
  console.log('🔍 GAMEAREA: Rendering with props:', {
    hasGameState: !!gameState,
    gameStateType: typeof gameState,
    hasCards: !!gameState?.cards,
    cardsLength: gameState?.cards?.length,
    cardsIsArray: Array.isArray(gameState?.cards),
    hasPlayers: !!gameState?.players,
    playersLength: gameState?.players?.length,
    playersIsArray: Array.isArray(gameState?.players),
    localPlayerId,
    timeLeft,
    timeLeftType: typeof timeLeft,
    formattedTime,
    formattedTimeType: typeof formattedTime,
    isGameActive,
    isGameActiveType: typeof isGameActive,
    onIconClickType: typeof onIconClick
  });

  // ✅ CRITICAL FIX: Call ALL hooks BEFORE any early returns
  const localPlayer = useMemo(() => {
    if (!localPlayerId || !gameState?.players || gameState.players.length === 0) {
      return undefined;
    }
    return gameState.players.find(p => String(p.id) === String(localPlayerId));
  }, [gameState?.players, localPlayerId]);
  
  const remotePlayer = useMemo(() => {
    if (!gameState?.players) {
      return undefined;
    }
    return gameState.players.find(p => String(p.id) !== String(localPlayerId));
  }, [gameState?.players, localPlayerId]);

  // ✅ SAFETY: After ALL hooks are called, now we can do conditional rendering
  if (!gameState || !gameState.cards || !Array.isArray(gameState.cards)) {
    console.error('🚨 GAMEAREA: Invalid gameState or cards array:', {
      hasGameState: !!gameState,
      hasCards: !!gameState?.cards,
      cardsType: typeof gameState?.cards,
      cardsIsArray: Array.isArray(gameState?.cards)
    });
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Text>Loading game area...</Text>
      </Box>
    );
  }

  const centerCard = gameState.cards.find(c => c.position === 'center');
  const player1Card = gameState.cards.find(c => c.position === 'player1');
  const player2Card = gameState.cards.find(c => c.position === 'player2');
  
  // Create separate handlers for each player card
  const handlePlayer1IconClick = (iconId: string) => {
    if (isGameActive) {
      const player1Id = gameState.players[0]?.id;
      if (player1Id) {
        onIconClick(iconId, player1Id);
      }
    }
  };

  const handlePlayer2IconClick = (iconId: string) => {
    if (isGameActive) {
      const player2Id = gameState.players[1]?.id;
      if (player2Id) {
        onIconClick(iconId, player2Id);
      }
    }
  };

  // ✅ Determine which card the local player should be able to click (normalized)
  const isLocalPlayerOne = String(localPlayerId) === String(gameState.players[0]?.id);
  const isLocalPlayerTwo = String(localPlayerId) === String(gameState.players[1]?.id);
  


  const getTimeColor = () => {
    if (timeLeft > 60) return 'green';
    if (timeLeft > 30) return 'yellow';
    return 'red';
  };

  const getProgressValue = () => {
    const maxTime = 300; // Assuming 5 minutes default
    return (timeLeft / maxTime) * 100;
  };

  return (
    <Box
      position="relative"
      width="100%"
      height="600px"
      maxWidth="900px"
      margin="0 auto"
      backgroundColor="gray.50"
      borderRadius="lg"
      overflow="visible"
      border="2px solid"
      borderColor="gray.200"
    >
      {/* Timer Display */}
      <Box
        position="absolute"
        top="20px"
        left="50%"
        transform="translateX(-50%)"
        zIndex={10}
      >
        <VStack spacing={2}>
          <Text
            fontSize="2xl"
            fontWeight="bold"
            color={getTimeColor()}
            textShadow="1px 1px 2px rgba(0,0,0,0.1)"
          >
            {formattedTime}
          </Text>
          <Progress
            value={getProgressValue()}
            width="200px"
            colorScheme={getTimeColor()}
            size="sm"
            borderRadius="full"
            backgroundColor="gray.200"
          />
        </VStack>
      </Box>

      {/* Game Status Overlay */}
      {!gameState.gameStarted && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={20}
          textAlign="center"
          backgroundColor="white"
          padding={6}
          borderRadius="lg"
          boxShadow="lg"
          border="2px solid"
          borderColor="blue.200"
        >
          <Text fontSize="xl" fontWeight="bold" color="blue.600" mb={2}>
            🎯 Name It Game
          </Text>
          <Text fontSize="md" color="gray.600">
            Click "Start Game" to begin!
          </Text>
          <Text fontSize="sm" color="gray.500" mt={2}>
            Find matching symbols between your card and the center card
          </Text>
        </Box>
      )}

      {gameState.gameCompleted && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={20}
          textAlign="center"
          backgroundColor="white"
          padding={6}
          borderRadius="lg"
          boxShadow="lg"
          border="2px solid"
          borderColor={gameState.winner?.id === localPlayerId ? 'green.200' : 'red.200'}
        >
          <Text fontSize="2xl" fontWeight="bold" mb={2}>
            {gameState.winner?.id === localPlayerId ? '🏆 You Win!' : '😔 Game Over'}
          </Text>
          <Text fontSize="lg" color="gray.600" mb={1}>
            Final Score: {localPlayer?.score || 0}
          </Text>
          {gameState.winner && (
            <Text fontSize="md" color="gray.500">
              Winner: {gameState.winner.name} ({gameState.winner.score} matches)
            </Text>
          )}
        </Box>
      )}

      {/* Game Cards */}
      {centerCard && (
        <GameCard
          card={centerCard}
          isHighlighted={isGameActive}
          showAnimation={gameState.gameStarted}
        />
      )}

      {player1Card && (
        <GameCard
          card={player1Card}
          onIconClick={handlePlayer1IconClick}
          isClickable={isLocalPlayerOne && isGameActive}
          matchedIconId={gameState.matchFound?.iconId}
          showAnimation={gameState.gameStarted}
        />
      )}

      {player2Card && (
        <GameCard
          card={player2Card}
          onIconClick={handlePlayer2IconClick}
          isClickable={isLocalPlayerTwo && isGameActive}
          isHighlighted={gameState.matchFound?.playerId === gameState.players[1]?.id}
          matchedIconId={gameState.matchFound?.playerId === gameState.players[1]?.id ? gameState.matchFound.iconId : undefined}
          showAnimation={gameState.gameStarted}
        />
      )}

      {/* Player Scores - Position based on player array index, not local/remote */}
      {gameState.players[0] && (
        <PlayerScoreDisplay
          player={gameState.players[0]}
          isLocal={gameState.players[0].isLocal}
          position="left"
          matchedIconId={gameState.matchFound?.playerId === gameState.players[0].id ? gameState.matchFound.iconId : undefined}
        />
      )}

      {gameState.players[1] && (
        <PlayerScoreDisplay
          player={gameState.players[1]}
          isLocal={gameState.players[1].isLocal}
          position="right"
          matchedIconId={gameState.matchFound?.playerId === gameState.players[1].id ? gameState.matchFound.iconId : undefined}
        />
      )}
      
      {!remotePlayer && (
        <Box
          position="absolute"
          bottom="20px"
          right="20px"
          padding={2}
          background="red.100"
          borderRadius="md"
        >
          <Text fontSize="sm" color="red.600">No remote player found</Text>
        </Box>
      )}

      {/* Round Counter */}
      {gameState.currentRound > 0 && (
        <Box
          position="absolute"
          top="20px"
          right="20px"
          zIndex={10}
        >
          <Badge colorScheme="purple" fontSize="sm" px={3} py={1}>
            Round {gameState.currentRound}
          </Badge>
        </Box>
      )}

      {/* Match Found Animation */}
      {gameState.matchFound && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={15}
          fontSize="4xl"
          animation="matchFound 1s ease-in-out"
          sx={{
            '@keyframes matchFound': {
              '0%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0)' },
              '50%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1.2)' },
              '100%': { opacity: 0, transform: 'translate(-50%, -50%) scale(1)' }
            }
          }}
        >
          ✨ Match! ✨
        </Box>
      )}
    </Box>
  );
};

export default GameArea; 