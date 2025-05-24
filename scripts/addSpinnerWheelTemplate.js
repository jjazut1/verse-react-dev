// Script to add a blank Spinner Wheel template to the blankGameTemplates collection
// Run this once to populate the database with the spinner wheel template

const admin = require('firebase-admin');

// Initialize admin with project details
admin.initializeApp({
  projectId: 'verse-dev-central',
  credential: admin.credential.applicationDefault()
});

// Create a reference to the Firestore database
const db = admin.firestore();

const addSpinnerWheelTemplate = async () => {
  try {
    console.log('Adding Spinner Wheel template to Firebase...');
    console.log('Project ID: verse-dev-central');
    
    const spinnerWheelTemplate = {
      title: 'Blank Spinner Wheel',
      type: 'spinner-wheel',
      description: 'A customizable spinner wheel for random selection, vocabulary practice, or decision making.',
      items: [
        { id: '1', text: 'Option 1', color: '#FF6B6B' },
        { id: '2', text: 'Option 2', color: '#4ECDC4' },
        { id: '3', text: 'Option 3', color: '#45B7D1' },
        { id: '4', text: 'Option 4', color: '#96CEB4' },
        { id: '5', text: 'Option 5', color: '#FFD93D' },
        { id: '6', text: 'Option 6', color: '#DDA0DD' }
      ],
      removeOnSelect: false,
      wheelTheme: 'rainbow',
      customColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFD93D', '#DDA0DD'],
      soundEnabled: true,
      showMascot: true,
      maxSpins: 0, // unlimited
      instructions: 'Click the SPIN button to randomly select an item from the wheel!',
      gameCategory: 'General',
      share: true,
      difficulty: 'easy',
      timeLimit: 0,
      targetScore: 0,
      userId: 'system',
      email: 'system@lumino.learning',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      thumbnail: null // Will be generated later
    };

    const docRef = await db.collection('blankGameTemplates').add(spinnerWheelTemplate);
    console.log('Spinner Wheel template added with ID:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding spinner wheel template:', error);
    throw error;
  }
};

// Run the script
addSpinnerWheelTemplate()
  .then((id) => {
    console.log('✅ Successfully added Spinner Wheel template with ID:', id);
    // Clean up by deleting the app
    admin.app().delete();
  })
  .catch((error) => {
    console.error('❌ Failed to add Spinner Wheel template:', error);
    admin.app().delete();
    process.exit(1);
  }); 