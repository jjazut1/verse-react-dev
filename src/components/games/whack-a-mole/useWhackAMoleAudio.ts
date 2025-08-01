import { useState, useCallback, useRef, useEffect } from 'react';

interface WhackAMoleAudioFiles {
  molePopUp: string;
  correctHit: string;
  wrongHit: string;
  bonusStreak: string;
  countdownTick: string;
  gameStart: string;
  gameEnd: string;
  backgroundMusic?: string;
}

// Audio files - using custom WAV files for enhanced experience
const DEFAULT_AUDIO_FILES: WhackAMoleAudioFiles = {
  molePopUp: '',                        // DEACTIVATED - No sound for mole appearing
  correctHit: '/sounds/correct hit.wav', // ACTIVE: Custom correct hit sound
  wrongHit: '/sounds/miss hit.wav',     // ACTIVE: Custom wrong hit sound
  bonusStreak: '',                      // DEACTIVATED - No sound for bonus streaks
  countdownTick: '',                    // DEACTIVATED - No sound for countdown ticks
  gameStart: '',                        // DEACTIVATED - No sound for game start
  gameEnd: '',                          // DEACTIVATED - No sound for game completion
  backgroundMusic: '/sounds/game background.mp3', // ACTIVE: Background music
};

export const useWhackAMoleAudio = (customAudioFiles?: Partial<WhackAMoleAudioFiles>) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [musicEnabled, setMusicEnabled] = useState(true);
  
  // Audio references
  const audioFiles = { ...DEFAULT_AUDIO_FILES, ...customAudioFiles };
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingMusic = useRef(false);

  // Initialize audio elements
  useEffect(() => {
    // Preload sound effects (skip empty/deactivated sounds)
    Object.entries(audioFiles).forEach(([key, src]) => {
      if (key !== 'backgroundMusic' && src && src.trim() !== '') {
        const audio = new Audio(src);
        audio.volume = volume;
        audio.preload = 'auto';
        
        // Add error handling for failed audio loads
        audio.onerror = () => {
          console.warn(`Failed to load audio file for ${key}: ${src}`);
          audioCache.current.delete(key);
        };
        
        audio.oncanplaythrough = () => {
          console.log(`Successfully loaded whack-a-mole audio for ${key}`);
        };
        
        audioCache.current.set(key, audio);
      } else if (key !== 'backgroundMusic' && (!src || src.trim() === '')) {
        console.log(`Skipping deactivated sound: ${key}`);
      }
    });

    // Initialize background music if provided
    if (audioFiles.backgroundMusic) {
      const bgMusic = new Audio(audioFiles.backgroundMusic);
      bgMusic.volume = volume * 0.15; // Background music at low volume (15%)
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
      backgroundMusicRef.current.volume = isMuted || !musicEnabled ? 0 : volume * 0.15;
    }
  }, [volume, isMuted, musicEnabled]);

  // Web Audio API fallback sound generation for when files fail to load
  const playFallbackSound = useCallback((soundKey: string, volumeMultiplier: number = 1) => {
    if (isMuted) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      gainNode.gain.setValueAtTime(volume * volumeMultiplier * 0.3, audioContext.currentTime);
      
      // Different sounds for different actions
      switch (soundKey) {
        case 'molePopUp':
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.type = 'sine';
          break;
        case 'correctHit':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          oscillator.type = 'triangle';
          break;
        case 'wrongHit':
          oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator.type = 'sawtooth';
          break;
        case 'bonusStreak':
          // Play a sequence of notes for bonus
          const notes = [523, 659, 784, 1047]; // C, E, G, C
          notes.forEach((freq, index) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.setValueAtTime(freq, audioContext.currentTime + index * 0.1);
            gain.gain.setValueAtTime(volume * volumeMultiplier * 0.2, audioContext.currentTime + index * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.1 + 0.2);
            osc.type = 'sine';
            
            osc.start(audioContext.currentTime + index * 0.1);
            osc.stop(audioContext.currentTime + index * 0.1 + 0.2);
          });
          return; // Don't run the regular oscillator code below
        case 'countdownTick':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.type = 'square';
          break;
        default:
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.type = 'sine';
      }
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
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

  // Specific sound effects for Whack-a-Mole
  const playMolePopUpSound = useCallback(() => {
    // Only play if sound file is configured
    if (audioFiles.molePopUp) {
      playSound('molePopUp', 0.8);
    }
  }, [playSound, audioFiles.molePopUp]);

  const playCorrectHitSound = useCallback(() => {
    // Only play if sound file is configured
    if (audioFiles.correctHit) {
      playSound('correctHit', 1.0);
    }
    
    // Add haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 100]); // Quick success pattern
    }
  }, [playSound, audioFiles.correctHit]);

  const playWrongHitSound = useCallback(() => {
    // Only play if sound file is configured
    if (audioFiles.wrongHit) {
      playSound('wrongHit', 1.0);
    }
    
    // Add haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(200); // Single long vibration for error
    }
  }, [playSound, audioFiles.wrongHit]);

  const playBonusStreakSound = useCallback(() => {
    // Only play if sound file is configured
    if (audioFiles.bonusStreak) {
      playSound('bonusStreak', 1.2);
    }
    
    // Add celebration haptic pattern (keep haptic even without sound)
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 200]); // Celebration pattern
    }
  }, [playSound, audioFiles.bonusStreak]);

  const playCountdownTickSound = useCallback(() => {
    // Only play if sound file is configured
    if (audioFiles.countdownTick) {
      playSound('countdownTick', 0.6);
    }
  }, [playSound, audioFiles.countdownTick]);

  const playGameStartSound = useCallback(() => {
    // Only play if sound file is configured
    if (audioFiles.gameStart) {
      playSound('gameStart', 1.0);
    }
    
    // Add start haptic (keep haptic even without sound)
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]); // Ready pattern
    }
  }, [playSound, audioFiles.gameStart]);

  const playGameEndSound = useCallback(() => {
    // Only play if sound file is configured
    if (audioFiles.gameEnd) {
      playSound('gameEnd', 1.0);
    }
    
    // Add completion haptic (keep haptic even without sound)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 300]); // Victory pattern
    }
  }, [playSound, audioFiles.gameEnd]);

  // Background music controls
  const startBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current && !isMuted && musicEnabled && !isPlayingMusic.current) {
      backgroundMusicRef.current.play().catch(error => {
        console.warn('Failed to play background music:', error);
      });
      isPlayingMusic.current = true;
    }
  }, [isMuted, musicEnabled]);

  const stopBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current && isPlayingMusic.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
      isPlayingMusic.current = false;
    }
  }, []);

  const pauseBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current && isPlayingMusic.current) {
      backgroundMusicRef.current.pause();
      // Keep isPlayingMusic.current = true so we know to resume later when toggled back on
    }
  }, []);

  const resumeBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current && !isMuted && musicEnabled) {
      backgroundMusicRef.current.play().catch(error => {
        console.warn('Failed to resume background music:', error);
      });
    }
  }, [isMuted, musicEnabled]);

  // Toggle functions
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicEnabled(prev => {
      const newValue = !prev;
      console.log('Music toggle:', newValue ? 'ON' : 'OFF', {
        isMuted,
        isPlayingMusic: isPlayingMusic.current,
        hasBackgroundMusic: !!backgroundMusicRef.current
      });
      
      if (!newValue && isPlayingMusic.current) {
        console.log('Pausing background music');
        pauseBackgroundMusic();
      } else if (newValue && backgroundMusicRef.current && !isMuted) {
        console.log('Resuming background music');
        // Directly play the music without relying on musicEnabled state check
        backgroundMusicRef.current.play().then(() => {
          console.log('Background music resumed successfully');
          isPlayingMusic.current = true;
        }).catch(error => {
          console.warn('Failed to resume background music:', error);
        });
      }
      return newValue;
    });
  }, [pauseBackgroundMusic, isMuted]);

  return {
    // State
    isMuted,
    volume,
    musicEnabled,
    isPlayingMusic: isPlayingMusic.current,

    // Volume controls
    setVolume,
    toggleMute,
    toggleMusic,

    // Sound effects
    playMolePopUpSound,
    playCorrectHitSound,
    playWrongHitSound,
    playBonusStreakSound,
    playCountdownTickSound,
    playGameStartSound,
    playGameEndSound,

    // Background music
    startBackgroundMusic,
    stopBackgroundMusic,
    pauseBackgroundMusic,
    resumeBackgroundMusic,

    // Generic sound player
    playSound,
  };
}; 