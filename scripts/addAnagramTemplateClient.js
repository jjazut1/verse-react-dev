// Client-side script to add anagram templates
// Run this in the browser console while logged into the application

const addAnagramTemplates = async () => {
  console.log('Adding Anagram templates to Firebase...');
  
  try {
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      console.error('Firebase is not available. Make sure you are running this in the application.');
      return;
    }
    
    const db = firebase.firestore();
    
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
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      thumbnail: null
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
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      thumbnail: null
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
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      thumbnail: null
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
    console.log('Template IDs:', templateIds);
    return templateIds;
  } catch (error) {
    console.error('Error adding anagram templates:', error);
    throw error;
  }
};

// Instructions for use
console.log(`
To use this script:
1. Open your application in the browser and login as an admin
2. Open the browser console (F12 -> Console)
3. Copy and paste this entire script
4. Run: addAnagramTemplates()
`);

// Export for use
window.addAnagramTemplates = addAnagramTemplates; 