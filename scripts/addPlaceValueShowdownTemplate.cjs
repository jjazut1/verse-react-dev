const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'verse-dev-central',
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

const addPlaceValueShowdownTemplate = async () => {
  try {
    const blankTemplate = {
      title: 'Blank Place Value Showdown',
      type: 'place-value-showdown',
      description: 'A competitive place value game where students challenge an AI teacher to create the largest or smallest numbers using digit cards.',
      gameType: 'place-value-showdown',
      numberOfCards: 3,
      objective: 'largest',
      winningScore: 5,
      aiDifficulty: 'medium',
      playerName: 'Student',
      teacherName: 'AI Teacher',
      enableHints: true,
      gameMode: 'student-vs-teacher',
      difficulty: 'medium',
      timeLimit: 600, // 10 minutes
      targetScore: 5,
      share: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('blankGameTemplates').add(blankTemplate);
    console.log('✅ Place Value Showdown blank template added with ID:', docRef.id);
    console.log('Template details:', blankTemplate);
    
    // Exit the process
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding Place Value Showdown template:', error);
    process.exit(1);
  }
};

// Run the function
addPlaceValueShowdownTemplate(); 