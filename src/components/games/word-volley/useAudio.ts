import { useState, useCallback, useRef, useEffect } from 'react';

interface AudioFiles {
  correct: string;
  wrong: string;
  bounce: string;
  levelUp: string;
  gameOver: string;
  backgroundMusic?: string;
}

// Default audio files - using existing sounds from public/sounds/
const DEFAULT_AUDIO_FILES: AudioFiles = {
  correct: '/sounds/pop.mp3',        // Use pop sound for correct answers
  wrong: '/sounds/crack.mp3',        // Use crack sound for wrong answers  
  bounce: '/sounds/cardboard.mp3',   // Use cardboard sound for bounces
  levelUp: '/sounds/unwrap.mp3',     // Use unwrap sound for level up
  gameOver: '/sounds/crack.mp3',     // Use crack sound for game over
  backgroundMusic: undefined,        // No background music for now
};

export const useAudio = (customAudioFiles?: Partial<AudioFiles>) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  
  // Audio references
  const audioFiles = { ...DEFAULT_AUDIO_FILES, ...customAudioFiles };
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio elements
  useEffect(() => {
    // Preload sound effects
    Object.entries(audioFiles).forEach(([key, src]) => {
      if (key !== 'backgroundMusic' && src) {
        const audio = new Audio(src);
        audio.volume = volume;
        audio.preload = 'auto';
        
        // Add error handling for failed audio loads
        audio.onerror = () => {
          console.warn(`Failed to load audio file for ${key}: ${src}`);
          // Remove from cache if it fails to load
          audioCache.current.delete(key);
        };
        
        audio.oncanplaythrough = () => {
          console.log(`Successfully loaded audio for ${key}`);
        };
        
        audioCache.current.set(key, audio);
      }
    });

    // Initialize background music if provided
    if (audioFiles.backgroundMusic) {
      const bgMusic = new Audio(audioFiles.backgroundMusic);
      bgMusic.volume = volume * 0.3; // Background music should be quieter
      bgMusic.loop = true;
      bgMusic.preload = 'auto';
      
      bgMusic.onerror = () => {
        console.warn(`Failed to load background music: ${audioFiles.backgroundMusic}`);
        backgroundMusicRef.current = null;
      };
      
      backgroundMusicRef.current = bgMusic;
    }

    return () => {
      // Cleanup audio elements
      audioCache.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioCache.current.clear();
      
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.src = '';
      }
    };
  }, []);

  // Update volume when it changes
  useEffect(() => {
    audioCache.current.forEach(audio => {
      audio.volume = isMuted ? 0 : volume;
    });
    
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = isMuted ? 0 : volume * 0.3;
    }
  }, [volume, isMuted]);

  // Web Audio API fallback sound generation
  const playFallbackSound = useCallback((soundKey: string, volumeMultiplier: number = 1) => {
    if (isMuted) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const baseVolume = volume * volumeMultiplier * 0.1; // Keep generated sounds quieter
      
      switch (soundKey) {
        case 'correct':
          // High pitched positive sound
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(baseVolume, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          oscillator.type = 'sine';
          break;
          
        case 'wrong':
          // Low pitched negative sound
          oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(baseVolume, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.type = 'sawtooth';
          break;
          
        case 'bounce':
          // Quick percussive bounce sound
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.05);
          gainNode.gain.setValueAtTime(baseVolume, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.type = 'square';
          break;
          
        case 'levelUp':
          // Ascending celebratory sound
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
          gainNode.gain.setValueAtTime(baseVolume, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          oscillator.type = 'triangle';
          break;
          
        case 'gameOver':
          // Descending dramatic sound
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
          gainNode.gain.setValueAtTime(baseVolume, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
          oscillator.type = 'sawtooth';
          break;
          
        default:
          // Generic beep
          oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
          gainNode.gain.setValueAtTime(baseVolume, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.type = 'sine';
      }
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1); // Stop after 1 second max
      
    } catch (error) {
      console.warn(`Failed to generate fallback sound for ${soundKey}:`, error);
    }
  }, [isMuted, volume]);

  // Generic play sound function
  const playSound = useCallback((soundKey: string, volumeMultiplier: number = 1) => {
    if (isMuted) return;

    const audio = audioCache.current.get(soundKey);
    if (audio) {
      // Clone the audio to allow overlapping sounds
      const audioClone = audio.cloneNode() as HTMLAudioElement;
      audioClone.volume = volume * volumeMultiplier;
      
      // Play the sound
      audioClone.play().catch(error => {
        console.warn(`Failed to play sound ${soundKey}:`, error);
        // Fallback to Web Audio API generated sound
        playFallbackSound(soundKey, volumeMultiplier);
      });
    } else {
      // If audio file isn't loaded, use Web Audio API fallback
      playFallbackSound(soundKey, volumeMultiplier);
    }
  }, [isMuted, volume, playFallbackSound]);

  // Specific sound effects
  const playCorrectSound = useCallback(() => {
    playSound('correct', 1.0);
    
    // Add haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 100]); // Short-short-long pattern for success
    }
  }, [playSound]);

  const playWrongSound = useCallback(() => {
    playSound('wrong', 1.0);
    
    // Add haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(200); // Single long vibration for error
    }
  }, [playSound]);

  const playBounceSound = useCallback(() => {
    playSound('bounce', 0.6);
  }, [playSound]);

  const playLevelUpSound = useCallback(() => {
    playSound('levelUp', 1.2);
    
    // Add celebration haptic pattern
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 200]); // Celebration pattern
    }
  }, [playSound]);

  const playGameOverSound = useCallback(() => {
    playSound('gameOver', 1.0);
    
    // Add sad haptic pattern
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300]); // Long-short-long pattern
    }
  }, [playSound]);

  // Background music controls
  const startBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current && !isMuted) {
      backgroundMusicRef.current.play().catch(error => {
        console.warn('Failed to play background music:', error);
      });
    }
  }, [isMuted]);

  const stopBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
    }
  }, []);

  const pauseBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
    }
  }, []);

  const resumeBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current && !isMuted) {
      backgroundMusicRef.current.play().catch(error => {
        console.warn('Failed to resume background music:', error);
      });
    }
  }, [isMuted]);

  // Mute toggle
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Volume control
  const setAudioVolume = useCallback((newVolume: number) => {
    setVolume(Math.max(0, Math.min(1, newVolume)));
  }, []);

  // Audio context for more advanced features (optional)
  const createAudioContext = useCallback(() => {
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      return new AudioContext();
    }
    return null;
  }, []);

  // Text-to-speech for accessibility
  const speakText = useCallback((text: string, options?: {
    rate?: number;
    pitch?: number;
    voice?: SpeechSynthesisVoice;
  }) => {
    if ('speechSynthesis' in window && !isMuted) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      if (options) {
        if (options.rate) utterance.rate = options.rate;
        if (options.pitch) utterance.pitch = options.pitch;
        if (options.voice) utterance.voice = options.voice;
      }
      
      speechSynthesis.speak(utterance);
    }
  }, [isMuted]);

  // Get available voices for text-to-speech
  const getAvailableVoices = useCallback(() => {
    if ('speechSynthesis' in window) {
      return speechSynthesis.getVoices();
    }
    return [];
  }, []);

  // Audio feedback for UI interactions
  const playUISound = useCallback((type: 'click' | 'hover' | 'focus') => {
    // Create simple UI sounds programmatically
    if (!isMuted && 'AudioContext' in window) {
      const audioContext = createAudioContext();
      if (!audioContext) return;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      switch (type) {
        case 'click':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          break;
        case 'hover':
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
          break;
        case 'focus':
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.03, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.03);
          break;
      }

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  }, [isMuted, createAudioContext]);

  return {
    // State
    isMuted,
    volume,

    // Sound effects
    playCorrectSound,
    playWrongSound,
    playBounceSound,
    playLevelUpSound,
    playGameOverSound,
    playUISound,

    // Background music
    startBackgroundMusic,
    stopBackgroundMusic,
    pauseBackgroundMusic,
    resumeBackgroundMusic,

    // Controls
    toggleMute,
    setVolume: setAudioVolume,

    // Text-to-speech
    speakText,
    getAvailableVoices,

    // Generic
    playSound,
    createAudioContext,
  };
}; 