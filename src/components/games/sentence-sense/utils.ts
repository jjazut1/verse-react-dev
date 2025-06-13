import { SentenceItem, GameSentenceItem } from './types';

/**
 * Creates a new blank sentence item
 */
export const createNewSentence = (): SentenceItem => ({
  id: Date.now().toString(),
  original: '',
  difficulty: 'medium'
});

/**
 * Validates a sentence configuration
 */
export const validateSentence = (sentence: SentenceItem): string[] => {
  const errors: string[] = [];
  
  if (!sentence.original.trim()) {
    errors.push('Sentence text is required');
  }
  
  if (sentence.original.trim().split(' ').length < 2) {
    errors.push('Sentence must contain at least 2 words');
  }
  
  return errors;
};

/**
 * Validates the entire configuration
 */
export const validateConfig = (sentences: SentenceItem[], title: string): string[] => {
  const errors: string[] = [];
  
  if (!title.trim()) {
    errors.push('Game title is required');
  }
  
  if (sentences.length === 0) {
    errors.push('At least one sentence is required');
  }
  
  sentences.forEach((sentence, index) => {
    const sentenceErrors = validateSentence(sentence);
    sentenceErrors.forEach(error => {
      errors.push(`Sentence ${index + 1}: ${error}`);
    });
  });
  
  return errors;
};

/**
 * Calculates statistics for the configuration
 */
export const calculateStats = (sentences: SentenceItem[]) => {
  const totalSentences = sentences.length;
  const totalWords = sentences.reduce((acc, sentence) => 
    acc + (sentence.original?.split(' ').length || 0), 0);
  const averageWords = totalSentences > 0 ? Math.round(totalWords / totalSentences) : 0;
  
  return {
    totalSentences,
    totalWords,
    averageWords
  };
};

/**
 * Formats time in seconds to MM:SS format
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}; 