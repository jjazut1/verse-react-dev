import PollyTTSService from '../services/pollyTTSService';

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

// Text-to-Speech utilities
export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
  lang?: string;
}

// Initialize Polly TTS service
let pollyTTSService: PollyTTSService | null = null;

try {
  pollyTTSService = new PollyTTSService();
} catch (error) {
  console.warn('Failed to initialize Polly TTS service:', error);
}

// Phonics mapping for educational TTS
const PHONICS_PATTERNS = {
  // Consonant digraphs
  'ck': 'k',        // back, duck, rock
  'ch': 'ch',       // chair, much
  'sh': 'sh',       // shop, fish  
  'th': 'th',       // this, with
  'ph': 'f',        // phone, graph
  'ng': 'ng',       // ring, song
  'gh': '',         // light, night (often silent)
  
  // Vowel combinations
  'ai': 'ay',       // rain, pain
  'ay': 'ay',       // day, play
  'ee': 'ee',       // see, tree
  'ea': 'ee',       // tea, sea (long e sound)
  'ie': 'ee',       // piece, field
  'oa': 'oh',       // boat, coat
  'ow': 'oh',       // show, know (long o)
  'ou': 'ow',       // house, mouse
  'ue': 'oo',       // blue, true
  'ew': 'oo',       // new, flew
  'oo': 'oo',       // moon, food
  'au': 'aw',       // sauce, because
  'aw': 'aw',       // saw, draw
  'oi': 'oy',       // coin, voice
  'oy': 'oy',       // boy, toy
  
  // R-controlled vowels
  'ar': 'ar',       // car, star
  'er': 'ur',       // her, fern
  'ir': 'ur',       // sir, bird
  'or': 'or',       // for, corn
  'ur': 'ur',       // fur, turn
  'are': 'air',     // care, share
  'eer': 'ear',     // deer, cheer
  'ire': 'ire',     // fire, tire
  'ore': 'ore',     // more, store
  'ure': 'ure',     // sure, cure
  
  // Common endings
  'tion': 'shun',   // nation, action
  'sion': 'zhun',   // vision, confusion
  'ture': 'chur',   // nature, picture
  'cious': 'shus',  // precious, gracious
  'tious': 'shus',  // ambitious, cautious
  'ough': 'uff',    // rough, tough
  'augh': 'aff',    // laugh, draft
  'eigh': 'ay',     // eight, weigh
  'ight': 'ite',    // light, night
  
  // Single letters with specific sounds
  'c': 's',         // city, face (when followed by e, i, y)
  'g': 'j',         // giant, cage (when followed by e, i, y)
  'y': 'i',         // my, try (when at end of word)
  'y_short': 'i',   // happy, city (when in middle)
};

// Convert text to phonics pronunciation
export function convertToPhonics(text: string): string {
  let phonicsText = text.toLowerCase();
  
  // Apply phonics patterns
  Object.entries(PHONICS_PATTERNS).forEach(([pattern, replacement]) => {
    if (replacement) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'g');
      phonicsText = phonicsText.replace(regex, replacement);
    }
  });
  
  return phonicsText;
}

// Check if TTS is available
export function isTTSAvailable(): boolean {
  return 'speechSynthesis' in window || (pollyTTSService !== null && pollyTTSService.isPollyAvailable());
}

// Standard TTS function
export function speakText(text: string, options: TTSOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isTTSAvailable()) {
      reject(new Error('Text-to-speech is not available'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;
    utterance.lang = options.lang || 'en-US';

    if (options.voice) {
      utterance.voice = options.voice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(event);

    speechSynthesis.speak(utterance);
  });
}

// Phonics TTS function using Web Speech API
export function speakPhonics(text: string, options: TTSOptions = {}): Promise<void> {
  const phonicsText = convertToPhonics(text);
  return speakText(phonicsText, options);
}

// Amazon Polly TTS with phoneme SSML
export async function speakWithPollyPhonemes(text: string, options: TTSOptions = {}): Promise<void> {
  if (!pollyTTSService) {
    console.warn('Polly TTS service not available, falling back to phonics TTS');
    return speakPhonics(text, options);
  }

  try {
    await pollyTTSService.speakWithPhonemes(text, {
      rate: options.rate,
      pitch: options.pitch,
      volume: options.volume
    });
  } catch (error) {
    console.error('Polly TTS error, falling back to phonics TTS:', error);
    return speakPhonics(text, options);
  }
}

// Amazon Polly regular TTS
export async function speakWithPollyRegular(text: string, options: TTSOptions = {}): Promise<void> {
  if (!pollyTTSService) {
    console.warn('Polly TTS service not available, falling back to regular TTS');
    return speakText(text, options);
  }

  try {
    await pollyTTSService.speakRegular(text, {
      rate: options.rate,
      pitch: options.pitch,
      volume: options.volume
    });
  } catch (error) {
    console.error('Polly TTS error, falling back to regular TTS:', error);
    return speakText(text, options);
  }
}

// Enhanced TTS function that chooses the best available method
export async function speakEnhanced(text: string, usePhonics: boolean = false, options: TTSOptions = {}): Promise<void> {
  if (usePhonics) {
    // Try Polly with phonemes first, then fallback to Web Speech API phonics
    if (pollyTTSService && pollyTTSService.isPollyAvailable()) {
      try {
        await pollyTTSService.speakWithPhonemes(text, options);
        return;
      } catch (error) {
        console.warn('Polly phonemes failed, falling back to Web Speech phonics:', error);
      }
    }
    
    // Fallback to Web Speech API with phonics
    return speakPhonics(text, options);
  } else {
    // Try Polly regular first, then fallback to Web Speech API
    if (pollyTTSService && pollyTTSService.isPollyAvailable()) {
      try {
        await pollyTTSService.speakRegular(text, options);
        return;
      } catch (error) {
        console.warn('Polly regular failed, falling back to Web Speech API:', error);
      }
    }
    
    // Fallback to Web Speech API
    return speakText(text, options);
  }
}

// Check if Polly is available
export function isPollyAvailable(): boolean {
  return pollyTTSService !== null && pollyTTSService.isPollyAvailable();
}

// Stop all TTS
export function stopTTS(): void {
  if (pollyTTSService) {
    pollyTTSService.stop();
  }
  
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

// Legacy function for backward compatibility
export function speakWord(word: string, isCorrect?: boolean, usePhonics: boolean = false): void {
  const options: TTSOptions = {
    rate: 0.8,
    pitch: isCorrect === undefined ? 1.0 : isCorrect ? 1.2 : 0.8,
    volume: 0.8
  };
  
  if (usePhonics) {
    speakPhonics(word, options).catch(console.error);
  } else {
    speakText(word, options).catch(console.error);
  }
}

// Legacy function for backward compatibility
export function speakDefinition(definition: string, usePhonics: boolean = false): void {
  // Remove HTML tags if present
  const plainText = definition.replace(/<[^>]*>/g, '');
  
  const options: TTSOptions = {
    rate: 0.7,
    pitch: 1.0,
    volume: 0.9
  };
  
  if (usePhonics) {
    speakPhonics(plainText, options).catch(console.error);
  } else {
    speakText(plainText, options).catch(console.error);
  }
}

// Legacy function for backward compatibility
export function stopSpeech(): void {
  stopTTS();
}

// Get available voices
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if ('speechSynthesis' in window) {
    return speechSynthesis.getVoices();
  }
  return [];
}

// Audio utilities
export function playSound(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(src);
    audio.onended = () => resolve();
    audio.onerror = (error) => reject(error);
    audio.play().catch(reject);
  });
} 