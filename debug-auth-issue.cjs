const admin = require('firebase-admin');

// Configuration
const PROJECT_ID = 'verse-dev-central';
const USER_EMAIL = 'james@learnwithverse.com';

// Initialize Firebase Admin
admin.initializeApp({
  projectId: PROJECT_ID,
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function debugAuthIssue() {
  try {
    console.log('🔍 Firebase Auth Deletion Diagnostic Tool');
    console.log('==========================================\n');
    
    // 1. Check Firebase Auth records
    console.log('1️⃣ Checking Firebase Authentication records...');
    try {
      const userRecord = await admin.auth().getUserByEmail(USER_EMAIL);
      console.log('✅ Firebase Auth record EXISTS:');
      console.log(`   UID: ${userRecord.uid}`);
      console.log(`   Email: ${userRecord.email}`);
      console.log(`   Provider: ${userRecord.providerData[0]?.providerId || 'unknown'}`);
      console.log(`   Created: ${userRecord.metadata.creationTime}`);
      console.log(`   Last Sign In: ${userRecord.metadata.lastSignInTime || 'Never'}`);
      console.log(`   Email Verified: ${userRecord.emailVerified}`);
    } catch (authError) {
      console.log('❌ Firebase Auth record NOT FOUND');
      console.log(`   Error: ${authError.message}`);
      
      // List all auth users to see what's there
      console.log('\n📋 Available Auth users:');
      const listUsersResult = await admin.auth().listUsers(10);
      listUsersResult.users.forEach(user => {
        console.log(`   - ${user.email} (${user.uid})`);
      });
    }
    
    console.log('\n');
    
    // 2. Check Firestore user documents
    console.log('2️⃣ Checking Firestore user documents...');
    const usersSnapshot = await db.collection('users')
      .where('email', '==', USER_EMAIL)
      .get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No Firestore user documents found for this email');
    } else {
      console.log(`✅ Found ${usersSnapshot.size} Firestore document(s):`);
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   Document ID: ${doc.id}`);
        console.log(`   Email: ${data.email}`);
        console.log(`   Role: ${data.role}`);
        console.log(`   Auth UID: ${data.authUid || data.userId || 'Not set'}`);
        console.log(`   Linked to Auth: ${data.linkedToAuth || 'Not set'}`);
        
        // Handle timestamp formatting safely
        const createdAt = data.createdAt;
        const updatedAt = data.updatedAt;
        console.log(`   Created: ${createdAt && typeof createdAt.toDate === 'function' ? createdAt.toDate() : createdAt || 'Not set'}`);
        console.log(`   Updated: ${updatedAt && typeof updatedAt.toDate === 'function' ? updatedAt.toDate() : updatedAt || 'Not set'}`);
        console.log('   ---');
      });
    }
    
    console.log('\n');
    
    // 3. Check for mismatched UIDs
    console.log('3️⃣ Checking for UID mismatches...');
    try {
      const authUser = await admin.auth().getUserByEmail(USER_EMAIL);
      const firestoreUser = usersSnapshot.docs[0];
      
      if (firestoreUser) {
        const firestoreData = firestoreUser.data();
        const authUidField = firestoreData.authUid || firestoreData.userId;
        
        if (authUidField === authUser.uid) {
          console.log('✅ UIDs match perfectly');
        } else {
          console.log('❌ UID MISMATCH DETECTED!');
          console.log(`   Firebase Auth UID: ${authUser.uid}`);
          console.log(`   Firestore Auth UID: ${authUidField}`);
          console.log('   ☝️ This mismatch could cause auth issues!');
        }
      }
    } catch (error) {
      console.log('⚠️ Cannot check UID mismatch - Auth user not found');
    }
    
    console.log('\n');
    
    // 4. Recommendations
    console.log('4️⃣ Diagnostic Summary & Recommendations:');
    console.log('=========================================');
    
    const hasAuthUser = await admin.auth().getUserByEmail(USER_EMAIL).then(() => true).catch(() => false);
    const hasFirestoreUser = !usersSnapshot.empty;
    
    if (!hasAuthUser && !hasFirestoreUser) {
      console.log('🚨 CRITICAL: Both Auth and Firestore records are missing!');
      console.log('   → Need to recreate the user completely');
    } else if (!hasAuthUser && hasFirestoreUser) {
      console.log('🚨 CRITICAL: Auth record deleted but Firestore exists!');
      console.log('   → This confirms the deletion bug');
      console.log('   → Auth record was deleted during Google Sign-In process');
      console.log('   → Possible causes:');
      console.log('     • COOP policy interference with Google Auth');
      console.log('     • Firebase Auth configuration issue');
      console.log('     • AuthContext cleanup logic');
      console.log('     • Firebase automatic cleanup of "invalid" records');
    } else if (hasAuthUser && !hasFirestoreUser) {
      console.log('⚠️ Auth exists but no Firestore document');
      console.log('   → Need to create Firestore user document');
    } else {
      console.log('✅ Both Auth and Firestore records exist');
      console.log('   → Check for UID mismatches or other issues');
    }
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  } finally {
    await admin.app().delete();
  }
}

// Run the diagnostic
debugAuthIssue().catch(console.error); 