import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { 
  WordVolleySessionState, 
  StateUpdate, 
  getSyncCategory,
  SYNC_THROTTLE_MS,
  ConnectionStatus
} from './sessionTypes';

interface UseSessionSyncOptions {
  sessionId: string;
  userId: string;
  userRole: 'teacher' | 'student';
  initialState: WordVolleySessionState;
}

export function useWordVolleySessionSync({
  sessionId,
  userId,
  userRole,
  initialState
}: UseSessionSyncOptions) {
  // === STATE MANAGEMENT ===
  const [gameState, setGameState] = useState<WordVolleySessionState>(initialState);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    userId,
    role: userRole,
    isConnected: false,
    lastSeen: Date.now(),
    latency: 0,
    quality: 'disconnected'
  });
  const [remoteConnectionStatus, setRemoteConnectionStatus] = useState<ConnectionStatus | null>(null);

  // === REFS FOR SYNC MANAGEMENT ===
  const throttleTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingUpdates = useRef<Map<string, StateUpdate>>(new Map());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = doc(db, 'gameSessions', sessionId);

  // === HELPER FUNCTIONS ===

  // Set nested object values using dot notation
  const setNestedValue = useCallback((obj: any, path: string, value: any): void => {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }, []);

  // Merge remote state with local state intelligently
  const mergeGameStates = useCallback((
    localState: WordVolleySessionState, 
    remoteState: WordVolleySessionState
  ): WordVolleySessionState => {
    const merged = { ...localState };

    // Always accept remote game state changes (scores, game status)
    merged.game = remoteState.game;
    merged.scores = remoteState.scores;
    merged.hits = remoteState.hits;
    merged.session = remoteState.session;

    // Role-based object merging
    if (userRole === 'student') {
      // Student accepts teacher's ball and AI paddle updates
      merged.gameObjects = {
        ...merged.gameObjects,
        ball: remoteState.gameObjects.ball,
        aiPaddle: remoteState.gameObjects.aiPaddle,
        // Keep local player paddle for responsive control
        playerPaddle: merged.gameObjects.playerPaddle
      };
    } else {
      // Teacher accepts student's paddle updates
      merged.gameObjects = {
        ...merged.gameObjects,
        // Keep local ball and AI paddle control
        ball: merged.gameObjects.ball,
        aiPaddle: merged.gameObjects.aiPaddle,
        playerPaddle: remoteState.gameObjects.playerPaddle
      };
    }

    return merged;
  }, [userRole]);

  // === CORE SYNC FUNCTIONS ===

  // Initialize or join session
  const initializeSession = useCallback(async () => {
    try {
      console.log(`[SessionSync] Initializing session ${sessionId} for ${userRole}`);
      
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        // Teacher creates new session
        if (userRole === 'teacher') {
          const sessionData = {
            ...initialState,
            session: {
              ...initialState.session,
              id: sessionId,
              teacherId: userId,
              studentId: '',
              teacherConnected: true,
              studentConnected: false,
              isTeacherControlled: true,
              lastUpdateTimestamp: Date.now(),
              currentController: 'teacher'
            }
          };
          
          await setDoc(sessionRef, {
            ...sessionData,
            createdAt: serverTimestamp(),
            lastActivity: serverTimestamp(),
            lastUpdatedBy: userId,
            participants: {
              [userId]: {
                lastSeen: serverTimestamp(),
                isActive: true,
                role: userRole,
                latency: 0
              }
            }
          });
          
          console.log('[SessionSync] Teacher created new session');
        } else {
          throw new Error('Session does not exist and user is not teacher');
        }
      } else {
        // Join existing session
        const data = sessionDoc.data() as WordVolleySessionState;
        
        if (userRole === 'student') {
          // Update session with student info
          await updateDoc(sessionRef, {
            'session.studentId': userId,
            'session.studentConnected': true,
            [`participants.${userId}`]: {
              lastSeen: serverTimestamp(),
              isActive: true,
              role: userRole,
              latency: 0
            }
          });
          
          console.log('[SessionSync] Student joined session');
        }
        
        // Set initial state from session
        setGameState(data);
      }
      
      setConnectionStatus(prev => ({ ...prev, isConnected: true, quality: 'good' }));
    } catch (error) {
      console.error('[SessionSync] Failed to initialize session:', error);
      setConnectionStatus(prev => ({ ...prev, quality: 'disconnected' }));
    }
  }, [sessionId, userId, userRole, initialState, sessionRef]);

  // Perform Firestore update
  const performUpdate = useCallback(async (update: StateUpdate) => {
    try {
      // Role-based permissions check
      if (update.category === 'student-only' && userRole !== 'student') return;
      if (update.category === 'teacher-only' && userRole !== 'teacher') return;

      // Create update object
      const updateData: any = {
        [`participants.${userId}.lastSeen`]: serverTimestamp(),
        lastActivity: serverTimestamp(),
        lastUpdatedBy: userId
      };

      // Set nested field using dot notation
      updateData[update.path] = update.value;

      await updateDoc(sessionRef, updateData);
      
      // Update local state immediately for better UX
      setGameState(prev => {
        const newState = { ...prev };
        setNestedValue(newState, update.path, update.value);
        return newState;
      });

      console.log(`[SessionSync] Updated ${update.path} (${update.category})`);

    } catch (error) {
      console.error('[SessionSync] Update failed:', error);
      setConnectionStatus(prev => ({ ...prev, quality: 'poor' }));
    }
  }, [userRole, userId, sessionRef, setNestedValue]);

  // Update game state with intelligent throttling
  const updateGameState = useCallback((
    path: string, 
    value: any, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ) => {
    const category = getSyncCategory(path, userRole);
    const throttleMs = SYNC_THROTTLE_MS[category];
    
    const update: StateUpdate = {
      category,
      path,
      value,
      timestamp: Date.now(),
      userId,
      priority
    };

    if (throttleMs === 0) {
      // Immediate update for critical changes
      performUpdate(update);
      return;
    }

    // Store pending update
    pendingUpdates.current.set(path, update);

    // Clear existing timer for this path
    const existingTimer = throttleTimers.current.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new throttle timer
    const timer = setTimeout(() => {
      const pendingUpdate = pendingUpdates.current.get(path);
      if (pendingUpdate) {
        performUpdate(pendingUpdate);
        pendingUpdates.current.delete(path);
      }
      throttleTimers.current.delete(path);
    }, throttleMs);

    throttleTimers.current.set(path, timer);
  }, [userRole, userId, performUpdate]);

  // Batch multiple updates for efficiency
  const batchUpdateGameState = useCallback((
    updates: Array<{ path: string; value: any; priority?: 'high' | 'medium' | 'low' }>
  ) => {
    console.log(`[SessionSync] Batching ${updates.length} updates`);
    
    updates.forEach(({ path, value, priority = 'medium' }) => {
      updateGameState(path, value, priority);
    });
  }, [updateGameState]);

  // === REAL-TIME LISTENER ===
  useEffect(() => {
    if (!sessionId) return;

    console.log(`[SessionSync] Setting up listener for session ${sessionId}`);

    const unsubscribe = onSnapshot(
      sessionRef,
      (docSnapshot) => {
        if (!docSnapshot.exists()) return;

        const data = docSnapshot.data() as WordVolleySessionState & {
          participants: { [key: string]: any };
          lastUpdatedBy: string;
        };

        // Only process updates from other users
        if (data.lastUpdatedBy && data.lastUpdatedBy !== userId) {
          console.log(`[SessionSync] Received update from ${data.lastUpdatedBy}`);
          
          setGameState(prev => mergeGameStates(prev, data));
        }

        // Update connection status based on participants
        const participants = data.participants || {};
        const otherUserId = userRole === 'teacher' ? data.session?.studentId : data.session?.teacherId;
        
        if (otherUserId && participants[otherUserId]) {
          const otherUser = participants[otherUserId];
          const lastSeenTime = otherUser.lastSeen?.toDate?.()?.getTime() || 0;
          const isRecentlyActive = Date.now() - lastSeenTime < 10000; // 10 second timeout

          setRemoteConnectionStatus({
            userId: otherUserId,
            role: otherUser.role,
            isConnected: otherUser.isActive && isRecentlyActive,
            lastSeen: lastSeenTime,
            latency: otherUser.latency || 0,
            quality: otherUser.isActive && isRecentlyActive ? 'good' : 'disconnected'
          });
        }
      },
      (error) => {
        console.error('[SessionSync] Subscription error:', error);
        setConnectionStatus(prev => ({ ...prev, isConnected: false, quality: 'disconnected' }));
      }
    );

    unsubscribeRef.current = unsubscribe;
    return unsubscribe;
  }, [sessionId, userId, userRole, sessionRef, mergeGameStates]);

  // === HEARTBEAT ===
  useEffect(() => {
    const startHeartbeat = () => {
      heartbeatInterval.current = setInterval(async () => {
        try {
          await updateDoc(sessionRef, {
            [`participants.${userId}.lastSeen`]: serverTimestamp(),
            [`participants.${userId}.isActive`]: true
          });
        } catch (error) {
          console.error('[SessionSync] Heartbeat failed:', error);
        }
      }, 5000); // Every 5 seconds
    };

    // Start heartbeat after initialization
    const timer = setTimeout(startHeartbeat, 1000);

    return () => {
      clearTimeout(timer);
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [sessionRef, userId]);

  // === INITIALIZATION ===
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // === CLEANUP ===
  useEffect(() => {
    return () => {
      console.log('[SessionSync] Cleaning up session sync');
      
      // Clear all timers
      throttleTimers.current.forEach(timer => clearTimeout(timer));
      throttleTimers.current.clear();
      
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }

      // Mark as disconnected
      if (sessionRef) {
        updateDoc(sessionRef, {
          [`participants.${userId}.isActive`]: false,
          [`session.${userRole}Connected`]: false
        }).catch(console.error);
      }

      // Unsubscribe from session
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [sessionRef, userId, userRole]);

  // === RETURN INTERFACE ===
  return {
    gameState,
    updateGameState,
    batchUpdateGameState,
    connectionStatus,
    remoteConnectionStatus,
    isConnected: connectionStatus.isConnected && (remoteConnectionStatus?.isConnected ?? false),
    sessionId,
    initializeSession
  };
} 