import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { Box, VStack, Text, Button, HStack } from '@chakra-ui/react';
import { useAuth } from '../../../contexts/AuthContext';
import { usePlayerMapping } from './contexts/PlayerMappingContext';
import { useGameState } from './hooks/useGameState';
import { useGameTimer } from './hooks/useGameTimer';
import { useWebRTCSimple } from './hooks/useWebRTCSimple';
import { DEFAULT_CONFIG, DEFAULT_ICONS } from './constants';
import { generateDobbleCards, selectGameCards, formatTime } from './gameLogic';
import { GameArea } from './GameArea';
import { NameItProps, Player } from './types';

const NameItMinimal: React.FC<NameItProps> = ({
  gameConfig = {},
  playerName = 'Player',
  enableWebRTC = false,
  configId = 'minimal'
}) => {
  console.log('🎯 NameItMinimal: Rendering with WebRTC =', enableWebRTC);

  const { currentUser } = useAuth();
  const playerId = currentUser?.uid || 'local-player';
  const playerMapping = usePlayerMapping();
  const isGuestSession = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('guest') === '1';
    } catch {
      return false;
    }
  }, []);
  
  // Refs to track if player order has been set
  const hasReorderedPlayersRef = useRef(false);
  const lastWebRTCStatusRef = useRef<string>('disconnected');
  const localPlayerIndexRef = useRef<number | null>(null);
  const mappingInitializedRef = useRef(false);
  const disconnectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScoreUpdateRef = useRef<number>(0);
  // Escalation: track consecutive misses per player and penalty locks
  const consecutiveMissesRef = useRef<Record<string, number>>({});
  const penaltyUntilRef = useRef<Record<string, number>>({});
  const [penaltyPlayerId, setPenaltyPlayerId] = React.useState<string | null>(null);

  // Merge config with defaults - memoize more aggressively
  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...gameConfig,
    enableWebRTC,
    iconSet: gameConfig.iconSet || DEFAULT_ICONS
  }), [JSON.stringify(gameConfig), enableWebRTC]); // Use JSON.stringify to prevent object reference changes

  // Initialize players using deterministic mapping system
  const initialPlayers = useMemo(() => {
    console.log('🎯 NameItMinimal: Initializing players with mapping system');
    
    if (!enableWebRTC) {
      // Single player mode
      return [{
        id: playerId,
        name: playerName,
        score: 0,
        isLocal: true,
        connectionStatus: 'connected' as const
      }];
    }

    // WebRTC mode: Create placeholder players in deterministic order
    // These will be properly mapped when WebRTC connections are established
    const players: Player[] = [
      {
        id: `placeholder-player-0`, // Will be replaced with actual player ID
        name: 'Player 1',
        score: 0,
        isLocal: false, // Will be determined by mapping
        connectionStatus: 'disconnected' as const
      },
      {
        id: `placeholder-player-1`, // Will be replaced with actual player ID  
        name: 'Player 2',
        score: 0,
        isLocal: false, // Will be determined by mapping
        connectionStatus: 'disconnected' as const
      }
    ];

    console.log('🎯 NameItMinimal: Created placeholder players:', players.map(p => `${p.name}(${p.id})`));
    return players;
  }, [enableWebRTC, playerId, playerName]);

  // Game state hook
  const {
    gameState,
    setCards,
    setPlayers,
    updatePlayerScore,
    setMatchFound,
    setGameStarted,
    setGamePaused,
    setGameCompleted,
    setTimeLeft,
    resetGameState
  } = useGameState({
    initialTimeLeft: config.gameTime,
    initialPlayers
  });

  // Timer hook
  const timer = useGameTimer({
    onTick: (timeLeft) => setTimeLeft(timeLeft),
    onTimeUp: () => {
      console.log('⏰ NameItMinimal: Time up!');
      setGameCompleted(true);
    }
  });

  // Handle WebRTC messages
  const handleWebRTCMessage = useCallback((message: any) => {
    console.log('📨 NameItMinimal: Received WebRTC message:', message.type, 'Full message:', message);
    
    if (message.data) {
      // Handle structured message format
      switch (message.data.type) {
        case 'player_join':
          console.log('🤝 NameItMinimal: Player joined:', message.data.playerInfo);
          
          // Add remote player to mapping system
          const remotePlayerInfo = message.data.playerInfo;
          if (remotePlayerInfo?.id && remotePlayerInfo?.name) {
            const remotePlayerIndex = playerMapping.addPlayerMapping(
              remotePlayerInfo.id, // Use their player ID as peer ID
              remotePlayerInfo.id,
              remotePlayerInfo.name,
              false // Remote player is not host
            );
            
            console.log(`🗺️ NameItMinimal: Remote player mapped to index ${remotePlayerIndex}`);
            
            // Update all players based on current mappings (direct call)
            stableUpdatePlayersFromMapping();
            
            // ✅ IMPORTANT: Send back a confirmation with our player info
            console.log('🔍 NameItMinimal: Checking if should send response:', {
              enableWebRTC,
              connectionStatus: webrtc.connectionStatus,
              canSendMessage: typeof webrtc.sendMessage === 'function'
            });
            
            if (enableWebRTC) {
              console.log('🤝 NameItMinimal: Sending host player info back to joiner (will use Firebase fallback if needed)');
              try {
                // ✅ FIX: sendMessage automatically handles fallback if WebRTC not ready
                webrtc.sendMessage({
                  type: 'player_action',
                  data: {
                    type: 'player_join_response',
                    playerInfo: { id: playerId, name: playerName },
                    timestamp: Date.now()
                  },
                  timestamp: Date.now(),
                  playerId
                });
                console.log('✅ NameItMinimal: Response message sent (automatic fallback if needed)');
              } catch (error) {
                console.error('❌ NameItMinimal: Failed to send response:', error);
              }
            } else {
              console.warn('⚠️ NameItMinimal: WebRTC not enabled');
            }
          }
          break;
        case 'player_join_response':
          console.log('🤝 NameItMinimal: Received host player info:', message.data.playerInfo);
          
          // Add host player to mapping system (for joiner)
          const hostPlayerInfo = message.data.playerInfo;
          if (hostPlayerInfo?.id && hostPlayerInfo?.name) {
            const hostPlayerIndex = playerMapping.addPlayerMapping(
              hostPlayerInfo.id,
              hostPlayerInfo.id,
              hostPlayerInfo.name,
              true // This is the host
            );
            
            console.log(`🗺️ NameItMinimal: Host player mapped to index ${hostPlayerIndex}`);
            stableUpdatePlayersFromMapping();
          }
          break;
      }
    } else {
      // Handle direct message format (legacy/fallback)
      switch (message.type) {
        case 'player_join':
          console.log('🤝 NameItMinimal: Player joined (direct format):', message.playerInfo);
          
          // Add remote player to mapping system (direct format)
          if (message.playerInfo?.id && message.playerInfo?.name) {
            const remotePlayerIndex = playerMapping.addPlayerMapping(
              message.playerInfo.id,
              message.playerInfo.id,
              message.playerInfo.name,
              false // Remote player is not host
            );
            
                         console.log(`🗺️ NameItMinimal: Remote player mapped to index ${remotePlayerIndex} (direct format)`);
             stableUpdatePlayersFromMapping();
             
             // ✅ IMPORTANT: Send back a confirmation with our player info (direct format)
             console.log('🔍 NameItMinimal: Checking if should send response (direct format):', {
               enableWebRTC,
               connectionStatus: webrtc.connectionStatus,
               canSendMessage: typeof webrtc.sendMessage === 'function'
             });
             
             if (enableWebRTC) {
               console.log('🤝 NameItMinimal: Sending host player info back to joiner (direct format, will use Firebase fallback if needed)');
               try {
                 webrtc.sendMessage({
                   type: 'player_join_response',
                   playerInfo: { id: playerId, name: playerName },
                   timestamp: Date.now()
                 });
                 console.log('✅ NameItMinimal: Response message sent (direct format, automatic fallback if needed)');
               } catch (error) {
                 console.error('❌ NameItMinimal: Failed to send response (direct format):', error);
               }
             } else {
               console.warn('⚠️ NameItMinimal: WebRTC not enabled (direct format)');
             }
          }
          break;
        case 'player_join_response':
          console.log('🤝 NameItMinimal: Received host player info (direct format):', message.playerInfo);
          
          // Add host player to mapping system (for joiner)
          if (message.playerInfo?.id && message.playerInfo?.name) {
            const hostPlayerIndex = playerMapping.addPlayerMapping(
              message.playerInfo.id,
              message.playerInfo.id,
              message.playerInfo.name,
              true // This is the host
            );
            
            console.log(`🗺️ NameItMinimal: Host player mapped to index ${hostPlayerIndex} (direct format)`);
            stableUpdatePlayersFromMapping();
          }
          break;
        case 'start_game':
          console.log('🚀 NameItMinimal: Remote start game (direct format)');
          startGame();
          break;
        case 'pause_game':
          console.log('⏸️ NameItMinimal: Received pause from remote');
          setGamePaused(true);
          timer.pauseTimer();
          break;
        case 'resume_game':
          console.log('▶️ NameItMinimal: Received resume from remote');
          setGamePaused(false);
          timer.resumeTimer();
          break;
        case 'icon_click':
          console.log('🎯 NameItMinimal: Remote icon click (direct format):', message.iconId);
          if (message.playerId && message.iconId) {
            handleIconClick(message.iconId, message.playerId);
          }
          break;
        case 'score_update':
          // ✅ Score updates now handled via automatic game state sync
          // Individual score_update messages no longer needed
          console.log('📊 NameItMinimal: Received deprecated score_update message - ignoring (scores sync via game state)');
          break;
        case 'game_state_sync':
          console.log('🔄 NameItMinimal: Remote game state sync (direct format):', message);
          if (message.scoresByPlayerId) {
            // ✅ FIX: Sync scores directly from scoresByPlayerId
            const remoteTimestamp = message.timestamp || 0;
            const timeSinceLastUpdate = Date.now() - (lastScoreUpdateRef.current || 0);
            
            console.log(`🔄 NameItMinimal: Sync timestamp check: remote=${remoteTimestamp}, lastUpdate=${lastScoreUpdateRef.current}, timeSince=${timeSinceLastUpdate}ms`);
            console.log('🔄 NameItMinimal: Remote scores to sync:', message.scoresByPlayerId);
            
            // Only apply sync if no recent local score updates (within last 2 seconds)
            if (timeSinceLastUpdate > 2000) {
              console.log('✅ NameItMinimal: Applying scoresByPlayerId sync (no recent local updates)');
              
              // Update each player's score from the received scoresByPlayerId
              Object.entries(message.scoresByPlayerId).forEach(([playerId, score]) => {
                if (typeof score === 'number') {
                  console.log(`📊 NameItMinimal: Syncing score for player ${playerId.slice(-8)}: ${score}`);
                  updatePlayerScore(playerId, score);
                }
              });
            } else {
              console.log('⏭️ NameItMinimal: Skipping score sync (recent local update detected)');
            }
          } else if (message.players && Array.isArray(message.players)) {
            // ✅ Legacy: Handle old format for backward compatibility
            const remoteTimestamp = message.timestamp || 0;
            const timeSinceLastUpdate = Date.now() - (lastScoreUpdateRef.current || 0);
            
            if (timeSinceLastUpdate > 2000) {
              console.log('✅ NameItMinimal: Applying legacy player score sync');
              setPlayers((currentPlayers: Player[]): Player[] => {
                return currentPlayers.map((localPlayer: Player) => {
                  const remotePlayerData = message.players.find((p: any) => p.id === localPlayer.id);
                  if (remotePlayerData && typeof remotePlayerData.score === 'number') {
                    console.log(`📊 NameItMinimal: Syncing legacy score for ${localPlayer.name}: ${remotePlayerData.score}`);
                    updatePlayerScore(localPlayer.id, remotePlayerData.score);
                    return localPlayer;
                  }
                  return localPlayer;
                });
              });
            }
          }
          break;
        case 'reset_game':
          console.log('🔁 NameItMinimal: Received reset game from remote player');
          console.log('🔁 NameItMinimal: About to reset - timer exists:', !!timer, 'resetGameState exists:', !!resetGameState);
          timer.stopTimer();
          resetGameState();
          console.log('🔁 NameItMinimal: Reset completed successfully');
          break;
        case 'match_found':
          console.log('🎯 NameItMinimal: Received match_found from remote');
          // Lock local clicks to prevent double counting until cards advance
          if (message.playerId && message.iconId) {
            setMatchFound({ playerId: message.playerId, iconId: message.iconId });
            // Mirror local behavior: advance cards after brief delay and clear lock
            setTimeout(() => {
              const newCards = generateGameCards();
              setCards(newCards);
              setMatchFound(null);
            }, 1000);
          }
          break;
        case 'penalty_lock':
          // Mirror penalty on peer
          if (message.playerId && typeof message.until === 'number') {
            penaltyUntilRef.current[message.playerId] = message.until;
            if (message.playerId === playerId) {
              setPenaltyPlayerId(playerId);
              setTimeout(() => {
                if (penaltyUntilRef.current[playerId] <= Date.now()) {
                  setPenaltyPlayerId(null);
                  consecutiveMissesRef.current[playerId] = 0;
                }
              }, Math.max(0, message.until - Date.now()) + 100);
            }
          }
          break;
      }
    }
  }, [setPlayers, updatePlayerScore, timer, resetGameState, gameState.players]);

  // ✅ PROPER FIX: Stable update function with derived values only
  const stableUpdatePlayersFromMapping = useCallback(() => {
    if (!enableWebRTC) return;

    console.log('🗺️ NameItMinimal: Updating players from mapping system (STABLE)');
    playerMapping.logMappings();

    const mappings = playerMapping.getAllMappings();
    if (mappings.length === 0) {
      console.log('🗺️ NameItMinimal: No mappings available yet');
      return;
    }

    setPlayers((currentPlayers: Player[]): Player[] => {
      // ✅ Order players by explicit playerIndex (host = 0 left, joiner = 1 right)
      const orderedMappings = [...mappings].sort((a, b) => a.playerIndex - b.playerIndex);
      const allPlayerIds = orderedMappings.map(m => m.playerId);
      console.log('🗺️ NameItMinimal: Creating host/joiner player order:', allPlayerIds);
      const newPlayers: Player[] = [];

      // ✅ FIX: Migrate scores from placeholder IDs to real IDs
      const scoreMigrationMap: Record<string, string> = {};

      // Create players in deterministic order (by host/joiner index)
      orderedMappings.forEach((mapping, deterministicIndex) => {
        const playerIdSorted = mapping.playerId;
        if (mapping) {
          const isLocal = mapping.playerId === playerId;
          const oldPlayer = currentPlayers[deterministicIndex];
          
          // Track score migration: old placeholder ID → new real ID
          if (oldPlayer && oldPlayer.id !== mapping.playerId) {
            scoreMigrationMap[oldPlayer.id] = mapping.playerId;
            console.log(`🔄 NameItMinimal: Score migration mapping: ${oldPlayer.id} → ${mapping.playerId}`);
          }
          
          newPlayers[deterministicIndex] = {
            id: mapping.playerId,
            name: mapping.playerName,
            score: 0, // This field is now unused - scores are in gameState.scoresByPlayerId
            isLocal,
            connectionStatus: isLocal ? 'connected' : 'connected' // Both connected if mapping exists
          };

          if (isLocal) {
            localPlayerIndexRef.current = deterministicIndex;
            console.log(`🏠 NameItMinimal: Local player mapped to deterministic index ${deterministicIndex}`);
          }
        }
      });

      // Note: Score migration moved to separate useEffect to prevent dependency cycles

      console.log('🗺️ NameItMinimal: Updated players:', newPlayers.map(p => `${p.name}(${p.id}, index: ${newPlayers.indexOf(p)})`));
      return newPlayers;
    });
  }, [playerId]); // ✅ FIX: Removed cyclic dependencies to prevent infinite loop

  // ✅ FIX: Score migration is now handled automatically in useGameState.setPlayers()
  // This effect is simplified since remapping happens in the setPlayers callback

  // ✅ Derived values for safe dependency tracking
  const mappingCount = playerMapping.getAllMappings().length;
  const hasWebRTCMappings = mappingCount > 0;

  // WebRTC hook
  const webrtc = useWebRTCSimple({
    enabled: enableWebRTC,
    playerId,
    onMessage: handleWebRTCMessage
  });

  // Prevent WebRTC disconnection when switching tabs and sync game state
  useEffect(() => {
    if (!enableWebRTC || webrtc.connectionStatus !== 'connected') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ NameItMinimal: Tab became visible - syncing game state');
        
        // Re-establish player mappings and update players (use stable function)
        console.log('👁️ NameItMinimal: Re-establishing player mappings on tab focus');
        playerMapping.logMappings();
        stableUpdatePlayersFromMapping();
        
        // ✅ FIX: Don't send game state sync on tab visibility changes
        // This was causing score resets because gameState.players gets reset on component mount
        console.log('👁️ NameItMinimal: Tab focus - skipping automatic sync to prevent score resets');
      } else {
        console.log('👁️ NameItMinimal: Tab hidden - maintaining WebRTC connection');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // ✅ FIX: Disable periodic sync that was causing score resets
    // Scores should only sync when actual score_update messages are sent
    console.log('👁️ NameItMinimal: Periodic sync disabled to prevent score resets');
    let syncInterval: NodeJS.Timeout | null = null;
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [enableWebRTC, webrtc.connectionStatus, gameState.gameStarted, gameState.gameCompleted]); // FIXED: Removed unstable deps

  // ✅ PROPER FIX: Stable mapping initialization effect
  useEffect(() => {
    if (!enableWebRTC) return;

    // When connection is established, add local player to mapping (ONE TIME ONLY)
    if (webrtc.connectionStatus === 'connected' && 
        lastWebRTCStatusRef.current !== 'connected' &&
        !mappingInitializedRef.current) {
      
      console.log('🔄 NameItMinimal: WebRTC connected - setting up player mapping (ONE-TIME)');
      console.log('🔍 NameItMinimal: Connection details:', {
        isHost: webrtc.isHost,
        roomId: webrtc.roomId,
        playerId,
        playerName
      });
      
      // Add local player to mapping system
      const localPlayerIndex = playerMapping.addPlayerMapping(
        playerId, // Use playerId as peerId for local player
        playerId,
        playerName,
        webrtc.isHost
      );

      console.log(`🗺️ NameItMinimal: Local player mapped to index ${localPlayerIndex}`);
      
      // Update room ID in mapping
      if (webrtc.roomId) {
        playerMapping.setRoomId(webrtc.roomId);
        console.log('🏠 NameItMinimal: Room ID set in mapping:', webrtc.roomId);
      }

      // Use stable function to update players
      stableUpdatePlayersFromMapping();
      
      mappingInitializedRef.current = true; // Mark as initialized
      hasReorderedPlayersRef.current = true; // Mark as mapped
    }
    
    // Track WebRTC status changes
    lastWebRTCStatusRef.current = webrtc.connectionStatus;
  }, [enableWebRTC, webrtc.connectionStatus, webrtc.isHost, webrtc.roomId, playerId, playerName, stableUpdatePlayersFromMapping]);

  // ✅ PROPER FIX: Smart disconnect handling - don't clear mappings immediately
  useEffect(() => {
    if (webrtc.connectionStatus === 'disconnected') {
      console.warn('🔌 NameItMinimal: WebRTC disconnected - checking if mappings need clearing...');
      
      // Clear any existing timeout
      if (disconnectionTimeoutRef.current) {
        clearTimeout(disconnectionTimeoutRef.current);
      }
      
      // Only clear mappings after a delay to allow for reconnection
      disconnectionTimeoutRef.current = setTimeout(() => {
        console.log('🧹 NameItMinimal: Disconnect timeout reached - clearing mappings');
        playerMapping.clearMappings();
        mappingInitializedRef.current = false;
        hasReorderedPlayersRef.current = false;
        localPlayerIndexRef.current = null;
      }, 5000); // 5 second grace period for reconnection
      
    } else if (webrtc.connectionStatus === 'connected') {
      // Cancel pending cleanup if we reconnect
      if (disconnectionTimeoutRef.current) {
        console.log('🔄 NameItMinimal: Reconnected - canceling mapping cleanup');
        clearTimeout(disconnectionTimeoutRef.current);
        disconnectionTimeoutRef.current = null;
      }
    }
    
    return () => {
      if (disconnectionTimeoutRef.current) {
        clearTimeout(disconnectionTimeoutRef.current);
      }
    };
     }, [webrtc.connectionStatus]);

  // ✅ PROPER FIX: Update players when mappings become available
  useEffect(() => {
    if (!enableWebRTC || !hasWebRTCMappings) return;

    console.log('🗺️ NameItMinimal: Mappings available, updating players');
    console.log('🔍 NameItMinimal: Current mapping state before update:', {
      mappingCount: mappingCount,
      webrtcConnected: webrtc.connectionStatus === 'connected',
      hasRoom: !!webrtc.roomId
    });
    stableUpdatePlayersFromMapping();
  }, [enableWebRTC, hasWebRTCMappings, stableUpdatePlayersFromMapping, mappingCount, webrtc.connectionStatus, webrtc.roomId]);

  // ✅ BACKUP: Ensure local player is mapped when WebRTC has room but no mapping exists
  useEffect(() => {
    // ✅ FIX: More strict guard conditions to prevent unnecessary backup mappings
    if (!enableWebRTC || !webrtc.roomId || mappingCount > 0 || webrtc.connectionStatus !== 'connected') return;
    
    // Additional check: Make sure we haven't already tried mapping this player
    const existingMapping = playerMapping.getPlayerMapping(playerId);
    if (existingMapping) {
      console.log('🗺️ NameItMinimal: Player already has mapping, skipping backup');
      return;
    }
    
    console.warn('⚠️ NameItMinimal: WebRTC connected with room but no mappings - creating backup mapping');
    console.log('🔍 NameItMinimal: Backup mapping details:', {
      roomId: webrtc.roomId,
      isHost: webrtc.isHost,
      connectionStatus: webrtc.connectionStatus,
      mappingCount,
      playerId
    });
    
    // Force add local player mapping
    const localPlayerIndex = playerMapping.addPlayerMapping(
      playerId,
      playerId, 
      playerName,
      webrtc.isHost
    );
    
    console.log(`🚑 NameItMinimal: BACKUP mapping created - Local player mapped to index ${localPlayerIndex}`);
    playerMapping.setRoomId(webrtc.roomId);
    stableUpdatePlayersFromMapping();
    
  }, [enableWebRTC, webrtc.roomId, webrtc.isHost, webrtc.connectionStatus, mappingCount, playerId, playerName, playerMapping, stableUpdatePlayersFromMapping]);

  // Generate cards
  const generateGameCards = useCallback(() => {
    console.log('🎮 NameItMinimal: generateGameCards called with:', {
      hasConfig: !!config,
      hasIconSet: !!(config?.iconSet),
      iconSetLength: config?.iconSet?.length || 0,
      iconSetType: typeof config?.iconSet,
      isArray: Array.isArray(config?.iconSet),
      firstIcon: config?.iconSet?.[0]
    });
    
    // 🔧 EMERGENCY FIX: Ensure we always have a valid iconSet
    const iconsToUse = (config?.iconSet && Array.isArray(config.iconSet) && config.iconSet.length > 0) 
      ? config.iconSet 
      : DEFAULT_ICONS;
      
    console.log('🎮 NameItMinimal: Using icons:', {
      source: iconsToUse === DEFAULT_ICONS ? 'DEFAULT_ICONS' : 'config.iconSet',
      length: iconsToUse.length,
      firstIcon: iconsToUse[0]
    });
    
    try {
      const allCards = generateDobbleCards(iconsToUse);
      console.log('🎮 NameItMinimal: generateDobbleCards returned:', allCards.length, 'cards');
      
      if (allCards.length === 0) {
        console.error('🚨 CRITICAL: generateDobbleCards returned 0 cards!');
        // Emergency fallback: create basic cards manually
        const emergencyCards = [
          {
            id: 'emergency-center',
            icons: DEFAULT_ICONS.slice(0, 3),
            position: 'center' as const
          },
          {
            id: 'emergency-player1', 
            icons: DEFAULT_ICONS.slice(1, 4),
            position: 'player1' as const
          },
          {
            id: 'emergency-player2',
            icons: DEFAULT_ICONS.slice(2, 5), 
            position: 'player2' as const
          }
        ];
        console.log('🚑 NameItMinimal: Using emergency fallback cards');
        return emergencyCards;
      }
      
      const selectedCards = selectGameCards(allCards);
      console.log('🎮 NameItMinimal: selectGameCards returned:', {
        centerCard: selectedCards.centerCard,
        player1Card: selectedCards.player1Card,
        player2Card: selectedCards.player2Card
      });
      
      const finalCards = [
        selectedCards.centerCard,
        selectedCards.player1Card,
        selectedCards.player2Card
      ];
      
      console.log('🎮 NameItMinimal: Final cards array:', {
        length: finalCards.length,
        cards: finalCards.map(card => ({
          id: card?.id,
          iconsCount: card?.icons?.length,
          position: card?.position
        }))
      });
      
      // Final safety check - ensure no empty cards
      if (finalCards.some(card => !card || !card.icons || card.icons.length === 0)) {
        console.error('🚨 CRITICAL: Some cards are empty, using emergency fallback');
                 const emergencyCards = [
           {
             id: 'emergency-center-2',
             icons: DEFAULT_ICONS.slice(0, 3),
             position: 'center' as const
           },
           {
             id: 'emergency-player1-2', 
             icons: DEFAULT_ICONS.slice(1, 4),
             position: 'player1' as const
           },
           {
             id: 'emergency-player2-2',
             icons: DEFAULT_ICONS.slice(2, 5), 
             position: 'player2' as const
           }
         ];
        return emergencyCards;
      }
      
      return finalCards;
    } catch (error) {
      console.error('❌ NameItMinimal: Error generating cards:', error);
      console.error('❌ NameItMinimal: Config details:', {
        config,
        iconSet: config?.iconSet,
        defaultIcons: DEFAULT_ICONS
      });
      
             // Emergency fallback: create basic cards manually  
       console.log('🚑 NameItMinimal: Creating emergency fallback cards due to error');
       return [
         {
           id: 'fallback-center',
           icons: DEFAULT_ICONS.slice(0, 3),
           position: 'center' as const
         },
         {
           id: 'fallback-player1', 
           icons: DEFAULT_ICONS.slice(1, 4),
           position: 'player1' as const
         },
         {
           id: 'fallback-player2',
           icons: DEFAULT_ICONS.slice(2, 5), 
           position: 'player2' as const
         }
       ];
    }
  }, [config.iconSet]);

  // Start game
  const startGame = useCallback(() => {
    console.log('🚀 NameItMinimal: Starting game');
    const cards = generateGameCards();
    setCards(cards);
    setGameStarted(true);
    setGamePaused(false);
    setGameCompleted(false);
    timer.startTimer(config.gameTime);

    // Send start message to remote player
    if (enableWebRTC && webrtc.connectionStatus === 'connected') {
      webrtc.sendMessage({
        type: 'start_game',
        timestamp: Date.now()
      });
    }
  }, [generateGameCards, setCards, setGameStarted, setGameCompleted, timer, config.gameTime, enableWebRTC, webrtc]);

  // Pause/Resume handlers with WebRTC sync
  const pauseGame = useCallback(() => {
    console.log('⏸️ NameItMinimal: Pausing game');
    setGamePaused(true);
    timer.pauseTimer();
    if (enableWebRTC && webrtc.connectionStatus === 'connected') {
      webrtc.sendMessage({ type: 'pause_game', timestamp: Date.now() });
    }
  }, [enableWebRTC, webrtc.connectionStatus, setGamePaused, timer, webrtc]);

  const resumeGame = useCallback(() => {
    console.log('▶️ NameItMinimal: Resuming game');
    setGamePaused(false);
    timer.resumeTimer();
    if (enableWebRTC && webrtc.connectionStatus === 'connected') {
      webrtc.sendMessage({ type: 'resume_game', timestamp: Date.now() });
    }
  }, [enableWebRTC, webrtc.connectionStatus, setGamePaused, timer, webrtc]);

  // Reset game
  const resetGame = useCallback(() => {
    console.log('🔄 NameItMinimal: Resetting game');
    timer.stopTimer();
    resetGameState();
    
    // Send reset message to remote player via WebRTC
    if (enableWebRTC && webrtc.connectionStatus === 'connected') {
      console.log('📤 NameItMinimal: Sending reset game message to remote player');
      console.log('📤 NameItMinimal: WebRTC status - enabled:', enableWebRTC, 'connection:', webrtc.connectionStatus);
      console.log('📤 NameItMinimal: WebRTC object details:', {
        isHost: webrtc.isHost,
        roomId: webrtc.roomId,
        sendMessageType: typeof webrtc.sendMessage
      });
      const resetMessage = {
        type: 'reset_game',
        playerId: playerId,
        timestamp: Date.now()
      };
      console.log('📤 NameItMinimal: Reset message being sent:', resetMessage);
      
      try {
        webrtc.sendMessage(resetMessage);
        console.log('📤 NameItMinimal: Reset message sent successfully');
      } catch (error) {
        console.error('❌ NameItMinimal: Error sending reset message:', error);
      }
    } else {
      console.warn('⚠️ NameItMinimal: Cannot send reset - WebRTC not ready. Enabled:', enableWebRTC, 'Status:', webrtc.connectionStatus);
      console.warn('⚠️ NameItMinimal: WebRTC details:', {
        enabled: enableWebRTC,
        status: webrtc?.connectionStatus,
        isHost: webrtc?.isHost,
        roomId: webrtc?.roomId
      });
    }
  }, [timer, resetGameState, enableWebRTC, webrtc]);

  // Handle icon click
  const handleIconClick = useCallback((iconId: string, playerId: string) => {
    console.log('🎯 NameItMinimal: Icon clicked:', iconId, 'by player:', playerId);
    
    // Block if game not active, a match is being processed, or the player is locked by penalty
    const now = Date.now();
    const isPenalized = penaltyUntilRef.current[playerId] && penaltyUntilRef.current[playerId] > now;
    if (!gameState.gameStarted || gameState.gameCompleted || gameState.matchFound || isPenalized) {
      return;
    }

    const player = gameState.players.find(p => p.id === playerId);
    const centerCard = gameState.cards.find(c => c.position === 'center');
    
    if (!player || !centerCard) {
      return;
    }

    // Simple match check: find if icon exists in center card
    const isMatch = centerCard.icons.some(icon => icon.id === iconId);
    
    if (isMatch) {
      // ✅ FIX: Get current score from scoresByPlayerId
      const currentScore = gameState.scoresByPlayerId[playerId] || 0;
      const newScore = currentScore + 1;
      console.log('✅ NameItMinimal: Match found! New score:', newScore);
      
      // ✅ FIX: Track when we make local score updates
      if (player.isLocal) {
        lastScoreUpdateRef.current = Date.now();
        console.log('📊 NameItMinimal: Updated lastScoreUpdateRef to', lastScoreUpdateRef.current);
      }
      
      updatePlayerScore(playerId, newScore);
      // Reset miss counter on success
      consecutiveMissesRef.current[playerId] = 0;
      setMatchFound({ playerId, iconId });

      // Notify remote so they temporarily lock clicks and advance cards too
      if (enableWebRTC && webrtc.connectionStatus === 'connected') {
        try {
          webrtc.sendMessage({ type: 'match_found', playerId, iconId, timestamp: Date.now() });
        } catch {}
      }

      // ✅ FIX: Send game state with updated scores via WebRTC
      if (enableWebRTC && player.isLocal && webrtc.connectionStatus === 'connected') {
        // Send the updated game state including scores
        const gameStateMessage = {
          type: 'game_state_sync',
          scoresByPlayerId: {
            ...gameState.scoresByPlayerId,
            [playerId]: newScore
          },
          players: gameState.players,
          timestamp: Date.now()
        };
        console.log('📤 NameItMinimal: Sending game state sync with scores:', gameStateMessage);
        try {
          webrtc.sendMessage(gameStateMessage);
        } catch (error) {
          console.error('❌ NameItMinimal: Failed to send game state sync:', error);
        }
      }

      // Generate new cards after a brief delay
      setTimeout(() => {
        const newCards = generateGameCards();
        setCards(newCards);
        setMatchFound(null);
      }, 1000);
    } else {
      console.log('❌ NameItMinimal: No match found');
      // Increment miss counter
      const prevMiss = consecutiveMissesRef.current[playerId] || 0;
      const nextMiss = prevMiss + 1;
      consecutiveMissesRef.current[playerId] = nextMiss;

      // On 3 consecutive misses, apply 4s penalty lock with red icon
      if (nextMiss >= 3) {
        const until = Date.now() + 4000;
        penaltyUntilRef.current[playerId] = until;
        setPenaltyPlayerId(playerId);
        // Broadcast penalty so peer shows the same overlay/lock window
        if (enableWebRTC && webrtc.connectionStatus === 'connected') {
          try {
            webrtc.sendMessage({ type: 'penalty_lock', playerId, until, timestamp: Date.now() });
          } catch {}
        }
        // Clear overlay when penalty ends
        setTimeout(() => {
          if (penaltyUntilRef.current[playerId] <= Date.now()) {
            setPenaltyPlayerId(null);
            consecutiveMissesRef.current[playerId] = 0;
          }
        }, 4100);
      }
    }
  }, [gameState, updatePlayerScore, setMatchFound, enableWebRTC, webrtc, generateGameCards, setCards]);

  // Create/Join room handlers
  const handleCreateRoom = useCallback(async () => {
    if (isGuestSession) {
      console.warn('🚫 Guest sessions cannot create rooms');
      return;
    }
    try {
      const roomId = await webrtc.createRoom();
      console.log('🏠 NameItMinimal: Room created:', roomId);
      
      // ✅ FIX: Host should immediately add itself to mapping when room is created
      console.log('🏠 NameItMinimal: Adding host to mapping system');
      const hostPlayerIndex = playerMapping.addPlayerMapping(
        playerId, // Use playerId as peerId for host
        playerId,
        playerName,
        true // This player is the host
      );
      
      console.log(`🗺️ NameItMinimal: Host mapped to index ${hostPlayerIndex}`);
      
      // Update room ID in mapping
      playerMapping.setRoomId(roomId);
      
      // Update players immediately for host
      stableUpdatePlayersFromMapping();
      
    } catch (error) {
      console.error('❌ NameItMinimal: Failed to create room:', error);
    }
  }, [webrtc, playerId, playerName, playerMapping, stableUpdatePlayersFromMapping, isGuestSession]);

  const handleJoinRoom = useCallback(async () => {
    const roomId = prompt('Enter room ID:');
    if (roomId) {
      try {
        await webrtc.joinRoom(roomId);
        console.log('🚪 NameItMinimal: Joined room:', roomId);
        
        // Send player info to host using original working format
        webrtc.sendMessage({
          type: 'player_action',
          data: {
            type: 'player_join',
            playerInfo: { id: playerId, name: playerName },
            timestamp: Date.now()
          },
          timestamp: Date.now(),
          playerId
        });
      } catch (error) {
        console.error('❌ NameItMinimal: Failed to join room:', error);
      }
    }
  }, [webrtc, playerId, playerName]);

  return (
    <Box width="100%" padding={4}>
      <VStack spacing={4}>
        {/* Header */}
        <Box textAlign="center">
          <Text fontSize="2xl" fontWeight="bold">Name It - Minimal</Text>
          <Text fontSize="lg">Time: {formatTime(gameState.timeLeft)}</Text>
          {enableWebRTC && (
            <Text fontSize="md">
              Connection: {webrtc.connectionStatus} | Room: {webrtc.roomId || 'None'}
            </Text>
          )}
          {enableWebRTC && webrtc.roomId && (
            <Text fontSize="sm" color="blue.600" fontFamily="monospace" cursor="pointer" 
                  onClick={() => navigator.clipboard?.writeText(webrtc.roomId || '')}
                  title="Click to copy room ID">
              📋 Copy Room ID: {webrtc.roomId}
            </Text>
          )}
        </Box>

        {/* Controls */}
        <HStack spacing={4}>
          <Button colorScheme="green" onClick={startGame} disabled={gameState.gameStarted}>
            Start Game
          </Button>
          {!gameState.gamePaused ? (
            <Button colorScheme="yellow" onClick={pauseGame} disabled={!gameState.gameStarted}>
              Pause
            </Button>
          ) : (
            <Button colorScheme="green" variant="outline" onClick={resumeGame} disabled={!gameState.gameStarted}>
              Resume
            </Button>
          )}
          <Button colorScheme="red" onClick={resetGame}>
            Reset Game
          </Button>
          {enableWebRTC && (
            <>
              <Button colorScheme="blue" onClick={handleCreateRoom} disabled={webrtc.connectionStatus !== 'disconnected' || isGuestSession}>
                Create Room
              </Button>
              <Button colorScheme="purple" onClick={handleJoinRoom} disabled={webrtc.connectionStatus !== 'disconnected'}>
                Join Room
              </Button>
            </>
          )}
        </HStack>

        {/* Game Area */}
        <GameArea
          gameState={gameState}
          onIconClick={handleIconClick}
          localPlayerId={playerId}
          timeLeft={gameState.timeLeft}
          formattedTime={formatTime(gameState.timeLeft)}
          isGameActive={gameState.gameStarted && !gameState.gameCompleted}
        />

        {/* Debug Info */}
        <Box fontSize="sm" color="gray.600" textAlign="center">
          <Text>Players: {gameState.players.map((p, i) => `${i}:${p.name}(${gameState.scoresByPlayerId[p.id] || 0})`).join(', ')}</Text>
          <Text>WebRTC: {webrtc.isHost ? 'Host' : 'Guest'} | Status: {webrtc.connectionStatus}</Text>
          <Text>Local Index: {localPlayerIndexRef.current} | Mappings: {playerMapping.getAllMappings().length}</Text>
          {enableWebRTC && (
            <Button size="xs" onClick={playerMapping.logMappings} colorScheme="gray" mt={1}>
              Log Mappings
            </Button>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default NameItMinimal; 