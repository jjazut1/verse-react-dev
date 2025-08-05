import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, push, onValue, off, set, remove, child } from 'firebase/database';
import { rtdb } from '../../../config/firebase';
import { WebRTCState, WebRTCMessage, GameState, PlayerAction } from './types';
import { WEBRTC_CONFIG } from './constants';

interface UseWebRTCProps {
  enabled: boolean;
  gameState: GameState;
  onGameStateReceived: (gameState: Partial<GameState>) => void;
  onPlayerAction: (action: PlayerAction) => void;
  playerId: string;
  onConnectionLost?: () => void;
}

interface UseWebRTCReturn {
  webrtcState: WebRTCState;
  createRoom: () => Promise<string>;
  joinRoom: (roomId: string) => Promise<void>;
  sendGameState: (gameState: Partial<GameState>) => void;
  sendPlayerAction: (action: PlayerAction) => void;
  disconnect: () => void;
  isHost: boolean;
  connectionId: string | null;
  connectionStatus: WebRTCState['connectionStatus'];
}

export const useWebRTC = ({
  enabled,
  gameState,
  onGameStateReceived,
  onPlayerAction,
  playerId,
  onConnectionLost
}: UseWebRTCProps): UseWebRTCReturn => {
  
  // Generate unique ID for this hook instance
  const hookInstanceId = useRef(Math.random().toString(36).substring(2, 8));
  console.log('🆔 useWebRTC instance ID:', hookInstanceId.current);
  
  // Log when useWebRTC hook reinitializes
  const initCountRef = useRef(0);
  initCountRef.current += 1;
  if (initCountRef.current > 1) {
    console.log('🚨 useWebRTC REINITIALIZED! Count:', initCountRef.current);
    console.trace();
  }
  
  // ✅ STABILITY GUARD: Early return cached result if core dependencies haven't changed
  const lastWebRTCDepsRef = useRef<string | null>(null);
  const lastWebRTCResultRef = useRef<UseWebRTCReturn | null>(null);
  
  const currentWebRTCDepsKey = JSON.stringify({
    enabled,
    playerId,
    hasGameState: !!gameState
  });
  
  // ✅ CRITICAL FIX: Removed stability guard early return to prevent Rules of Hooks violation
  // The early return was skipping 20+ hooks, causing "Rendered fewer hooks than expected"
  // Stability is now handled by stable props from calling components
  if (lastWebRTCDepsRef.current === currentWebRTCDepsKey && lastWebRTCResultRef.current && initCountRef.current > 1) {
    console.log('⚡ STABILITY GUARD: Deps unchanged, but continuing execution to maintain hook consistency');
  }
  
  // ✅ DEBUGGING: Track input props to see what's changing with detailed identity checks
  useEffect(() => {
    console.log('🧪 USEWEBRTC: Props changed - detailed analysis:', {
      enabled,
      playerId,
      gameState: gameState ? 'present' : 'null',
      onGameStateReceived: !!onGameStateReceived,
      onPlayerAction: !!onPlayerAction,
      onConnectionLost: !!onConnectionLost,
      callbackIdentities: {
        onGameStateReceivedRef: onGameStateReceived?.toString().substring(0, 50),
        onPlayerActionRef: onPlayerAction?.toString().substring(0, 50),
        onConnectionLostRef: onConnectionLost?.toString().substring(0, 50)
      },
      gameStateDetails: gameState ? {
        gameStarted: gameState.gameStarted,
        gameCompleted: gameState.gameCompleted,
        playersCount: gameState.players?.length
      } : null
    });
  }, [enabled, playerId, gameState, onGameStateReceived, onPlayerAction, onConnectionLost]);
  
  const [webrtcState, setWebrtcState] = useState<WebRTCState>({
    localConnection: null,
    remoteConnection: null,
    isHost: false,
    connectionId: null,
    connectionStatus: 'disconnected',
    lastError: null
  });



  // Add ref to track ICE gathering state
  const iceGatheringCompleteRef = useRef(false);
  const connectionHealthCheckRef = useRef<NodeJS.Timeout | null>(null);

  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const signalingRoomRef = useRef<any>(null);
  const signalingListenersRef = useRef<any[]>([]);
  const webrtcStateRef = useRef<WebRTCState>(webrtcState);
  const pendingActionsRef = useRef<PlayerAction[]>([]);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  
  // Add refs for race condition protection and direct peer connection access
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const creatingConnectionRef = useRef(false);
  const isCleaningUpRef = useRef(false);
  
  // Add version control and disconnect protection
  const connectionVersionRef = useRef(0);
  const disconnectLockRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    webrtcStateRef.current = webrtcState;
  }, [webrtcState]);

  // Track isHost changes for debugging
  useEffect(() => {
    console.log('🔍 isHost state changed to:', webrtcState.isHost, 'connectionStatus:', webrtcState.connectionStatus, 'connectionId:', webrtcState.connectionId, '(instance:', hookInstanceId.current + ')');
  }, [webrtcState.isHost, webrtcState.connectionStatus, webrtcState.connectionId]);

  // Initialize peer connection with proper cleanup
  const createPeerConnection = useCallback(() => {
    if (!enabled) return null;

    // 🧹 Clean up any existing connection first
    const oldPc = peerConnectionRef.current;
    if (oldPc && (oldPc.signalingState as any) !== 'closed') {
      console.log('🧹 Closing old RTCPeerConnection before creating new one');
      console.log('🧹 Old connection signaling state:', oldPc.signalingState);
      console.log('🧹 Old connection state:', oldPc.connectionState);
      try {
        oldPc.close();
      } catch (error) {
        console.warn('⚠️ Error closing old connection:', error);
      }
    }

    try {
      console.log('🔧 Creating fresh RTCPeerConnection');
      const pc = new RTCPeerConnection(WEBRTC_CONFIG);
      
      // Store in ref for direct access
      peerConnectionRef.current = pc;
      
      // Add comprehensive logging for connection state changes
      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state changed to:', pc.connectionState);
        console.log('📊 Connection stats:', {
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
          iceGatheringState: pc.iceGatheringState,
          signalingState: pc.signalingState
        });
        
        setWebrtcState(prev => ({
          ...prev,
          connectionStatus: pc.connectionState === 'connected' ? 'connected' : 
                          pc.connectionState === 'failed' ? 'failed' : 'connecting'
        }));

        if (pc.connectionState === 'failed') {
          console.error('❌ Connection failed!');
          console.error('🔍 Failed connection details:', {
            connectionState: pc.connectionState,
            iceConnectionState: pc.iceConnectionState,
            iceGatheringState: pc.iceGatheringState,
            dataChannelState: dataChannelRef.current?.readyState,
            signalingState: pc.signalingState
          });
          
          setWebrtcState(prev => ({
            ...prev,
            connectionStatus: 'failed',
            lastError: 'Connection failed - ICE negotiation issue'
          }));
          
          // Log connection failure for debugging
          console.error('💔 WebRTC connection has failed completely. This usually indicates:');
          console.error('1. Network connectivity issues');
          console.error('2. Firewall blocking ICE candidates');
          console.error('3. NAT traversal problems');
          console.error('4. ICE candidate exchange incomplete');
          
          // Auto-retry connection once after failure
          console.warn('🔁 Attempting to restart WebRTC connection...');
          setTimeout(() => {
            if (peerConnectionRef.current && peerConnectionRef.current.connectionState === 'failed') {
              console.log('🔄 Connection still failed, triggering reconnection...');
              // Trigger a reconnection by resetting the connection
              const currentRoomId = signalingRoomRef.current;
              if (currentRoomId && onConnectionLost) {
                console.log('🔄 Notifying game of connection loss for retry');
                onConnectionLost();
              }
            }
          }, 3000); // Wait 3 seconds before retry
        }
        
        // Log when connection is established
        if (pc.connectionState === 'connected') {
          console.log('🎉 WebRTC connection fully established!');
          
          // Start connection health monitoring
          if (connectionHealthCheckRef.current) {
            clearInterval(connectionHealthCheckRef.current);
          }
          
          connectionHealthCheckRef.current = setInterval(() => {
            if (peerConnectionRef.current) {
              const currentState = peerConnectionRef.current.connectionState;
              const iceState = peerConnectionRef.current.iceConnectionState;
              
              if (currentState === 'failed' || iceState === 'failed') {
                console.warn('🩺 Health check detected failed connection, clearing monitor');
                if (connectionHealthCheckRef.current) {
                  clearInterval(connectionHealthCheckRef.current);
                  connectionHealthCheckRef.current = null;
                }
              } else if (currentState === 'connected' && iceState === 'connected') {
                console.log('💓 Connection health check: HEALTHY');
              } else if (currentState === 'disconnected' || iceState === 'disconnected') {
                console.warn('⚠️ Health check detected disconnection, monitoring...');
              }
            }
          }, 10000); // Check every 10 seconds
        }
      };

      // Add ICE connection state monitoring with restart capability
      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state changed to:', pc.iceConnectionState);
        
        // Sometimes data channel opens when ICE is connected, even if overall connection state is still connecting
        if (pc.iceConnectionState === 'connected' && dataChannelRef.current) {
          console.log('🧊 ICE connected - checking data channel state:', dataChannelRef.current.readyState);
        }
        
        if (pc.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed - attempting restart!');
          
          // Attempt ICE restart to recover connection
          try {
            console.log('🔄 Restarting ICE connection...');
            pc.restartIce();
          } catch (error) {
            console.error('❌ ICE restart failed:', error);
          }
        }
        
        if (pc.iceConnectionState === 'disconnected') {
          console.warn('⚠️ ICE connection disconnected - monitoring for recovery...');
          
          // Give it a few seconds to reconnect naturally
          setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') {
              console.log('🔄 ICE still disconnected after 5s, attempting restart...');
              try {
                pc.restartIce();
              } catch (error) {
                console.error('❌ ICE restart after disconnect failed:', error);
              }
            }
          }, 5000);
        }
      };

      // Add signaling state change logging with stack trace
      pc.onsignalingstatechange = () => {
        console.log('📡 Signaling state changed to:', pc.signalingState);
        if ((pc.signalingState as any) === 'closed' && !isCleaningUpRef.current) {
          console.error('❌ WARNING: Signaling state changed to CLOSED unexpectedly!');
          console.error('🔍 This happened outside of cleanup - investigating...');
          console.trace('Call stack when signaling state became closed:');
        }
      };
      
      pc.onicecandidate = (event) => {
        console.log('📦 Local ICE candidate event:', event.candidate);
        
        if (event.candidate && signalingRoomRef.current) {
          // ✅ Validate ICE candidate before sending (per your suggestion)
          if (event.candidate.sdpMid && event.candidate.sdpMLineIndex != null) {
            console.log('📡 Sending ICE candidate:', {
              type: event.candidate.type,
              protocol: event.candidate.protocol,
              address: event.candidate.address,
              port: event.candidate.port,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              foundation: event.candidate.foundation,
              priority: event.candidate.priority,
              candidate: event.candidate.candidate.substring(0, 50) + '...' // Truncate for readability
            });
            
            // Manually serialize ICE candidate to ensure Firebase compatibility
            const candidateData = {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              usernameFragment: event.candidate.usernameFragment
            };
            
            console.log('📤 Sending valid ICE candidate data to Firebase');
            
            sendSignalingMessage({
              type: 'ice_candidate',
              data: candidateData,
              timestamp: Date.now(),
              playerId
            });
          } else {
            console.warn('🚫 Not sending invalid ICE candidate:', event.candidate);
            console.warn('🚫 Missing sdpMid or sdpMLineIndex:', {
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              candidate: event.candidate.candidate
            });
          }
        } else if (!event.candidate) {
          console.log('✅ ICE candidate gathering complete (null candidate received)');
          iceGatheringCompleteRef.current = true;
          console.log('📊 ICE gathering status: COMPLETE');
          
          // Log total ICE candidates gathered for debugging
          console.log('📊 ICE gathering summary - check if we have enough candidates for connection');
        }
      };

      pc.ondatachannel = (event) => {
        console.log('📨 Data channel received');
        const channel = event.channel;
        setupDataChannel(channel);
      };

      console.log('✅ Fresh RTCPeerConnection created, initial signaling state:', pc.signalingState);
      console.log('✅ Connection stored in ref and ready for use');
      
      // Reset ICE gathering state for new connection
      iceGatheringCompleteRef.current = false;
      console.log('📊 ICE gathering status: RESET for new connection');
      
      return pc;
    } catch (error) {
      console.error('❌ Failed to create peer connection:', error);
      peerConnectionRef.current = null;
      setWebrtcState(prev => ({
        ...prev,
        lastError: `Failed to create connection: ${error}`
      }));
      return null;
    }
  }, [enabled, playerId]);

  // Setup data channel for game communication
  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    console.log(`📨 Setting up data channel - initial state: ${channel.readyState}`);
    dataChannelRef.current = channel;

    // Monitor state changes for debugging
    const logStateChange = () => {
      console.log(`📨 Data channel state: ${channel.readyState}`);
    };
    
    // Log initial state and monitor changes
    logStateChange();
    const stateCheckInterval = setInterval(() => {
      const currentState = channel.readyState;
      if (currentState !== 'connecting') {
        console.log(`📨 Data channel state transition: connecting → ${currentState}`);
        clearInterval(stateCheckInterval);
      }
    }, 500);

    // Add timeout to detect stuck connections
    setTimeout(() => {
      clearInterval(stateCheckInterval);
      if (channel.readyState === 'connecting') {
        console.warn('⚠️ Data channel stuck in connecting state for 30 seconds - this may indicate connection issues');
        console.warn('📊 Current WebRTC states:', {
          dataChannelState: channel.readyState,
          connectionState: peerConnectionRef.current?.connectionState,
          iceConnectionState: peerConnectionRef.current?.iceConnectionState,
          signalingState: peerConnectionRef.current?.signalingState
        });
      }
    }, 30000);

    channel.onopen = () => {
      console.log('✅ Data channel opened - processing pending actions...');
      setWebrtcState(prev => ({
        ...prev,
        connectionStatus: 'connected'
      }));

      // Process any pending actions that were queued while channel was connecting
      const pendingActions = pendingActionsRef.current;
      if (pendingActions.length > 0) {
        console.log(`📤 Sending ${pendingActions.length} queued actions...`);
        pendingActions.forEach(action => {
          console.log(`📤 Sending queued action: ${action.type}`);
          const message: WebRTCMessage = {
            type: 'player_action',
            data: action,
            timestamp: Date.now(),
            playerId
          };
          
          try {
            channel.send(JSON.stringify(message));
            console.log(`✅ Successfully sent queued action: ${action.type}`);
          } catch (error) {
            console.error(`❌ Error sending queued action: ${action.type}`, error);
          }
        });
        pendingActionsRef.current = []; // Clear the queue
      }
    };

    channel.onclose = () => {
      console.log('Data channel closed');
      setWebrtcState(prev => ({
        ...prev,
        connectionStatus: 'disconnected'
      }));
    };

    channel.onmessage = (event) => {
      try {
        const message: WebRTCMessage = JSON.parse(event.data);
        console.log(`📥 Received WebRTC message: ${message.type}`, message.data);
        handleReceivedMessage(message);
      } catch (error) {
        console.error('❌ Error parsing received message:', error);
      }
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
      setWebrtcState(prev => ({
        ...prev,
        lastError: 'Data channel error'
      }));
    };
  }, []);

  // Handle received WebRTC messages
  const handleReceivedMessage = useCallback((message: WebRTCMessage) => {
    console.log(`🔄 Processing message type: ${message.type}`);
    
    switch (message.type) {
      case 'game_state':
        console.log('📊 Processing game state update');
        onGameStateReceived(message.data);
        break;
      case 'player_action':
        console.log(`🎮 Processing player action: ${message.data?.type}`);
        if (message.data?.type === 'new_cards') {
          console.log('🔍 DEBUG new_cards:', {
            hasCards: !!message.data.cards,
            cardsLength: message.data.cards?.length || 0,
            cardIds: message.data.cards?.map((c: any) => c.id) || []
          });
        }
        onPlayerAction(message.data);
        break;
      case 'icon_click':
        console.log('🎯 Processing icon click');
        onPlayerAction({
          type: 'icon_click',
          iconId: message.data.iconId,
          timestamp: message.timestamp
        });
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }, [onGameStateReceived, onPlayerAction]);

  // Send signaling message via Firebase
  const sendSignalingMessage = useCallback((message: WebRTCMessage) => {
    if (!signalingRoomRef.current) {
      console.error('❌ Cannot send signaling message - no room reference');
      return;
    }
    
    const messageToSend = {
      ...message,
      timestamp: Date.now(),
      senderId: playerId
    };
    
    console.log('📤 Sending to Firebase:', messageToSend);
    
    const messagesRef = child(signalingRoomRef.current, 'messages');
    push(messagesRef, messageToSend)
      .then((ref) => {
        console.log('✅ Message sent to Firebase successfully:', ref.key);
        
        // Special logging for ICE candidates
        if (message.type === 'ice_candidate') {
          console.log('✅ ICE candidate stored in Firebase with key:', ref.key);
          console.log('✅ ICE candidate data was:', message.data);
        }
      })
      .catch(error => {
        console.error('❌ Error sending signaling message:', error);
        console.error('❌ Failed message was:', messageToSend);
        setWebrtcState(prev => ({
          ...prev,
          lastError: 'Failed to send signaling message'
        }));
      });
  }, [playerId]);

  // Handle incoming signaling messages
  const handleSignalingMessage = useCallback(async (message: WebRTCMessage, messageKey: string) => {
    console.log('📥 Raw signaling message received:', { message, messageKey });
    
    if (message.senderId === playerId) return; // Ignore own messages
    
    // Check if we've already processed this message
    const messageId = `${message.type}_${message.timestamp}_${messageKey}`;
    if (processedMessagesRef.current.has(messageId)) {
      console.log(`⚠️ Skipping duplicate message: ${message.type} (${messageId})`);
      return;
    }
    
    // Mark message as processed
    processedMessagesRef.current.add(messageId);
    
    try {
      // Access current connection from ref instead of state to avoid dependency issues
      const pc = webrtcStateRef.current?.localConnection;
      if (!pc) {
        console.warn('⚠️ No peer connection available to process signaling message');
        return;
      }

      switch (message.type) {
        case 'offer':
          console.log('Received offer, current signaling state:', pc.signalingState);
          // Only process offer if we're in the right state
          if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
            console.log('Processing offer...');
            await pc.setRemoteDescription(new RTCSessionDescription(message.data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            sendSignalingMessage({
              type: 'answer',
              data: answer,
              timestamp: Date.now(),
              playerId
            });
            console.log('Answer sent successfully');
          } else {
            console.log('Ignoring offer - wrong signaling state:', pc.signalingState);
          }
          break;
          
        case 'answer':
          console.log('Received answer, current signaling state:', pc.signalingState);
          // Only process answer if we're expecting one
          if (pc.signalingState === 'have-local-offer') {
            console.log('Processing answer...');
            await pc.setRemoteDescription(new RTCSessionDescription(message.data));
            console.log('Answer processed successfully');
          } else {
            console.log('Ignoring answer - wrong signaling state:', pc.signalingState);
          }
          break;
          
        case 'ice_candidate':
          console.log('📨 Received ICE candidate from Firebase');
          // Validate ICE candidate data before processing
          const candidateData = message.data;
          
          // Enhanced logging to understand what we're receiving
          console.log('📶 Adding ICE candidate:', {
            type: candidateData?.type || 'unknown',
            protocol: candidateData?.protocol || 'unknown', 
            address: candidateData?.address || 'unknown',
            port: candidateData?.port || 'unknown',
            sdpMid: candidateData?.sdpMid,
            sdpMLineIndex: candidateData?.sdpMLineIndex,
            foundation: candidateData?.foundation || 'unknown',
            priority: candidateData?.priority || 'unknown',
            candidate: candidateData?.candidate?.substring(0, 50) + '...' || 'invalid'
          });
          
          // ✅ Validate using your suggested criteria
          if (!candidateData || !candidateData.sdpMid || candidateData.sdpMLineIndex == null) {
            console.warn('⚠️ Skipping invalid ICE candidate (missing sdpMid or sdpMLineIndex):', {
              hasData: !!candidateData,
              sdpMid: candidateData?.sdpMid,
              sdpMLineIndex: candidateData?.sdpMLineIndex,
              hasCandidate: !!candidateData?.candidate,
              candidateString: candidateData?.candidate?.substring(0, 100) || 'missing'
            });
            break;
          }
          
          if (pc.remoteDescription) {
            try {
              console.log('🧊 Adding validated ICE candidate to peer connection');
              await pc.addIceCandidate(new RTCIceCandidate(candidateData));
              console.log('✅ ICE candidate added successfully');
            } catch (error) {
              console.error('❌ Failed to add ICE candidate:', error);
              console.error('❌ Candidate data was:', candidateData);
              console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
            }
          } else {
            console.warn('⏳ No remote description yet - cannot add ICE candidate');
            console.warn('⏳ Current signaling state:', pc.signalingState);
            console.warn('⏳ Connection state:', pc.connectionState);
            console.warn('⏳ ICE connection state:', pc.iceConnectionState);
            console.warn('⏳ Candidate will be lost - consider implementing candidate queuing');
            // TODO: Could implement ICE candidate queuing here for early candidates
          }
          break;
      }
      
      // Remove processed message to keep the room clean
      if (signalingRoomRef.current && messageKey) {
        const messageRef = child(child(signalingRoomRef.current, 'messages'), messageKey);
        remove(messageRef).catch(console.error);
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
      setWebrtcState(prev => ({
        ...prev,
        lastError: `Signaling error: ${error}`
      }));
    }
  }, [playerId, sendSignalingMessage]);

  // Connect to Firebase signaling room
  const connectToSignalingServer = useCallback(async (roomId: string) => {
    try {
      console.log('Connecting to signaling room:', roomId);
      
      // Create room reference
      signalingRoomRef.current = ref(rtdb, `name-it-signaling/${roomId}`);
      
      // Listen for signaling messages
      const messagesRef = child(signalingRoomRef.current, 'messages');
      const messageListener = onValue(messagesRef, (snapshot) => {
        const messages = snapshot.val();
        console.log('📨 Firebase messages snapshot:', messages);
        
        if (messages) {
          Object.entries(messages).forEach(([messageKey, message]: [string, any]) => {
            console.log(`📨 Processing Firebase message ${messageKey}:`, message);
            handleSignalingMessage(message, messageKey);
          });
        }
      }, (error) => {
        console.error('❌ Firebase signaling listener error:', error);
        setWebrtcState(prev => ({
          ...prev,
          lastError: `Firebase error: ${error.message}`
        }));
      });
      
      signalingListenersRef.current.push(messageListener);
      
      // Set room metadata
      const metadataRef = child(signalingRoomRef.current, 'metadata');
      await set(metadataRef, {
        lastActivity: Date.now(),
        participants: {
          [playerId]: {
            name: playerId,
            joinedAt: Date.now()
          }
        }
      });
      
      setWebrtcState(prev => ({
        ...prev,
        connectionStatus: 'connecting',
        connectionId: roomId
      }));
      
      console.log('Connected to signaling room successfully');
    } catch (error) {
      console.error('Error connecting to signaling server:', error);
      setWebrtcState(prev => ({
        ...prev,
        connectionStatus: 'failed',
        lastError: `Connection failed: ${error}`
      }));
    }
  }, [playerId, handleSignalingMessage]);

  // Create a new room (host) with version control and race protection
  const createRoom = useCallback(async (): Promise<string> => {
    if (!enabled) throw new Error('WebRTC not enabled');
    
    // 🚫 Race condition protection
    if (creatingConnectionRef.current) {
      console.warn('⚠️ Connection creation already in progress, rejecting duplicate request');
      throw new Error('Connection already being created');
    }
    
    // 🔢 Increment version to invalidate stale operations
    const myVersion = ++connectionVersionRef.current;
    creatingConnectionRef.current = true;
    console.log(`🎯 Creating new room (v${myVersion}) with race protection...`);
    
    try {
      // 🧹 Full cleanup before starting
      console.log('🧹 Performing full cleanup before creating room');
      await disconnect();

      // ✅ Check if we're still the current version after cleanup
      if (myVersion !== connectionVersionRef.current) {
        console.log(`🔁 Aborting stale createRoom (v${myVersion}), newer version already started`);
        throw new Error('Stale createRoom call detected - aborting');
      }

      const roomId = Math.random().toString(36).substring(2, 15);
      console.log(`🏠 Generated room ID: ${roomId} (v${myVersion})`);
      
      const pc = createPeerConnection();
      if (!pc) throw new Error('Failed to create peer connection');

      // ✅ Check version again after peer connection creation
      if (myVersion !== connectionVersionRef.current) {
        console.log(`🔁 Aborting stale createRoom (v${myVersion}) after PC creation`);
        pc.close();
        throw new Error('Stale createRoom call detected - aborting');
      }

      // 🛡️ Immediate validation after creation
      if ((pc.signalingState as any) === 'closed') {
        console.error('❌ CRITICAL: Peer connection is already closed after creation!');
        throw new Error('Peer connection closed immediately after creation');
      }

      console.log(`✅ Storing peer connection in state (v${myVersion}), signaling state:`, pc.signalingState);
      console.log('🔧 SETTING isHost = true in createRoom');
      setWebrtcState(prev => ({
        ...prev,
        isHost: true,
        connectionId: roomId,
        localConnection: pc
      }));

      console.log(`🔄 Connecting to signaling server (v${myVersion})...`);
      await connectToSignalingServer(roomId);
      
      // ✅ Critical version check after signaling connection
      if (myVersion !== connectionVersionRef.current) {
        console.log(`🔁 Aborting stale createRoom (v${myVersion}) after signaling connection`);
        throw new Error('Stale createRoom call detected after signaling - aborting');
      }
      
      // 🛡️ Validation after signaling connection - use ref for most current state
      const currentPc = peerConnectionRef.current;
      if (!currentPc || (currentPc.signalingState as any) === 'closed') {
        console.error(`❌ CRITICAL: Peer connection was closed during signaling server connection! (v${myVersion})`);
        console.error('🔍 Current PC exists:', !!currentPc);
        console.error('🔍 Current PC signaling state:', currentPc?.signalingState);
        throw new Error('Connection closed during signaling setup');
      }
      
      // 🎯 Create data channel BEFORE creating offer (critical for proper negotiation)
      console.log('📨 Creating data channel BEFORE offer (for proper SDP negotiation)');
      const dataChannel = currentPc.createDataChannel('gameData', {
        ordered: true
      });
      
      // Set up data channel immediately
      setupDataChannel(dataChannel);
      
      // 🎯 Create and send offer with maximum protection
      try {
        console.log(`📞 Creating offer with protected connection (v${myVersion})...`);
        console.log('📡 Signaling state before createOffer:', currentPc.signalingState);
        console.log('🔗 Connection state before createOffer:', currentPc.connectionState);
        
        // 🛡️ Final validation before creating offer
        if ((currentPc.signalingState as any) === 'closed') {
          throw new Error('Cannot create offer: connection is closed');
        }
        
        const offer = await currentPc.createOffer();
        
        // ✅ Final version check before completing
        if (myVersion !== connectionVersionRef.current) {
          console.log(`🔁 Aborting stale createRoom (v${myVersion}) before sending offer`);
          throw new Error('Stale createRoom call detected before offer - aborting');
        }
        
        console.log('✅ Offer created successfully, setting local description');
        await currentPc.setLocalDescription(offer);
        
        sendSignalingMessage({
          type: 'offer',
          data: offer,
          timestamp: Date.now(),
          playerId
        });
        
        console.log(`🚀 Room created successfully with ID: ${roomId} (v${myVersion})`);
        return roomId;
        
      } catch (error) {
        console.error(`❌ Error creating offer (v${myVersion}):`, error);
        console.error('🔗 Final connection state:', currentPc.connectionState);
        console.error('📡 Final signaling state:', currentPc.signalingState);
        throw new Error('Failed to create connection offer');
      }
      
    } catch (error) {
      console.error(`❌ Failed to create room (v${myVersion}):`, error);
      // Only clean up if we're still the current version
      if (myVersion === connectionVersionRef.current) {
        console.log(`🧹 Cleaning up failed room creation (v${myVersion})`);
        await disconnect();
      }
      throw error;
    } finally {
      creatingConnectionRef.current = false;
    }
  }, [enabled, createPeerConnection, setupDataChannel, connectToSignalingServer, playerId]);

  // Join an existing room with version control
  const joinRoom = useCallback(async (roomId: string): Promise<void> => {
    if (!enabled) throw new Error('WebRTC not enabled');

    // 🔢 Increment version to invalidate stale operations
    const myVersion = ++connectionVersionRef.current;
    console.log(`🎯 Joining room ${roomId} (v${myVersion}) with race protection...`);

    try {
      // 🧹 Full cleanup before starting
      console.log('🧹 Performing full cleanup before joining room');
      await disconnect();

      // ✅ Check if we're still the current version after cleanup
      if (myVersion !== connectionVersionRef.current) {
        console.log(`🔁 Aborting stale joinRoom (v${myVersion}), newer version already started`);
        throw new Error('Stale joinRoom call detected - aborting');
      }

      const pc = createPeerConnection();
      if (!pc) throw new Error('Failed to create peer connection');

      // ✅ Check version again after peer connection creation
      if (myVersion !== connectionVersionRef.current) {
        console.log(`🔁 Aborting stale joinRoom (v${myVersion}) after PC creation`);
        pc.close();
        throw new Error('Stale joinRoom call detected - aborting');
      }

      setWebrtcState(prev => ({
        ...prev,
        isHost: false,
        connectionId: roomId,
        localConnection: pc
      }));

      console.log(`🔄 Connecting to signaling server for room ${roomId} (v${myVersion})...`);
      await connectToSignalingServer(roomId);

      // ✅ Version check after signaling connection
      if (myVersion !== connectionVersionRef.current) {
        console.log(`🔁 Aborting stale joinRoom (v${myVersion}) after signaling connection`);
        throw new Error('Stale joinRoom call detected after signaling - aborting');
      }

      console.log(`🎯 Joined room ${roomId} (v${myVersion}) and listening for offers`);
    } catch (error) {
      console.error(`❌ Failed to join room (v${myVersion}):`, error);
      // Only clean up if we're still the current version
      if (myVersion === connectionVersionRef.current) {
        console.log(`🧹 Cleaning up failed room join (v${myVersion})`);
        await disconnect();
      }
      throw error;
    }
  }, [enabled, createPeerConnection, connectToSignalingServer]);

  // Send game state to remote peer
  const sendGameState = useCallback((partialGameState: Partial<GameState>) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      console.warn('Data channel not open');
      return;
    }

    const message: WebRTCMessage = {
      type: 'game_state',
      data: partialGameState,
      timestamp: Date.now(),
      playerId
    };

    try {
      dataChannelRef.current.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending game state:', error);
    }
  }, [playerId]);

  // Send player action to remote peer
  const sendPlayerAction = useCallback((action: PlayerAction) => {
    console.log(`📤 Attempting to send player action: ${action.type}`);
    
    if (!dataChannelRef.current) {
      console.warn('❌ Data channel not available - queueing action');
      pendingActionsRef.current.push(action);
      return;
    }
    
    if (dataChannelRef.current.readyState !== 'open') {
      console.warn(`⏳ Data channel not ready (${dataChannelRef.current.readyState}) - queueing action: ${action.type}`);
      pendingActionsRef.current.push(action);
      return;
    }

    const message: WebRTCMessage = {
      type: 'player_action',
      data: action,
      timestamp: Date.now(),
      playerId
    };

    try {
      dataChannelRef.current.send(JSON.stringify(message));
      console.log(`✅ Successfully sent player action: ${action.type}`);
    } catch (error) {
      console.error('❌ Error sending player action:', error);
      // If send fails, queue it for retry
      pendingActionsRef.current.push(action);
    }
  }, [playerId]);

  // Disconnect from WebRTC with race protection and locking
  const disconnect = useCallback(async () => {
    console.log('🚨 DISCONNECT CALLED! Stack trace:');
    console.trace();
    if (!enabled) return;

    // 🔒 Prevent overlapping disconnect calls
    if (disconnectLockRef.current) {
      console.log('⚠️ Disconnect skipped — already in progress');
      return;
    }

    disconnectLockRef.current = true;
    isCleaningUpRef.current = true;
    
    // ✅ Warn about premature disconnection during ICE gathering
    if (!iceGatheringCompleteRef.current && peerConnectionRef.current?.iceGatheringState === 'gathering') {
      console.warn('⚠️ WARNING: Disconnecting during ICE gathering! This may cause connection issues.');
      console.warn('⚠️ ICE gathering state:', peerConnectionRef.current?.iceGatheringState);
      console.warn('⚠️ Connection state:', peerConnectionRef.current?.connectionState);
    }
    
    try {
      console.log('🧹 Starting WebRTC disconnect...');
      
      // Close data channel
      if (dataChannelRef.current) {
        console.log('🧹 Closing data channel');
        try {
          dataChannelRef.current.close();
        } catch (error) {
          console.warn('⚠️ Error closing data channel:', error);
        }
        dataChannelRef.current = null;
      }

      // Close peer connections using refs for most current state
      const localPc = peerConnectionRef.current;
      if (localPc && (localPc.signalingState as any) !== 'closed') {
        console.log('🧹 Closing local peer connection');
        try {
          localPc.close();
        } catch (error) {
          console.warn('⚠️ Error closing local peer connection:', error);
        }
      }
      peerConnectionRef.current = null;

      // Also close any connections stored in state as fallback
      if (webrtcState.localConnection && (webrtcState.localConnection.signalingState as any) !== 'closed') {
        console.log('🧹 Closing state-stored local connection');
        try {
          webrtcState.localConnection.close();
        } catch (error) {
          console.warn('⚠️ Error closing state-stored connection:', error);
        }
      }

      if (webrtcState.remoteConnection && (webrtcState.remoteConnection.signalingState as any) !== 'closed') {
        console.log('🧹 Closing remote connection');
        try {
          webrtcState.remoteConnection.close();
        } catch (error) {
          console.warn('⚠️ Error closing remote connection:', error);
        }
      }

      // Clean up Firebase listeners
      console.log('🧹 Cleaning up Firebase listeners');
      signalingListenersRef.current.forEach(listener => {
        if (typeof listener === 'function') {
          try {
            off(signalingRoomRef.current, 'value', listener);
          } catch (error) {
            console.warn('⚠️ Error removing Firebase listener:', error);
          }
        }
      });
      signalingListenersRef.current = [];
      
      // Clean up room reference
      if (signalingRoomRef.current) {
        console.log('🧹 Cleaning up Firebase room reference');
        // Remove player from room metadata
        try {
          const participantRef = child(child(signalingRoomRef.current, 'metadata'), `participants/${playerId}`);
          await remove(participantRef).catch(console.error);
        } catch (error) {
          console.error('Error cleaning up room:', error);
        }
        signalingRoomRef.current = null;
      }

      // Reset state
      console.log('🔧 RESETTING isHost = false in disconnect');
      setWebrtcState({
        localConnection: null,
        remoteConnection: null,
        isHost: false,
        connectionId: null,
        connectionStatus: 'disconnected',
        lastError: null
      });

      // Also update ref state
      webrtcStateRef.current = {
        localConnection: null,
        remoteConnection: null,
        isHost: false,
        connectionId: null,
        connectionStatus: 'disconnected',
        lastError: null
      };

      // Clear any pending actions and processed messages
      if (pendingActionsRef.current.length > 0) {
        console.log(`🧹 Clearing ${pendingActionsRef.current.length} pending actions`);
        pendingActionsRef.current = [];
      }
      
      if (processedMessagesRef.current.size > 0) {
        console.log(`🧹 Clearing ${processedMessagesRef.current.size} processed message IDs`);
        processedMessagesRef.current.clear();
      }
      
      // Clear connection health monitoring
      if (connectionHealthCheckRef.current) {
        console.log('🧹 Clearing connection health monitor');
        clearInterval(connectionHealthCheckRef.current);
        connectionHealthCheckRef.current = null;
      }

      console.log('✅ WebRTC disconnect completed');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    } finally {
      // Reset flags
      disconnectLockRef.current = false;
      isCleaningUpRef.current = false;
    }
  }, [enabled, webrtcState.localConnection, webrtcState.remoteConnection, playerId]);

  // Cleanup on unmount only (no dependencies to avoid cleanup during re-renders)
  useEffect(() => {
    return () => {
      // Use ref to get latest disconnect function without triggering re-runs
      if (peerConnectionRef.current) {
        console.log('🧹 Component unmounting - cleaning up WebRTC connection');
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      // Clean up other refs without calling full disconnect to avoid race
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
      
      // Clean up Firebase listeners
      signalingListenersRef.current.forEach(listener => {
        if (typeof listener === 'function') {
          try {
            off(signalingRoomRef.current, 'value', listener);
          } catch (error) {
            console.warn('⚠️ Error removing Firebase listener on unmount:', error);
          }
        }
      });
      signalingListenersRef.current = [];
      signalingRoomRef.current = null;
    };
  }, []); // ✅ Empty dependency array - only runs on unmount!

  // Auto-sync game state when it changes (for host)
  useEffect(() => {
    if (enabled && webrtcState.isHost && webrtcState.connectionStatus === 'connected') {
      // Debounce game state updates to prevent spam
      const timeoutId = setTimeout(() => {
        sendGameState(gameState);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [enabled, webrtcState.isHost, webrtcState.connectionStatus, gameState, sendGameState]);

  // Debug return values when they change
  const returnValues = {
    webrtcState,
    createRoom,
    joinRoom,
    sendGameState,
    sendPlayerAction,
    disconnect,
    isHost: webrtcState.isHost,
    connectionId: webrtcState.connectionId,
    connectionStatus: webrtcState.connectionStatus
  };
  
  // Log when return values change
  useEffect(() => {
    console.log('🔍 useWebRTC RETURN VALUES CHANGED (instance:', hookInstanceId.current + '):', {
      isHost: returnValues.isHost,
      connectionId: returnValues.connectionId,
      connectionStatus: returnValues.connectionStatus,
      webrtcStateRef: webrtcStateRef.current
    });
  }, [returnValues.isHost, returnValues.connectionId, returnValues.connectionStatus]);

  // ✅ STABILITY GUARD: Cache result for future early returns
  lastWebRTCDepsRef.current = currentWebRTCDepsKey;
  lastWebRTCResultRef.current = returnValues;

  return returnValues;
};

export default useWebRTC; 