// PATCHED: useWebRTCSimple.ts (cleaned production version)
// CACHE BUST v4: Cleaned debugging logs 2025-08-06

import { useRef, useCallback, useEffect, useState } from 'react';
import { ref, push, onValue, set, remove, off, get } from 'firebase/database';
import { rtdb as realtimeDb } from '../../../../config/firebase';
import { WEBRTC_CONFIG as BASE_WEBRTC_CONFIG } from '../constants';

// Extended WEBRTC_CONFIG with fallback TURN config
export const WEBRTC_CONFIG = {
  ...BASE_WEBRTC_CONFIG,
  iceServers: [
    ...(BASE_WEBRTC_CONFIG.iceServers || []),
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Add public TURN servers for better connectivity
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject', 
      credential: 'openrelayproject'
    }
  ]
};

// --- Interfaces ---
interface UseWebRTCSimpleReturn {
  isHost: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'failed';
  roomId: string | null;
  sendMessage: (message: any) => void;
  disconnect: () => void;
  joinRoom: (roomId: string) => Promise<void>;
  createRoom: () => Promise<string>;
}

interface UseWebRTCSimpleProps {
  enabled: boolean;
  playerId: string;
  onMessage?: (message: any) => void;
}

interface WebRTCMessage {
  type: 'offer' | 'answer' | 'ice_candidate' | 'ice_gathering_complete';
  data: any;
  timestamp: number;
  playerId: string;
}

// --- Constants ---
const MAX_READY_CHECKS = 10;
const CHECK_INTERVAL = 500;

// --- Helper Functions ---
function logConnectionState(peerConnectionRef: any, dataChannelRef: any) {
  const pc = peerConnectionRef.current;
  const dc = dataChannelRef.current;
  
  console.log('📊 Connection State:', {
    connection: pc?.connectionState || 'none',
    signaling: pc?.signalingState || 'none', 
    dcReadyState: dc?.readyState || 'none',
    ice: pc?.iceConnectionState || 'none',
    iceGathering: pc?.iceGatheringState || 'none'
  });
}

function sendPingOrRecoverySignal(dataChannelRef: any) {
  const dc = dataChannelRef.current;
  if (dc?.readyState !== 'open') {
    return false;
  }
  try {
    dc.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
    return true;
  } catch (error) {
    console.error('❌ Recovery ping failed:', error);
    return false;
  }
}

function startReadyStateMonitor(
  setConnectionStatus: (status: any) => void,
  dataChannelRef: any,
  pendingActionsRef: any,
  stuckCheckRef: any,
  logConnectionStateFn: () => void,
  peerConnectionRef: any
) {
  console.log('🔍 Starting data channel monitor');
  stuckCheckRef.current = 0;
  
  const interval = setInterval(() => {
    const dc = dataChannelRef.current;
    stuckCheckRef.current++;
    
    if (dc?.readyState === 'open') {
      clearInterval(interval);
      console.log('✅ Data channel opened via monitor');
      setConnectionStatus('connected');
      // Flush pending messages
      if (pendingActionsRef.current.length > 0) {
        pendingActionsRef.current.forEach((msg: any) => {
          try {
            dc.send(JSON.stringify(msg));
          } catch (error) {
            console.error('❌ Failed to send pending message:', error);
          }
        });
        pendingActionsRef.current = [];
      }
      return;
    }
    
    if (stuckCheckRef.current >= MAX_READY_CHECKS) {
      clearInterval(interval);
      console.warn('⚠️ Data channel stuck - attempting ICE restart recovery');
      
      // Try ICE restart if peer connection exists
      if (peerConnectionRef.current && peerConnectionRef.current.connectionState !== 'closed') {
        try {
          peerConnectionRef.current.restartIce();
          
          // Give ICE restart time to work before falling back to Firebase
          setTimeout(() => {
            if (dc?.readyState !== 'open') {
              console.log('🔄 ICE restart failed, activating Firebase fallback');
              setConnectionStatus('connected');
            }
          }, 5000);
        } catch (error) {
          console.error('❌ ICE restart failed:', error);
          setConnectionStatus('connected');
        }
      } else {
        setConnectionStatus('connected');
      }
      
      return;
    }
  }, CHECK_INTERVAL);
}

// --- ICE candidate validation ---
function isValidIceCandidate(candidate: any): boolean {
  return candidate && 
         candidate.sdpMid != null && 
         candidate.sdpMLineIndex != null &&
         typeof candidate.candidate === 'string';
}

// Start JOINER watchdog to detect ondatachannel issues
function startJoinerWatchdog(timeoutMs: number, dataChannelRef: any) {
  setTimeout(() => {
    if (!dataChannelRef.current) {
      console.warn(`⚠️ [JOINER] ondatachannel never fired within ${timeoutMs}ms`);
    }
  }, timeoutMs);
}

// --- 🔧 FIREBASE FALLBACK: When WebRTC SCTP fails ---
let firebaseFallbackActive = false;
let firebaseFallbackListener: any = null;

function activateFirebaseFallback(roomId: string, playerId: string, onMessage: any) {
  if (firebaseFallbackActive) return true;
  
  console.log('🔄 Activating Firebase fallback messaging');
  firebaseFallbackActive = true;
  
  // Listen for messages via Firebase instead of WebRTC
  const fallbackRef = ref(realtimeDb, `webrtc_rooms/${roomId}/fallback_messages`);
  firebaseFallbackListener = onValue(fallbackRef, (snapshot) => {
    const messages = snapshot.val();
    if (!messages) return;
    
    Object.entries(messages).forEach(([messageKey, message]: [string, any]) => {
      if (message.playerId !== playerId && onMessage) {
        onMessage(message.data);
        
        // Clean up processed message
        const msgRef = ref(realtimeDb, `webrtc_rooms/${roomId}/fallback_messages/${messageKey}`);
        remove(msgRef).catch(console.error);
      }
    });
  });
  
  console.log('✅ Firebase fallback active');
  return true;
}

function sendFirebaseFallbackMessage(roomId: string, playerId: string, message: any) {
  if (!firebaseFallbackActive) return false;
  
  try {
    const fallbackRef = ref(realtimeDb, `webrtc_rooms/${roomId}/fallback_messages`);
    push(fallbackRef, {
      playerId,
      data: message,
      timestamp: Date.now()
    });
    return true;
  } catch (error) {
    console.error('❌ Failed to send fallback message:', error);
    return false;
  }
}

// --- Main Hook ---
console.log('🚀 useWebRTCSimple: PRODUCTION VERSION v4.0');

export function useWebRTCSimple({
  enabled,
  playerId,
  onMessage
}: UseWebRTCSimpleProps): UseWebRTCSimpleReturn {
  console.log('🔌 useWebRTCSimple: enabled =', enabled, 'playerId =', playerId);

  // State
  const [isHost, setIsHost] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
  const [roomId, setRoomId] = useState<string | null>(null);

  // Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const signalingListenerRef = useRef<any>(null);
  const roomIdRef = useRef<string | null>(null);
  const isHostRef = useRef<boolean>(false);
  const pendingActionsRef = useRef<any[]>([]);
  const iceCandidateQueueRef = useRef<any[]>([]);
  const lastOfferRef = useRef<string | null>(null);
  const stuckCheckRef = useRef<number>(0);

  // Send signaling message to Firebase
  const sendSignalingMessage = useCallback(async (message: WebRTCMessage) => {
    if (!roomIdRef.current) return;
    
    try {
      const messagesRef = ref(realtimeDb, `webrtc_rooms/${roomIdRef.current}/messages`);
      await push(messagesRef, message);
    } catch (error) {
      console.error('❌ Failed to send signaling message:', error);
    }
  }, []);

  // Handle incoming signaling messages
  const handleSignalingMessage = useCallback(async (message: WebRTCMessage, messageKey: string) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      // Prevent processing duplicate messages
      if (message.playerId === playerId) return;

      switch (message.type) {
        case 'offer': {
          // Duplicate offer protection
          const offerSdp = JSON.stringify(message.data);
          if (lastOfferRef.current === offerSdp) {
            console.warn('⚠️ Duplicate offer received - skipping');
            break;
          }
          lastOfferRef.current = offerSdp;

          console.log('📥 [JOINER] Processing offer');
          
          // Handle unexpected signaling state
          if (pc.signalingState !== 'stable') {
            console.warn('⚠️ Unexpected signaling state – forcing rollback from:', pc.signalingState);
            await pc.setLocalDescription({ type: 'rollback' });
          }

          await pc.setRemoteDescription(message.data);
          
          // Process queued ICE candidates
          while (iceCandidateQueueRef.current.length > 0) {
            const candidate = iceCandidateQueueRef.current.shift();
            if (isValidIceCandidate(candidate)) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                console.error('❌ Failed to add queued ICE candidate:', err);
              }
            }
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await sendSignalingMessage({
            type: 'answer',
            data: answer,
            timestamp: Date.now(),
            playerId
          });

          break;
        }

        case 'answer': {
          console.log('📥 [HOST] Processing answer');
          
          if (pc.signalingState !== 'have-local-offer') {
            console.warn('⚠️ Unexpected signaling state for answer:', pc.signalingState);
            break;
          }

          await pc.setRemoteDescription(message.data);
          break;
        }

        case 'ice_candidate': {
          const candidateData = message.data;
          if (!isValidIceCandidate(candidateData)) {
            console.warn('⚠️ Skipping invalid ICE candidate');
            break;
          }
          
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidateData));
            } catch (err) {
              console.error('❌ Failed to add ICE candidate:', err);
            }
          } else {
            iceCandidateQueueRef.current.push(candidateData);
          }
          break;
        }

        case 'ice_gathering_complete': {
          console.log('🏁 ICE gathering complete signal received');
          break;
        }
      }

      // Clean up processed message
      if (roomIdRef.current && messageKey) {
        const messageRef = ref(realtimeDb, `webrtc_rooms/${roomIdRef.current}/messages/${messageKey}`);
        remove(messageRef).catch(console.error);
      }
    } catch (err) {
      console.error('❌ Error handling signaling message:', err);
      setConnectionStatus('failed');
    }
  }, [playerId, sendSignalingMessage]);

  // Send message function
  const sendMessage = useCallback((message: any) => {
    const dc = dataChannelRef.current;
    
    // Try WebRTC first
    if (dc?.readyState === 'open') {
      try {
        dc.send(JSON.stringify(message));
        return;
      } catch (error) {
        console.error('❌ Failed to send via WebRTC:', error);
      }
    }
    
    // Fallback to Firebase if WebRTC fails
    if (roomIdRef.current && firebaseFallbackActive) {
      const sent = sendFirebaseFallbackMessage(roomIdRef.current, playerId, message);
      if (sent) return;
    }
    
    // Queue message if no transport available
    pendingActionsRef.current.push(message);
  }, [playerId]);

  // Disconnect function
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting...');
    
    // Clear signaling listener
    if (signalingListenerRef.current) {
      off(signalingListenerRef.current);
      signalingListenerRef.current = null;
    }
    
    // Close data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Reset state
    setConnectionStatus('disconnected');
    setIsHost(false);
    setRoomId(null);
    roomIdRef.current = null;
    isHostRef.current = false;
    
    // Clear queues
    pendingActionsRef.current = [];
    iceCandidateQueueRef.current = [];
    lastOfferRef.current = null;
    
    console.log('✅ Disconnected and cleaned up');
  }, []);

  // Create peer connection with connection monitoring
  const createPeerConnection = useCallback(() => {
    console.log('🔗 Creating peer connection');
    
    const pc = new RTCPeerConnection(WEBRTC_CONFIG);
    
    // Connection state monitoring with ICE restart capability 
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('🔗 Connection state changed to:', state);
      logConnectionState(peerConnectionRef, dataChannelRef);
      
      if (state === 'connected') {
        console.log('✅ Peer connection established');
        if (dataChannelRef.current?.readyState === 'open') {
          setConnectionStatus('connected');
        }
      } else if (state === 'failed') {
        console.warn('⚠️ Connection failed - attempting ICE restart recovery');
        
        // 🔧 ORIGINAL RECOVERY: Try ICE restart like the original code
        try {
          console.log('🔄 Attempting ICE restart to recover connection...');
          pc.restartIce();
        } catch (error) {
          console.error('❌ ICE restart failed:', error);
          setConnectionStatus('failed');
        }
      }
    };

    // ICE connection state monitoring with restart capability (from original)
    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state changed to:', pc.iceConnectionState);
      
      // Sometimes data channel opens when ICE is connected
      if (pc.iceConnectionState === 'connected' && dataChannelRef.current) {
        console.log('🧊 ICE connected - checking data channel state:', dataChannelRef.current.readyState);
      }
      
      if (pc.iceConnectionState === 'failed') {
        console.error('❌ ICE connection failed - attempting restart!');
        
        // 🔧 ORIGINAL RECOVERY: Attempt ICE restart to recover connection
        try {
          console.log('🔄 Restarting ICE connection...');
          pc.restartIce();
        } catch (error) {
          console.error('❌ ICE restart failed:', error);
        }
      }
      
      if (pc.iceConnectionState === 'disconnected') {
        console.warn('⚠️ ICE connection disconnected - monitoring for recovery...');
        
        // 🔧 ORIGINAL RECOVERY: Give it time to reconnect naturally, then restart
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
    
    // ICE candidate handler with validation
    pc.onicecandidate = (event) => {
      if (event.candidate && isValidIceCandidate(event.candidate)) {
        console.log('🧊 Sending ICE candidate');
        sendSignalingMessage({
          type: 'ice_candidate',
          data: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment
          },
          timestamp: Date.now(),
          playerId
        });
      } else if (event.candidate) {
        console.warn('⚠️ Skipping invalid ICE candidate:', event.candidate);
      } else {
        console.log('🏁 ICE gathering complete');
      }
    };

    return pc;
  }, [playerId, sendSignalingMessage]);

  // Join room function
  const joinRoom = useCallback(async (targetRoomId: string): Promise<void> => {
    console.log('🚪 [JOINER] Joining room:', targetRoomId);
    
    // Clean disconnect first
    disconnect();
    
    roomIdRef.current = targetRoomId;
    isHostRef.current = false;
    setIsHost(false);
    setRoomId(targetRoomId);
    setConnectionStatus('connecting');

    // Create peer connection for JOINER
    console.log('🔗 [JOINER] Creating peer connection with enhanced TURN config');
    const pc = createPeerConnection();
    if (!pc) throw new Error('Failed to create peer connection');
    
    peerConnectionRef.current = pc;

    // Set up data channel event handler (JOINER receives channel from HOST)  
    pc.ondatachannel = (event) => {
      console.log('📡 [JOINER] Data channel received from host');
      const channel = event.channel;
      dataChannelRef.current = channel;

      channel.onopen = () => {
        console.log('🎉 [JOINER] Data channel opened successfully!');
        setConnectionStatus('connected');
        
        // Set up message handler
        if (onMessage) {
          channel.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              onMessage(message);
            } catch (error) {
              console.error('❌ Failed to parse incoming message:', error);
            }
          };
        }
        
        // Flush pending messages
        if (pendingActionsRef.current.length > 0) {
          console.log('📤 [JOINER] Flushing', pendingActionsRef.current.length, 'pending messages');
          pendingActionsRef.current.forEach(msg => {
            try {
              channel.send(JSON.stringify(msg));
              console.log('📤 [JOINER] Sent pending message:', msg.type || 'unknown');
            } catch (error) {
              console.error('❌ [JOINER] Failed to send pending message:', error);
            }
          });
          pendingActionsRef.current = [];
        }
      };

      channel.onerror = (error) => {
        console.error('❌ [JOINER] Data channel error:', error);
        setConnectionStatus('failed');
      };

      channel.onclose = () => {
        console.log('🔌 [JOINER] Data channel closed');
        setConnectionStatus('disconnected');
      };
    };

    // Set up signaling message listener
    const messagesRef = ref(realtimeDb, `webrtc_rooms/${targetRoomId}/messages`);
    const listener = onValue(messagesRef, (snapshot) => {
      const messages = snapshot.val();
      if (!messages) return;
      
      Object.entries(messages).forEach(([messageKey, message]) => {
        handleSignalingMessage(message as WebRTCMessage, messageKey);
      });
    });
    signalingListenerRef.current = listener;

    // Start JOINER watchdog to detect ondatachannel issues
    startJoinerWatchdog(5000, dataChannelRef);
    
    // Activate Firebase fallback for this room
    if (onMessage) {
      const fallbackActivated = activateFirebaseFallback(targetRoomId, playerId, onMessage);
      if (fallbackActivated) {
        console.log('🔄 [JOINER] Firebase fallback ready - setting connected status');
        setConnectionStatus('connected');
      }
    }

    console.log('✅ [JOINER] Room join setup complete');
  }, [disconnect, handleSignalingMessage, playerId, sendSignalingMessage, onMessage, createPeerConnection]);

  // Create room function
  const createRoom = useCallback(async (): Promise<string> => {
    console.log('🏠 [HOST] Creating room');
    
    // Clean disconnect first
    disconnect();
    
    // Generate room ID
    const newRoomId = Math.random().toString(36).substring(2, 15);
    roomIdRef.current = newRoomId;
    isHostRef.current = true;
    setIsHost(true);
    setRoomId(newRoomId);
    setConnectionStatus('connecting');

    // Create peer connection for HOST
    console.log('🔗 [HOST] Creating peer connection with enhanced TURN config');
    const pc = createPeerConnection();
    if (!pc) throw new Error('Failed to create peer connection');
    
    peerConnectionRef.current = pc;

    // Create data channel (HOST creates the channel)
    const dc = pc.createDataChannel('gameData', {
      ordered: true,
      maxRetransmits: 3
    });
    dataChannelRef.current = dc;

    console.log('📦 [HOST] Data channel created:', {
      label: dc.label,
      readyState: dc.readyState,
      protocol: dc.protocol,
      ordered: dc.ordered
    });

    // Set up data channel handlers
    dc.onopen = () => {
      console.log('🎉 [HOST] Data channel opened successfully!');
      setConnectionStatus('connected');
      
      // Set up message handler
      if (onMessage) {
        dc.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            onMessage(message);
          } catch (error) {
            console.error('❌ Failed to parse incoming message:', error);
          }
        };
      }
      
      // Flush pending messages
      if (pendingActionsRef.current.length > 0) {
        console.log('📤 [HOST] Flushing', pendingActionsRef.current.length, 'pending messages');
        pendingActionsRef.current.forEach(msg => {
          try {
            dc.send(JSON.stringify(msg));
            console.log('📤 [HOST] Sent pending message:', msg.type || 'unknown');
          } catch (error) {
            console.error('❌ [HOST] Failed to send pending message:', error);
          }
        });
        pendingActionsRef.current = [];
      }
    };

    dc.onerror = (error) => {
      console.error('❌ [HOST] Data channel error:', error);
      setConnectionStatus('failed');
    };

    dc.onclose = () => {
      console.log('🔌 [HOST] Data channel closed');
      setConnectionStatus('disconnected');
    };

    // Create and send offer
    console.log('📤 [HOST] Creating offer');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log('✅ [HOST] Offer created and set as local description');

    await sendSignalingMessage({
      type: 'offer',
      data: offer,
      timestamp: Date.now(),
      playerId
    });
    console.log('📤 [HOST] Offer sent');

    // Set up signaling message listener
    const messagesRef = ref(realtimeDb, `webrtc_rooms/${newRoomId}/messages`);
    const listener = onValue(messagesRef, (snapshot) => {
      const messages = snapshot.val();
      if (!messages) return;
      
      Object.entries(messages).forEach(([messageKey, message]) => {
        handleSignalingMessage(message as WebRTCMessage, messageKey);
      });
    });
    signalingListenerRef.current = listener;
    
    // Activate Firebase fallback for this room
    if (onMessage) {
      const fallbackActivated = activateFirebaseFallback(newRoomId, playerId, onMessage);
      if (fallbackActivated) {
        console.log('🔄 [HOST] Firebase fallback ready - setting connected status');
        setConnectionStatus('connected');
      }
    }

    console.log('✅ [HOST] Room created successfully:', newRoomId);
    return newRoomId;
  }, [disconnect, handleSignalingMessage, playerId, sendSignalingMessage, onMessage, createPeerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      // Clean up Firebase fallback listener
      if (firebaseFallbackListener) {
        off(firebaseFallbackListener);
        firebaseFallbackListener = null;
      }
    };
  }, [disconnect]);

  return {
    isHost,
    connectionStatus,
    roomId,
    sendMessage,
    disconnect,
    joinRoom,
    createRoom
  };
} 