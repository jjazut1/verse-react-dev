const admin = require('firebase-admin');

// Configuration
const PROJECT_ID = 'verse-dev-central';
const USER_EMAIL = 'james@luminatelearn.com';
const USER_UID = 'U2oL4UHCZhSj6ggauxsKudkYD3h1';
const CHECK_INTERVAL = 5000; // Check every 5 seconds

// Initialize Firebase Admin
admin.initializeApp({
  projectId: PROJECT_ID,
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

let lastAuthStatus = null;
let lastFirestoreStatus = null;
let checkCount = 0;

async function checkAuthAndFirestore() {
  checkCount++;
  const timestamp = new Date().toISOString();
  
  try {
    // Check Firebase Auth
    let authExists = false;
    let authData = null;
    try {
      const userRecord = await admin.auth().getUser(USER_UID);
      authExists = true;
      authData = {
        email: userRecord.email,
        uid: userRecord.uid,
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime
      };
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        console.log(`⚠️  [${timestamp}] Auth check error: ${error.message}`);
      }
    }
    
    // Check Firestore
    let firestoreExists = false;
    let firestoreData = null;
    try {
      const userRef = db.collection('users').doc(USER_UID);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        firestoreExists = true;
        const data = userDoc.data();
        firestoreData = {
          email: data.email,
          role: data.role,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
        };
      }
    } catch (error) {
      console.log(`⚠️  [${timestamp}] Firestore check error: ${error.message}`);
    }
    
    // Check for status changes
    const currentAuthStatus = authExists;
    const currentFirestoreStatus = firestoreExists;
    
    // Report status changes or periodic updates
    const statusChanged = (lastAuthStatus !== currentAuthStatus) || (lastFirestoreStatus !== currentFirestoreStatus);
    const isPeriodicReport = checkCount % 12 === 0; // Every minute (12 * 5 seconds)
    
    if (statusChanged || isPeriodicReport) {
      console.log(`\n📊 [${timestamp}] Status Check #${checkCount}`);
      console.log(`🔐 Firebase Auth: ${authExists ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`📄 Firestore Doc: ${firestoreExists ? '✅ EXISTS' : '❌ MISSING'}`);
      
      if (authExists && authData) {
        console.log(`   Auth Data: ${authData.email} (Created: ${authData.creationTime})`);
      }
      
      if (firestoreExists && firestoreData) {
        console.log(`   Firestore Data: ${firestoreData.email} (Role: ${firestoreData.role})`);
      }
    }
    
    // Alert on deletion
    if (lastAuthStatus === true && currentAuthStatus === false) {
      console.log('\n🚨 🚨 🚨 FIREBASE AUTH DELETION DETECTED! 🚨 🚨 🚨');
      console.log(`⏰ Deletion occurred at: ${timestamp}`);
      console.log(`📊 After ${checkCount} checks (${(checkCount * CHECK_INTERVAL / 1000).toFixed(1)} seconds of monitoring)`);
      console.log('🔍 This is the exact moment the auth record was deleted!');
      
      // Log recent activity that might have triggered it
      console.log('\n📝 Check what you were doing in the last few minutes:');
      console.log('   - Were you logged into the Firebase Console?');
      console.log('   - Did you interact with the application?');
      console.log('   - Were you testing authentication flows?');
      console.log('   - Did you modify any Firestore documents?');
      
      // Continue monitoring to see if it gets recreated
      console.log('\n🔄 Continuing to monitor for any recreation...');
    }
    
    if (lastFirestoreStatus === true && currentFirestoreStatus === false) {
      console.log('\n🚨 FIRESTORE DOCUMENT DELETION DETECTED!');
      console.log(`⏰ Deletion occurred at: ${timestamp}`);
    }
    
    if (lastAuthStatus === false && currentAuthStatus === true) {
      console.log('\n🎉 Firebase Auth record recreated!');
      console.log(`⏰ Recreation occurred at: ${timestamp}`);
    }
    
    if (lastFirestoreStatus === false && currentFirestoreStatus === true) {
      console.log('\n🎉 Firestore document recreated!');
      console.log(`⏰ Recreation occurred at: ${timestamp}`);
    }
    
    // Update tracking variables
    lastAuthStatus = currentAuthStatus;
    lastFirestoreStatus = currentFirestoreStatus;
    
  } catch (error) {
    console.error(`❌ [${timestamp}] Monitor error:`, error.message);
  }
}

async function startMonitoring() {
  console.log('🔍 Firebase Auth Deletion Monitor');
  console.log('================================');
  console.log(`📊 Project: ${PROJECT_ID}`);
  console.log(`👤 Monitoring: ${USER_EMAIL} (${USER_UID})`);
  console.log(`⏰ Check Interval: ${CHECK_INTERVAL / 1000} seconds`);
  console.log('🎯 Goal: Catch the exact moment when auth deletion happens');
  console.log('\n🚀 Starting monitoring... (Press Ctrl+C to stop)\n');
  
  // Initial check
  await checkAuthAndFirestore();
  
  // Set up interval monitoring
  const intervalId = setInterval(checkAuthAndFirestore, CHECK_INTERVAL);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Stopping monitor...');
    clearInterval(intervalId);
    await admin.app().delete();
    console.log('👋 Monitor stopped.');
    process.exit(0);
  });
}

// Start monitoring
startMonitoring().catch(console.error); 