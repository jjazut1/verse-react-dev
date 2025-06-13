const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Use dev project for testing
  projectId: "verse-dev-central"
});

const db = admin.firestore();

const addSentenceSenseTemplate = async () => {
  try {
    console.log('Adding Sentence Sense blank template...');

    // Blank Sentence Sense Template - following exact structure of working anagram template
    const sentenceSenseTemplate = {
      title: 'Blank Sentence Sense - Words to Sentence',
      type: 'sentence-sense',
      description: 'A customizable sentence arrangement game where students rearrange scrambled words to form correct sentences.',
      enableHints: true,
      maxAttempts: 3,
      correctFeedbackDuration: 'momentary',
      sentences: [
        {
          id: '1',
          original: 'The quick brown fox jumps over the lazy dog',
          definition: 'A pangram containing every letter of the alphabet',
          difficulty: 'medium'
        },
        {
          id: '2',
          original: 'Learning is a lifelong adventure',
          definition: 'An inspiring statement about education',
          difficulty: 'easy'
        },
        {
          id: '3',
          original: 'Practice makes perfect with patience and persistence',
          definition: 'A motivational phrase about improvement through effort',
          difficulty: 'hard'
        }
      ],
      gameCategory: 'Language Arts',
      share: true,
      difficulty: 'medium',
      timeLimit: 300, // 5 minutes
      targetScore: 100,
      userId: 'system',
      email: 'system@lumino.learning',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      thumbnail: null // Will be generated later
    };

    // Add template to blankGameTemplates collection
    const docRef = await db.collection('blankGameTemplates').add(sentenceSenseTemplate);
    console.log(`${sentenceSenseTemplate.title} added with ID:`, docRef.id);
    
    console.log('Sentence Sense template added successfully!');
    return docRef.id;
  } catch (error) {
    console.error('Error adding Sentence Sense template:', error);
    throw error;
  }
};

// Run the function
addSentenceSenseTemplate()
  .then((templateId) => {
    console.log('Template ID:', templateId);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to add template:', error);
    process.exit(1);
  }); 