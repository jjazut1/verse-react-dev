const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  admin.initializeApp();
} catch (e) {
  console.log('Firebase admin already initialized');
}

async function fixAssignmentEmailFlag() {
  try {
    const assignmentId = "0codIGNEZAsPrBPkrziK";
    
    console.log(`Fixing assignment ${assignmentId} to allow sendAssignmentEmail...`);
    
    // Get the assignment document
    const assignmentRef = admin.firestore().collection('assignments').doc(assignmentId);
    const assignmentDoc = await assignmentRef.get();
    
    if (!assignmentDoc.exists) {
      console.log(`Assignment with ID ${assignmentId} does not exist`);
      return;
    }
    
    const data = assignmentDoc.data();
    console.log('Current assignment data:');
    console.log('- useEmailLinkAuth:', data.useEmailLinkAuth);
    console.log('- emailSent:', data.emailSent);
    console.log('- studentEmail:', data.studentEmail);
    console.log('- gameName:', data.gameName);
    
    // Remove the useEmailLinkAuth field and reset emailSent to false
    await assignmentRef.update({
      useEmailLinkAuth: admin.firestore.FieldValue.delete(),
      emailSent: false
    });
    
    console.log('\n✅ Fixed assignment:');
    console.log('- Removed useEmailLinkAuth field');
    console.log('- Reset emailSent to false');
    console.log('\nNow you can use sendAssignmentEmail function successfully!');
    
  } catch (error) {
    console.error('Error fixing assignment:', error);
    throw error;
  }
}

// Run the function
fixAssignmentEmailFlag()
  .then(() => {
    console.log('Fix completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to fix assignment:', error);
    process.exit(1);
  }); 