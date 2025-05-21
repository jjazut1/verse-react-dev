const admin = require('firebase-admin');

// Initialize admin with project details
admin.initializeApp({
  projectId: 'verse-dev-central',
  credential: admin.credential.applicationDefault()
});

// Create a reference to the Firestore database
const db = admin.firestore();

// Function to create a test assignment document 
async function createTestAssignment() {
  try {
    // Create a unique test document
    const now = new Date();
    const timestamp = admin.firestore.Timestamp.now();
    
    const docRef = await db.collection('assignments').add({
      studentId: "test-" + now.getTime(),
      studentName: "James Alspaugh",
      studentEmail: "james.alspaugh@sunriseoasisacademy.com",
      gameId: "testGame" + now.getTime(),
      gameTitle: "Test Email Function " + now.toLocaleTimeString(),
      gameName: "Test Email Function",
      deadline: timestamp,
      dueDate: admin.firestore.Timestamp.fromDate(
        new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      ),
      completed: false,
      linkToken: "test-token-" + now.getTime(),
      emailSent: false,
      useEmailLinkAuth: true,
      status: "assigned",
      teacherId: "test-teacher"
    });
    
    console.log("Document created with ID:", docRef.id);
    console.log("Now wait for the Cloud Function to process the document...");
    
    // Wait a bit and then check if the document was updated
    setTimeout(async () => {
      const updatedDoc = await db.collection('assignments').doc(docRef.id).get();
      const data = updatedDoc.data();
      console.log("Document after Cloud Function processed:");
      console.log("emailSent:", data.emailSent);
      
      // Finally, clean up by deleting the app
      admin.app().delete();
    }, 10000); // Wait 10 seconds
    
  } catch (error) {
    console.error("Error creating document:", error);
    admin.app().delete();
  }
}

// Run the function
createTestAssignment(); 