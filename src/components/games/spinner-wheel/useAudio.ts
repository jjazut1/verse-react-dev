import { useRef, useEffect } from 'react';

export const useAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const clickIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context
  useEffect(() => {
    const initAudio = async () => {
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          // Ensure audio context is running
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }
          
          console.log('Audio context initialized and ready');
        } catch (error) {
          console.error('Failed to initialize audio context:', error);
        }
      }
    };
    
    // Add click listener to initialize audio on first interaction
    document.addEventListener('click', initAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', initAudio);
      if (clickIntervalRef.current) {
        clearInterval(clickIntervalRef.current);
      }
    };
  }, []);

  // Generate click sound using Web Audio API - exactly like original
  const generateClick = () => {
    if (!audioContextRef.current || audioContextRef.current.state !== 'running') {
      console.log('Audio context not ready for click sound');
      return;
    }
    
    try {
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      // Create a sharp click sound - exactly like original
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(800, ctx.currentTime); // High pitched click
      
      // Short, sharp envelope - exactly like original
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.001); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05); // Quick decay
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.05);
    } catch (error) {
      console.error('Error generating click sound:', error);
    }
  };

  // Calculate click timing based on wheel speed - exactly like original
  const startClickingSound = (duration: number, segmentCount: number) => {
    if (!audioContextRef.current) return;
    
    const startTime = Date.now();
    const initialInterval = 50; // Start with clicks every 50ms (fast)
    const finalInterval = 300; // End with clicks every 300ms (slow)
    
    // Calculate stopping threshold based on segment count - exactly like original
    let stopThreshold: number;
    switch (segmentCount) {
      case 2:
        stopThreshold = 0.65;
        break;
      case 3:
        stopThreshold = 0.70;
        break;
      case 4:
        stopThreshold = 0.75;
        break;
      case 5:
        stopThreshold = 0.85;
        break;
      case 6:
        stopThreshold = 0.86;
        break;
      case 7:
        stopThreshold = 0.87;
        break;
      case 8:
        stopThreshold = 0.88;
        break;
      case 9:
        stopThreshold = 0.89;
        break;
      default: // 10 or more segments
        stopThreshold = 0.95;
        break;
    }
    
    let currentInterval = initialInterval;
    
    const scheduleNextClick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Stop clicking based on segment-correlated threshold - exactly like original
      if (progress < stopThreshold) {
        // Easing function to slow down clicks (matches wheel deceleration) - exactly like original
        const easeOut = 1 - Math.pow(1 - progress, 3);
        currentInterval = initialInterval + (finalInterval - initialInterval) * easeOut;
        
        generateClick();
        clickIntervalRef.current = setTimeout(scheduleNextClick, currentInterval);
      }
    };
    
    scheduleNextClick();
  };

  const ensureAudioReady = async (): Promise<boolean> => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.error('Failed to create audio context:', error);
        return false;
      }
    }
    
    // Resume audio context if it's suspended
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        console.log('Audio context resumed');
        return true;
      } catch (error) {
        console.error('Failed to resume audio context:', error);
        return false;
      }
    }
    
    return true;
  };

  const stopClickingSounds = () => {
    if (clickIntervalRef.current) {
      clearTimeout(clickIntervalRef.current);
      clickIntervalRef.current = null;
    }
  };

  return {
    generateClick,
    startClickingSound,
    ensureAudioReady,
    stopClickingSounds
  };
}; 