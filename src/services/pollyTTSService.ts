import { doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// IPA phoneme mapping for educational phonics
const PHONICS_TO_IPA_MAPPING = {
  // Consonant digraphs
  'ck': 'k',        // back, duck, rock
  'ch': 'tʃ',       // chair, much
  'sh': 'ʃ',        // shop, fish  
  'th': 'θ',        // this, with (voiceless)
  'th_voiced': 'ð', // the, that (voiced)
  'wh': 'hw',       // what, where, why (traditional pronunciation)
  'ph': 'f',        // phone, graph
  'ng': 'ŋ',        // ring, song
  'll': 'l',        // call, bell, full
  'gh': '',         // light, night (often silent)
  'kn': 'n',        // knee, know
  'wr': 'r',        // write, wrong
  'mb': 'm',        // lamb, thumb
  'bt': 't',        // doubt, debt
  'mn': 'n',        // autumn, column
  
  // Vowel combinations
  'ai': 'eɪ',       // rain, pain (long a)
  'ay': 'eɪ',       // day, play (long a)
  'ee': 'i',        // see, tree (long e)
  'ea': 'i',        // tea, sea (long e sound)
  'ie': 'i',        // piece, field (long e)
  'oa': 'oʊ',       // boat, coat (long o)
  'ow': 'oʊ',       // show, know (long o)
  'ou': 'aʊ',       // house, mouse (ou sound)
  'ow_sound': 'aʊ', // how, now (ou sound)
  'ue': 'u',        // blue, true (long u)
  'ew': 'u',        // new, flew (long u)
  'oo': 'u',        // moon, food (long u)
  'oo_short': 'ʊ',  // book, look (short u)
  'au': 'ɔ',        // sauce, because
  'aw': 'ɔ',        // saw, draw
  'oi': 'ɔɪ',       // coin, voice
  'oy': 'ɔɪ',       // boy, toy
  
  // R-controlled vowels
  'ar': 'ɑr',       // car, star
  'er': 'ɝ',        // her, fern
  'ir': 'ɝ',        // sir, bird
  'or': 'ɔr',       // for, corn
  'ur': 'ɝ',        // fur, turn
  'are': 'ɛr',      // care, share
  'eer': 'ɪr',      // deer, cheer
  'ire': 'aɪr',     // fire, tire
  'ore': 'ɔr',      // more, store
  'ure': 'ʊr',      // sure, cure
  
  // Common endings
  'tion': 'ʃən',    // nation, action
  'sion': 'ʒən',    // vision, confusion
  'ture': 'tʃər',   // nature, picture
  'cious': 'ʃəs',   // precious, gracious
  'tious': 'ʃəs',   // ambitious, cautious
  'ough': 'ʌf',     // rough, tough
  'augh': 'æf',     // laugh, draft
  'eigh': 'eɪ',     // eight, weigh
  'ight': 'aɪt',    // light, night
  
  // Single letters with specific sounds
  'c_soft': 's',    // city, face
  'g_soft': 'dʒ',   // giant, cage
  'y_vowel': 'aɪ',  // my, try
  'y_short': 'ɪ',   // happy, city
};

// AWS Polly Configuration
interface PollyConfig {
  voiceId: string;
  engine: string;
}

// Default configuration
const DEFAULT_POLLY_CONFIG: PollyConfig = {
  voiceId: 'Joanna',
  engine: 'neural'
};

class PollyTTSService {
  private config: PollyConfig;
  private currentAudio: HTMLAudioElement | null = null;
  private firestoreAvailable: boolean = false;

  constructor(config: Partial<PollyConfig> = {}) {
    this.config = { ...DEFAULT_POLLY_CONFIG, ...config };
    this.initializeFirestore();
  }

  private initializeFirestore() {
    try {
      // Test if Firestore is available
      if (db) {
        this.firestoreAvailable = true;
        console.log('Firestore TTS service initialized successfully');
      } else {
        this.firestoreAvailable = false;
        console.warn('Firestore not available for TTS');
      }
    } catch (error) {
      console.warn('Failed to initialize Firestore TTS service:', error);
      this.firestoreAvailable = false;
    }
  }

  // Generate unique request ID
  private generateRequestId(): string {
    return Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Wait for TTS result from Firestore
  private async waitForTTSResult(requestId: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const resultRef = doc(db, 'ttsResults', requestId);
      const timeout = setTimeout(() => {
        unsubscribe();
        console.warn('TTS request timed out:', requestId);
        resolve(null);
      }, 30000); // 30 second timeout

      const unsubscribe = onSnapshot(resultRef, 
        (doc) => {
          if (doc.exists()) {
            clearTimeout(timeout);
            unsubscribe();
            
            const data = doc.data();
            console.log('TTS result received:', data);
            
            if (data.success && data.audioData) {
              // Clean up the result document
              deleteDoc(resultRef).catch(console.warn);
              resolve(data.audioData);
            } else {
              console.error('TTS processing failed:', data.error);
              resolve(null);
            }
          }
        },
        (error) => {
          clearTimeout(timeout);
          unsubscribe();
          console.error('Error listening for TTS result:', error);
          reject(error);
        }
      );
    });
  }

    // Convert text to phoneme SSML
  private convertToPhonemeSSML(text: string): string {
    // Process text character by character to avoid overlapping replacements
    let result = '';
    let i = 0;
    
    // Sort patterns by length (longest first) to match the most specific patterns first
    const sortedPatterns = Object.entries(PHONICS_TO_IPA_MAPPING)
      .sort(([a], [b]) => b.length - a.length);
    
    while (i < text.length) {
      let matchFound = false;
      
      // Try to match patterns starting at current position
      for (const [pattern, ipa] of sortedPatterns) {
        const substring = text.substring(i, i + pattern.length);
        
        if (substring.toLowerCase() === pattern.toLowerCase()) {
          if (ipa) { // Skip empty phonemes (like 'gh')
            // Make phonemes 3x louder than regular words (+9dB ≈ 3x volume)
            // Brief consonants also get slower rate for better clarity
            if (pattern === 'ph' || pattern === 'ck' || pattern === 'kn' || pattern === 'wr' || pattern === 'mb' || pattern === 'bt' || pattern === 'mn' || pattern === 'll' || pattern === 'wh') {
              result += `<prosody rate="slow" volume="+9dB"><phoneme alphabet="ipa" ph="${ipa}">${substring}</phoneme></prosody>`;
            } else {
              result += `<prosody volume="+9dB"><phoneme alphabet="ipa" ph="${ipa}">${substring}</phoneme></prosody>`;
            }
          }
          // For silent letters (empty ipa), just skip them (don't add to result)
          i += pattern.length;
          matchFound = true;
          break;
        }
      }
      
      // If no pattern matched, add the current character with normal volume
      if (!matchFound) {
        result += text[i];
        i++;
      }
    }
    
    // Wrap regular words (non-phoneme text) in normal volume prosody
    // This ensures a clear volume contrast between phonemes (+9dB) and regular text (0dB)
    return `<speak><prosody volume="0dB">${result}</prosody></speak>`;
  }

  // Main method to speak text with phoneme SSML
  public async speakWithPhonemes(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
  } = {}): Promise<void> {
    if (!this.firestoreAvailable) {
      console.warn('Firestore TTS not available, falling back to Web Speech API with phonics');
      return this.fallbackToWebSpeech(text, options);
    }

    try {
      // Convert text to phoneme SSML
      const ssmlText = this.convertToPhonemeSSML(text);
      
      // Generate unique request ID
      const requestId = this.generateRequestId();
      
      console.log('Creating TTS request:', { requestId, ssmlText, voiceId: this.config.voiceId, engine: this.config.engine });
      
      // Create TTS request in Firestore
      const requestRef = doc(db, 'ttsRequests', requestId);
      await setDoc(requestRef, {
        ssmlText: ssmlText,
        voiceId: this.config.voiceId,
        engine: this.config.engine,
        userId: 'anonymous', // Could be replaced with actual user ID if available
        timestamp: new Date()
      });
      
      // Listen for the result
      const audioData = await this.waitForTTSResult(requestId);
      
      if (audioData) {
        console.log('Playing audio from Firestore TTS');
        await this.playBase64Audio(audioData);
      } else {
        console.warn('No audio data received from Firestore TTS, falling back to Web Speech API');
        return this.fallbackToWebSpeech(text, options);
      }
      
    } catch (error) {
      console.error('Firestore TTS error details:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('Firestore TTS failed, falling back to Web Speech API with phonics:', errorMessage);
      return this.fallbackToWebSpeech(text, options);
    }
  }

  // Play base64 audio data from Firebase Function
  private async playBase64Audio(base64Data: string): Promise<void> {
    try {
      // Convert base64 to blob
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(blob);
      
      // Stop any currently playing audio
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      }
      
      // Play new audio
      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.play();
      
      // Clean up URL after playing
      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
    } catch (error) {
      console.error('Error playing base64 audio:', error);
      throw error;
    }
  }

  // Fallback to Web Speech API
  private fallbackToWebSpeech(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
  } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      utterance.lang = 'en-US';

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event);

      speechSynthesis.speak(utterance);
    });
  }

  // Regular TTS without phonemes (for comparison)
  public async speakRegular(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
  } = {}): Promise<void> {
    if (!this.firestoreAvailable) {
      console.warn('Firestore TTS not available, falling back to Web Speech API');
      return this.fallbackToWebSpeech(text, options);
    }

    try {
      // Generate unique request ID
      const requestId = this.generateRequestId();
      
      console.log('Creating regular TTS request:', { requestId, text, voiceId: this.config.voiceId, engine: this.config.engine });
      
      // Create TTS request in Firestore
      const requestRef = doc(db, 'ttsRequests', requestId);
      await setDoc(requestRef, {
        text: text,
        voiceId: this.config.voiceId,
        engine: this.config.engine,
        userId: 'anonymous', // Could be replaced with actual user ID if available
        timestamp: new Date()
      });
      
      // Listen for the result
      const audioData = await this.waitForTTSResult(requestId);
      
      if (audioData) {
        console.log('Playing regular audio from Firestore TTS');
        await this.playBase64Audio(audioData);
      } else {
        console.warn('No audio data received from Firestore TTS, falling back to Web Speech API');
        return this.fallbackToWebSpeech(text, options);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('Firestore TTS failed, falling back to Web Speech API:', errorMessage);
      return this.fallbackToWebSpeech(text, options);
    }
  }

  // Check if Polly is available
  public isPollyAvailable(): boolean {
    return this.firestoreAvailable;
  }

  // Stop current audio
  public stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  // Update configuration
  public updateConfig(newConfig: Partial<PollyConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Note: Firebase Function handles authentication, no need to reinitialize
  }
}

export default PollyTTSService; 