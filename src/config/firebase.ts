import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

// Safely get environment variables
const getRequiredEnvVar = (key: string): string => {
  const value = import.meta.env[key];
  if (!value || value === undefined || value === 'undefined' || value === '') {
    console.error(`Required environment variable ${key} is missing or empty!`);
    // Return an empty string instead of hardcoded fallback
    return '';
  }
  console.log(`Using environment variable for ${key}`);
  return value;
};

// Log all raw environment variables for debugging (only showing if they exist, not their values)
console.log('Environment variables status:', {
  VITE_FIREBASE_API_KEY: !!import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 
  VITE_FIREBASE_PROJECT_ID: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: !!import.meta.env.VITE_FIREBASE_APP_ID
});

// Firebase configuration with environment variables
const firebaseConfig = {
  apiKey: getRequiredEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getRequiredEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getRequiredEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getRequiredEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getRequiredEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getRequiredEnvVar('VITE_FIREBASE_APP_ID')
};

// Log only the project ID for verification, not the full config with sensitive values
console.log('Firebase project ID:', firebaseConfig.projectId);

// Verify project ID to ensure we're using the correct project
if (firebaseConfig.projectId !== 'verse-dev-central') {
  console.error(`WARNING: Using project ${firebaseConfig.projectId} instead of verse-dev-central!`);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app);

// Set auth persistence to LOCAL (instead of default SESSION)
// This will keep the user logged in even if they close the browser
// and come back later within a reasonable timeframe (typically several days to weeks)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Firebase auth persistence set to LOCAL');
  })
  .catch((error) => {
    console.error('Error setting auth persistence:', error);
  });

export { db, auth, functions }; 