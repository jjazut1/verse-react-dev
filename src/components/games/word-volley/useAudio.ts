import { useState, useCallback, useRef, useEffect } from 'react';

interface AudioFiles {
  correct: string;
  wrong: string;
  bounce: string;
  levelUp: string;
  gameOver: string;
  backgroundMusic?: string;
}

// Default audio files - these would be stored in public/sounds/
const DEFAULT_AUDIO_FILES: AudioFiles = {
  correct: '/sounds/word-volley/correct.wav',
  wrong: '/sounds/word-volley/wrong.wav',
  bounce: '/sounds/word-volley/bounce.wav',
  levelUp: '/sounds/word-volley/level-up.wav',
  gameOver: '/sounds/word-volley/game-over.wav',
  backgroundMusic: '/sounds/word-volley/background.mp3',
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
      if (key !== 'backgroundMusic') {
        const audio = new Audio(src);
        audio.volume = volume;
        audio.preload = 'auto';
        audioCache.current.set(key, audio);
      }
    });

    // Initialize background music
    if (audioFiles.backgroundMusic) {
      const bgMusic = new Audio(audioFiles.backgroundMusic);
      bgMusic.volume = volume * 0.3; // Background music should be quieter
      bgMusic.loop = true;
      bgMusic.preload = 'auto';
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
      });
    }
  }, [isMuted, volume]);

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