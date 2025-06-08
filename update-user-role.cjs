const admin = require('firebase-admin');

// Configuration - Change this to match your project
const PROJECT_ID = 'verse-dev-central'; // Change to 'verse-11f2d' for production
const USER_DOC_ID = 'U2oL4UHCZhSj6ggauxsKudkYD3h1';

// Initialize Firebase Admin
admin.initializeApp({
  projectId: PROJECT_ID,
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function updateUserRole() {
  try {
    console.log(`🔄 Updating user role in project: ${PROJECT_ID}`);
    console.log(`📄 Document ID: ${USER_DOC_ID}`);
    
    // First, get the current user document to verify it exists and show current data
    const userRef = db.collection('users').doc(USER_DOC_ID);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error('❌ User document not found!');
      console.log('Available user documents:');
      
      // List some user documents to help debug
      const usersSnapshot = await db.collection('users').limit(10).get();
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${data.email} (${data.role})`);
      });
      
      return;
    }
    
    const userData = userDoc.data();
    console.log('📋 Current user data:');
    console.log(`   Email: ${userData.email}`);
    console.log(`   Current Role: ${userData.role}`);
    console.log(`   Name: ${userData.name || userData.displayName || 'Not set'}`);
    
    // Check if already admin
    if (userData.role === 'admin') {
      console.log('ℹ️  User is already an admin. No changes needed.');
      return;
    }
    
    // Update the role
    console.log('🔄 Updating role from "teacher" to "admin"...');
    
    await userRef.update({
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Successfully updated user role to admin!');
    
    // Verify the update
    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();
    console.log('📋 Updated user data:');
    console.log(`   Email: ${updatedData.email}`);
    console.log(`   New Role: ${updatedData.role}`);
    console.log(`   Updated At: ${updatedData.updatedAt?.toDate()}`);
    
    console.log('\n⚠️  Note: Monitor this user to see if the Firebase Auth record gets deleted automatically.');
    console.log('   If the deletion happens, it may indicate an external process or Firebase Console bug.');
    
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    
    if (error.code === 'permission-denied') {
      console.log('\n🔐 Permission denied. Make sure you have:');
      console.log('   1. Proper Firebase Admin credentials');
      console.log('   2. Firestore Admin permissions');
      console.log('   3. The correct project ID');
    }
  } finally {
    // Clean up
    await admin.app().delete();
  }
}

// Run the script
console.log('🚀 Starting user role update script...\n');
updateUserRole().catch(console.error); 