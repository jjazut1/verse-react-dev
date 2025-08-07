import { useRef, useCallback } from 'react';

interface UseGameTimerProps {
  onTick: (timeLeft: number) => void;
  onTimeUp: () => void;
}

interface UseGameTimerReturn {
  startTimer: (duration: number) => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  isRunning: boolean;
}

export const useGameTimer = ({ 
  onTick, 
  onTimeUp 
}: UseGameTimerProps): UseGameTimerReturn => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeLeftRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);

  const startTimer = useCallback((duration: number) => {
    console.log('⏰ useGameTimer: Starting timer for', duration, 'seconds');
    
    // Stop any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timeLeftRef.current = duration;
    isRunningRef.current = true;

    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      onTick(timeLeftRef.current);

      if (timeLeftRef.current <= 0) {
        console.log('⏰ useGameTimer: Time up!');
        isRunningRef.current = false;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        onTimeUp();
      }
    }, 1000);
  }, [onTick, onTimeUp]);

  const stopTimer = useCallback(() => {
    console.log('⏰ useGameTimer: Stopping timer');
    isRunningRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pauseTimer = useCallback(() => {
    console.log('⏰ useGameTimer: Pausing timer');
    isRunningRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resumeTimer = useCallback(() => {
    console.log('⏰ useGameTimer: Resuming timer with', timeLeftRef.current, 'seconds left');
    
    if (timeLeftRef.current <= 0) {
      console.log('⏰ useGameTimer: Cannot resume - no time left');
      return;
    }

    isRunningRef.current = true;
    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      onTick(timeLeftRef.current);

      if (timeLeftRef.current <= 0) {
        console.log('⏰ useGameTimer: Time up on resume!');
        isRunningRef.current = false;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        onTimeUp();
      }
    }, 1000);
  }, [onTick, onTimeUp]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isRunningRef.current = false;
  }, []);

  // Auto-cleanup effect would go here if this was used in component
  // For now, the consuming component should call cleanup manually

  return {
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    isRunning: isRunningRef.current,
    // Add cleanup for manual cleanup
    cleanup
  } as UseGameTimerReturn & { cleanup: () => void };
}; 