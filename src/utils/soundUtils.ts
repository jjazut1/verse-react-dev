// Sound utility functions

// Declare the global gameSounds object
declare global {
  interface Window {
    gameSounds?: {
      crack?: HTMLAudioElement;
    };
  }
}

// Initialize game sounds
export const initGameSounds = () => {
  if (!window.gameSounds) {
    window.gameSounds = {};
  }
  
  // Create crack sound
  if (!window.gameSounds.crack) {
    const crackSound = new Audio('/sounds/crack.mp3');
    window.gameSounds.crack = crackSound;
  }
};

// Play a sound
export const playSound = (soundName: string) => {
  if (window.gameSounds && window.gameSounds[soundName as keyof typeof window.gameSounds]) {
    const sound = window.gameSounds[soundName as keyof typeof window.gameSounds];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(error => {
        console.error('Error playing sound:', error);
      });
    }
  }
};

// Text-to-Speech utilities
export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
  lang?: string;
}

/**
 * Speak text using the Web Speech API
 * @param text The text to speak
 * @param options Optional TTS configuration
 */
export const speakText = (text: string, options?: TTSOptions): void => {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser');
    return;
  }

  // Cancel any ongoing speech
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Apply options
  if (options) {
    if (options.rate !== undefined) utterance.rate = options.rate;
    if (options.pitch !== undefined) utterance.pitch = options.pitch;
    if (options.volume !== undefined) utterance.volume = options.volume;
    if (options.voice) utterance.voice = options.voice;
    if (options.lang) utterance.lang = options.lang;
  }

  speechSynthesis.speak(utterance);
};

/**
 * Speak a word with emphasis for correct/incorrect context
 * @param word The word to speak
 * @param isCorrect Whether this is a correct answer (affects pitch)
 */
export const speakWord = (word: string, isCorrect?: boolean): void => {
  const options: TTSOptions = {
    rate: 0.8,
    pitch: isCorrect === undefined ? 1.0 : isCorrect ? 1.2 : 0.8,
    volume: 0.8
  };
  
  speakText(word, options);
};

/**
 * Speak a definition with slower rate for better comprehension
 * @param definition The definition text to speak
 */
export const speakDefinition = (definition: string): void => {
  // Remove HTML tags if present
  const plainText = definition.replace(/<[^>]*>/g, '');
  
  const options: TTSOptions = {
    rate: 0.7,
    pitch: 1.0,
    volume: 0.9
  };
  
  speakText(plainText, options);
};

/**
 * Get available voices for text-to-speech
 */
export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
  if ('speechSynthesis' in window) {
    return speechSynthesis.getVoices();
  }
  return [];
};

/**
 * Stop any ongoing speech
 */
export const stopSpeech = (): void => {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
};

/**
 * Check if text-to-speech is available
 */
export const isTTSAvailable = (): boolean => {
  return 'speechSynthesis' in window;
}; 