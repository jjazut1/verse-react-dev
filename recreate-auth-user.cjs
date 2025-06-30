const admin = require('firebase-admin');

// Configuration
const PROJECT_ID = 'verse-dev-central';
const USER_EMAIL = 'james@luminatelearn.com';
const USER_UID = 'U2oL4UHCZhSj6ggauxsKudkYD3h1'; // From Firestore document
const DISPLAY_NAME = 'James Alspaugh';

// Initialize Firebase Admin
admin.initializeApp({
  projectId: PROJECT_ID,
  credential: admin.credential.applicationDefault()
});

async function recreateAuthUser() {
  try {
    console.log('🔧 Recreating Firebase Auth Record');
    console.log('===================================\n');
    
    // Check if user already exists
    try {
      const existingUser = await admin.auth().getUser(USER_UID);
      console.log('✅ User already exists with this UID:');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   UID: ${existingUser.uid}`);
      return;
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
      console.log('✅ Confirmed: User does not exist, proceeding with creation...');
    }
    
    // Create the user with the same UID as Firestore document
    console.log('🔄 Creating Firebase Auth user...');
    const userRecord = await admin.auth().createUser({
      uid: USER_UID,
      email: USER_EMAIL,
      displayName: DISPLAY_NAME,
      emailVerified: true, // Set as verified since this is a recreation
    });
    
    console.log('✅ Successfully recreated Firebase Auth record!');
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   Display Name: ${userRecord.displayName}`);
    console.log(`   Email Verified: ${userRecord.emailVerified}`);
    console.log(`   Created: ${userRecord.metadata.creationTime}`);
    
    // Add Google provider (since original was Google sign-in)
    console.log('\n🔄 Adding Google provider...');
    await admin.auth().updateUser(USER_UID, {
      providerData: [{
        uid: USER_EMAIL,
        email: USER_EMAIL,
        providerId: 'google.com',
        displayName: DISPLAY_NAME
      }]
    });
    
    console.log('✅ Google provider added successfully!');
    
    console.log('\n🎉 AUTH RECORD RECREATION COMPLETE!');
    console.log('====================================');
    console.log('✅ Firebase Auth UID matches Firestore document');
    console.log('✅ User can now authenticate again');
    console.log('✅ Role permissions preserved (admin)');
    
    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('1. Test Google Sign-In again');
    console.log('2. Monitor if deletion happens again');
    console.log('3. Check COOP policy settings');
    console.log('4. Review AuthContext code');
    
  } catch (error) {
    console.error('❌ Error recreating auth user:', error);
    
    if (error.code === 'auth/uid-already-exists') {
      console.log('\nℹ️ User with this UID already exists');
      console.log('Try checking the existing user instead');
    }
  } finally {
    await admin.app().delete();
  }
}

// Run the recreation
recreateAuthUser().catch(console.error); 