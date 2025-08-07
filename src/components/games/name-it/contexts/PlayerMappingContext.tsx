import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

interface PlayerMapping {
  peerId: string;
  playerIndex: number; // 0 for Host/Player1, 1 for Joiner/Player2
  playerId: string;
  playerName: string;
  joinOrder: number; // When they joined the room
}

interface PlayerMappingContextType {
  playerMappings: Map<string, PlayerMapping>;
  roomPlayerOrder: string[]; // Ordered list of player IDs by join order
  
  // Core mapping functions
  addPlayerMapping: (peerId: string, playerId: string, playerName: string, isHost: boolean) => number;
  getPlayerIndex: (peerId: string) => number | null;
  getPlayerMapping: (peerId: string) => PlayerMapping | null;
  getAllMappings: () => PlayerMapping[];
  
  // Room management
  clearMappings: () => void;
  setRoomId: (roomId: string | null) => void;
  getRoomId: () => string | null;
  
  // Diagnostics
  logMappings: () => void;
}

const PlayerMappingContext = createContext<PlayerMappingContextType | undefined>(undefined);

interface PlayerMappingProviderProps {
  children: ReactNode;
}

export const PlayerMappingProvider: React.FC<PlayerMappingProviderProps> = ({ children }) => {
  const [playerMappings] = useState(() => new Map<string, PlayerMapping>());
  const [roomPlayerOrder, setRoomPlayerOrder] = useState<string[]>([]);
  const roomIdRef = useRef<string | null>(null);
  const joinCounterRef = useRef(0);

  const addPlayerMapping = useCallback((
    peerId: string, 
    playerId: string, 
    playerName: string, 
    isHost: boolean
  ): number => {
    console.log('🗺️ PlayerMapping: Adding mapping', { peerId, playerId, playerName, isHost });
    
    // ✅ FIX: Guard against redundant mappings
    const existingMapping = playerMappings.get(peerId);
    if (existingMapping) {
      console.log('🗺️ PlayerMapping: Peer already mapped to index', existingMapping.playerIndex, '- skipping duplicate');
      return existingMapping.playerIndex;
    }
    
    // Determine player index based on host status and join order
    let playerIndex: number;
    
    if (isHost) {
      // Host is always player 0
      playerIndex = 0;
    } else {
      // Joiner gets the next available index (should be 1 for 2-player games)
      const usedIndices = Array.from(playerMappings.values()).map(m => m.playerIndex);
      playerIndex = 1; // For 2-player games, joiner is always index 1
      
      // Safety check - make sure index isn't already taken
      if (usedIndices.includes(playerIndex)) {
        console.warn('⚠️ PlayerMapping: Index 1 already taken, assigning next available');
        playerIndex = Math.max(...usedIndices) + 1;
      }
    }
    
    const mapping: PlayerMapping = {
      peerId,
      playerIndex,
      playerId,
      playerName,
      joinOrder: joinCounterRef.current++
    };
    
    playerMappings.set(peerId, mapping);
    
    // ✅ FIX: Ensure room player order is properly populated
    setRoomPlayerOrder(prev => {
      const newOrder = [...prev];
      // Ensure array is large enough
      while (newOrder.length <= playerIndex) {
        newOrder.push('');
      }
      // Insert player ID in correct position
      newOrder[playerIndex] = playerId;
      console.log('🗺️ PlayerMapping: Updated order array:', newOrder);
      return newOrder;
    });
    
    console.log('✅ PlayerMapping: Added mapping', mapping);
    
    return playerIndex;
  }, [playerMappings]);

  const getPlayerIndex = useCallback((peerId: string): number | null => {
    const mapping = playerMappings.get(peerId);
    return mapping ? mapping.playerIndex : null;
  }, [playerMappings]);

  const getPlayerMapping = useCallback((peerId: string): PlayerMapping | null => {
    return playerMappings.get(peerId) || null;
  }, [playerMappings]);

  const getAllMappings = useCallback((): PlayerMapping[] => {
    return Array.from(playerMappings.values()).sort((a, b) => a.playerIndex - b.playerIndex);
  }, [playerMappings]);

  const clearMappings = useCallback(() => {
    console.log('🧹 PlayerMapping: Clearing all mappings');
    console.log('🧹 PlayerMapping: Previous state:', {
      mappingsCount: playerMappings.size,
      playerOrder: roomPlayerOrder,
      roomId: roomIdRef.current
    });
    
    playerMappings.clear();
    setRoomPlayerOrder([]);
    joinCounterRef.current = 0;
    roomIdRef.current = null;
    
    console.log('✅ PlayerMapping: All mappings cleared');
  }, [playerMappings, roomPlayerOrder]);

  const setRoomId = useCallback((roomId: string | null) => {
    console.log('🏠 PlayerMapping: Setting room ID', roomId);
    roomIdRef.current = roomId;
    if (!roomId) {
      // Clear mappings when leaving room
      clearMappings();
    }
  }, [clearMappings]);

  const getRoomId = useCallback(() => {
    return roomIdRef.current;
  }, []);

  const logMappings = useCallback(() => {
    console.log('🗺️ PlayerMapping: Current state:');
    console.log('  Room ID:', roomIdRef.current);
    console.log('  Player Order:', roomPlayerOrder);
    console.log('  Mappings:');
    
    Array.from(playerMappings.entries()).forEach(([peerId, mapping]) => {
      console.log(`    ${peerId} → Player ${mapping.playerIndex} (${mapping.playerName})`);
    });
  }, [playerMappings, roomPlayerOrder]);

  const value: PlayerMappingContextType = {
    playerMappings,
    roomPlayerOrder,
    addPlayerMapping,
    getPlayerIndex,
    getPlayerMapping,
    getAllMappings,
    clearMappings,
    setRoomId,
    getRoomId,
    logMappings
  };

  return (
    <PlayerMappingContext.Provider value={value}>
      {children}
    </PlayerMappingContext.Provider>
  );
};

export const usePlayerMapping = (): PlayerMappingContextType => {
  const context = useContext(PlayerMappingContext);
  if (!context) {
    throw new Error('usePlayerMapping must be used within a PlayerMappingProvider');
  }
  return context;
}; 