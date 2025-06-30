const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'verse-react-dev'
  });
}

const db = admin.firestore();

async function addWordVolleyTemplate() {
  try {
    console.log('Adding Word Volley template...');
    
    const wordVolleyTemplate = {
      title: 'Short A Words vs Long A Words',
      type: 'word-volley',
      description: 'Educational Pong-style game where students hit short A words while avoiding long A words',
      difficulty: 'medium',
      gameSpeed: 3,
      paddleSize: 5,
      theme: 'classic',
      targetCategory: {
        id: 'target',
        name: 'Short A Words',
        words: ['cat', 'bat', 'hat', 'mat', 'rat', 'sat', 'fat', 'pat', 'lap', 'cap', 'map', 'tap', 'gap', 'nap', 'sap'],
        isTarget: true
      },
      nonTargetCategory: {
        id: 'non-target',
        name: 'Long A Words',
        words: ['cake', 'make', 'take', 'lake', 'bake', 'wake', 'name', 'game', 'same', 'came', 'fame', 'tame', 'lane', 'cane', 'mane'],
        isTarget: false
      },
      timeLimit: 300,
      targetScore: 150,
      share: true,
      email: 'admin@example.com',
      userId: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('userGameConfigs').add(wordVolleyTemplate);
    console.log('✅ Word Volley template added successfully with ID:', docRef.id);
    
    // Also add a category template for teachers to use
    const categoryTemplate = {
      title: 'Short A vs Long A Words',
      type: 'word-volley',
      description: 'Template for teaching short A vs long A vowel sounds',
      targetCategory: wordVolleyTemplate.targetCategory,
      nonTargetCategory: wordVolleyTemplate.nonTargetCategory,
      difficulty: 'medium',
      theme: 'classic',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const categoryDocRef = await db.collection('categoryTemplates').add(categoryTemplate);
    console.log('✅ Word Volley category template added successfully with ID:', categoryDocRef.id);
    
    console.log('\n🎉 Word Volley Firebase integration test completed successfully!');
    console.log('📝 Teachers can now:');
    console.log('   1. Create Word Volley games at /configure/word-volley');
    console.log('   2. Use the Short A vs Long A template');
    console.log('   3. Assign Word Volley games to students');
    console.log('   4. Students can play via assignment links');
    
  } catch (error) {
    console.error('❌ Error adding Word Volley template:', error);
  }
}

// Run the function
addWordVolleyTemplate()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 