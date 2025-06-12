// Script to add blank Anagram templates to the blankGameTemplates collection
// Run this once to populate the database with anagram templates

const admin = require('firebase-admin');

// Initialize admin with project details
admin.initializeApp({
  projectId: 'verse-dev-central',
  credential: admin.credential.applicationDefault()
});

// Create a reference to the Firestore database
const db = admin.firestore();

const addAnagramTemplates = async () => {
  try {
    console.log('Adding Anagram templates to Firebase...');
    console.log('Project ID: verse-dev-central');
    
    // Template 1: Letters to Word
    const lettersToWordTemplate = {
      title: 'Blank Anagram - Letters to Word',
      type: 'anagram',
      description: 'A customizable anagram game where students rearrange letters to form words.',
      gameMode: 'letters-to-word',
      showDefinitions: true,
      enableHints: false,
      maxAttempts: 3,
      shuffleIntensity: 'medium',
      anagrams: [
        {
          id: '1',
          original: 'LISTEN',
          definition: 'To hear with attention',
          type: 'word',
          difficulty: 'easy'
        },
        {
          id: '2',
          original: 'SILENT',
          definition: 'Making no sound',
          type: 'word',
          difficulty: 'easy'
        },
        {
          id: '3',
          original: 'ENLIST',
          definition: 'To join the military or help with a cause',
          type: 'word',
          difficulty: 'medium'
        }
      ],
      gameCategory: 'Language Arts',
      share: true,
      difficulty: 'easy',
      timeLimit: 0,
      targetScore: 0,
      userId: 'system',
      email: 'system@lumino.learning',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      thumbnail: null // Will be generated later
    };

    // Template 2: Words to Sentence
    const wordsToSentenceTemplate = {
      title: 'Blank Anagram - Words to Sentence',
      type: 'anagram',
      description: 'A customizable anagram game where students rearrange words to form sentences.',
      gameMode: 'words-to-sentence',
      showDefinitions: true,
      enableHints: true,
      maxAttempts: 3,
      shuffleIntensity: 'medium',
      anagrams: [
        {
          id: '1',
          original: 'The cat sits on the mat',
          definition: 'A simple sentence about a cat\'s location',
          type: 'sentence',
          difficulty: 'easy'
        },
        {
          id: '2',
          original: 'I love to read books',
          definition: 'A statement about enjoying reading',
          type: 'sentence',
          difficulty: 'easy'
        },
        {
          id: '3',
          original: 'The sun shines bright today',
          definition: 'A description of sunny weather',
          type: 'sentence',
          difficulty: 'medium'
        }
      ],
      gameCategory: 'Language Arts',
      share: true,
      difficulty: 'easy',
      timeLimit: 0,
      targetScore: 0,
      userId: 'system',
      email: 'system@lumino.learning',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      thumbnail: null // Will be generated later
    };

    // Template 3: Mixed Mode
    const mixedTemplate = {
      title: 'Blank Anagram - Mixed Mode',
      type: 'anagram',
      description: 'A customizable anagram game with both word and sentence anagrams.',
      gameMode: 'mixed',
      showDefinitions: true,
      enableHints: true,
      maxAttempts: 3,
      shuffleIntensity: 'medium',
      anagrams: [
        {
          id: '1',
          original: 'EARTH',
          definition: 'Our planet',
          type: 'word',
          difficulty: 'easy'
        },
        {
          id: '2',
          original: 'HEART',
          definition: 'Organ that pumps blood',
          type: 'word',
          difficulty: 'easy'
        },
        {
          id: '3',
          original: 'Birds can fly high',
          definition: 'A fact about bird flight',
          type: 'sentence',
          difficulty: 'medium'
        }
      ],
      gameCategory: 'Language Arts',
      share: true,
      difficulty: 'medium',
      timeLimit: 0,
      targetScore: 0,
      userId: 'system',
      email: 'system@lumino.learning',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      thumbnail: null // Will be generated later
    };

    // Add all templates
    const templates = [lettersToWordTemplate, wordsToSentenceTemplate, mixedTemplate];
    const templateIds = [];

    for (const template of templates) {
      const docRef = await db.collection('blankGameTemplates').add(template);
      console.log(`${template.title} added with ID:`, docRef.id);
      templateIds.push(docRef.id);
    }
    
    console.log('All anagram templates added successfully!');
    return templateIds;
  } catch (error) {
    console.error('Error adding anagram templates:', error);
    throw error;
  }
};

// Run the script
addAnagramTemplates()
  .then((ids) => {
    console.log('Script completed successfully. Template IDs:', ids);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 