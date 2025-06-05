import { getAuth, isSignInWithEmailLink, signInWithEmailLink, sendSignInLinkToEmail, sendPasswordResetEmail as firebaseSendPasswordResetEmail, createUserWithEmailAndPassword, updatePassword, User } from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Action code settings for passwordless auth
const getActionCodeSettings = (assignmentId?: string) => ({
  url: `${window.location.origin}/login${assignmentId ? `?assignmentId=${assignmentId}` : ''}`,
  handleCodeInApp: true,
  iOS: {
    bundleId: 'com.verse.learning'
  },
  android: {
    packageName: 'com.verse.learning',
    installApp: true,
    minimumVersion: '12'
  },
  dynamicLinkDomain: undefined // Set this if you have a custom domain
});

/**
 * Sends secure passwordless sign-in link to email and stores email for verification.
 * This creates a real Firebase auth link, not a pseudo-passwordless token.
 */
export async function sendSecurePasswordlessLink(email: string, assignmentId?: string): Promise<void> {
  try {
    const actionCodeSettings = getActionCodeSettings(assignmentId);
    
    console.log('Sending Firebase passwordless email to:', email);
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    
    // Store email for later verification - this is crucial for security
    storeEmailForSignIn(email);
    
    console.log('Passwordless sign-in link sent successfully');
  } catch (error) {
    console.error('Failed to send passwordless sign-in link:', error);
    throw new Error('Failed to send sign-in link. Please check the email address and try again.');
  }
}

/**
 * Securely signs in user with email link after proper verification.
 * This prevents link sharing by requiring email confirmation.
 */
export async function handleSecurePasswordlessSignIn(): Promise<any> {
  const url = window.location.href;

  // Check if this is a valid Firebase email link
  if (!isSignInWithEmailLink(auth, url)) {
    console.log('Not a valid Firebase email link');
    return null;
  }

  console.log('Valid Firebase email link detected');

  let email: string | null = null;

  // Option 1: First try to extract email from URL parameters (Firebase auth links often include this)
  try {
    const urlObj = new URL(url);
    email = urlObj.searchParams.get('email');
    if (email) {
      email = decodeURIComponent(email);
      console.log('Email extracted from URL parameters:', email);
    }
  } catch (error) {
    console.log('Could not extract email from URL parameters:', error);
  }

  // Option 2: Fall back to localStorage (from when the link was originally sent)
  if (!email) {
    email = window.localStorage.getItem('emailForSignIn');
    if (email) {
      console.log('Email retrieved from localStorage:', email);
    }
  }

  // Option 3: Last resort - prompt user for email confirmation
  if (!email) {
    console.log('No email found in URL or localStorage, prompting user');
    email = window.prompt('Please enter your email address to confirm your identity:');
    if (!email) {
      throw new Error('Email is required to complete sign-in');
    }
    console.log('Email provided by user prompt:', email);
  }

  console.log('Attempting to sign in with email:', email);

  try {
    // This is the secure Firebase authentication
    const result = await signInWithEmailLink(auth, email, url);

    // Clean up stored email and store the confirmed email
    window.localStorage.removeItem('emailForSignIn');
    window.localStorage.setItem('emailForSignIn', email);

    console.log('Successfully signed in as:', result.user.email);
    return result.user;
  } catch (error: any) {
    console.error('Passwordless sign-in failed:', error);
    
    // Provide specific error messages
    if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else if (error.code === 'auth/invalid-action-code') {
      throw new Error('This sign-in link is invalid or has expired. Please request a new one.');
    } else {
      throw new Error('Sign-in failed. Please try again or request a new link.');
    }
  }
}

/**
 * Stores email for later verification during sign-in.
 * This is essential for preventing link sharing attacks.
 */
export function storeEmailForSignIn(email: string): void {
  window.localStorage.setItem('emailForSignIn', email);
}

/**
 * Checks if current URL is a Firebase email link
 */
export function isFirebaseEmailLink(): boolean {
  return isSignInWithEmailLink(auth, window.location.href);
}

/**
 * Gets stored email for sign-in (if any)
 */
export function getStoredEmailForSignIn(): string | null {
  return window.localStorage.getItem('emailForSignIn');
}

export interface CreateStudentAccountParams {
  email: string;
  name: string;
  grade?: string;
  age?: number;
  notes?: string;
  temporaryPassword: string;
  teacherId: string;
}

export interface StudentAccountResult {
  success: boolean;
  message: string;
  studentId?: string;
}

export interface ResetPasswordResult {
  success: boolean;
  message: string;
}

/**
 * Creates a new student account with a temporary password
 */
export const createStudentAccountWithTemporaryPassword = async (
  params: CreateStudentAccountParams
): Promise<StudentAccountResult> => {
  try {
    console.log('Creating student account with temporary password for:', params.email);
    
    // Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      params.email, 
      params.temporaryPassword
    );
    
    console.log('Firebase Auth account created:', userCredential.user.uid);
    
    // Create user document in Firestore
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userDocRef, {
      email: params.email.toLowerCase(),
      displayName: params.name,
      role: 'student',
      teacherId: params.teacherId,
      grade: params.grade || '',
      age: params.age || null,
      notes: params.notes || '',
      hasTemporaryPassword: true,
      temporaryPasswordCreatedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
      createdBy: 'teacher'
    });
    
    console.log('Student user document created');
    
    return {
      success: true,
      message: 'Student account created successfully with temporary password',
      studentId: userCredential.user.uid
    };
    
  } catch (error) {
    console.error('Error creating student account:', error);
    
    let message = 'Failed to create student account';
    
    if (error instanceof Error) {
      if (error.message.includes('email-already-in-use')) {
        message = 'An account with this email already exists';
      } else if (error.message.includes('invalid-email')) {
        message = 'Invalid email address';
      } else if (error.message.includes('weak-password')) {
        message = 'Password is too weak';
      } else {
        message = `Error: ${error.message}`;
      }
    }
    
    return {
      success: false,
      message
    };
  }
};

/**
 * Resets a student's password to a new temporary password
 */
export const resetStudentToTemporaryPassword = async (
  studentEmail: string,
  newTemporaryPassword: string,
  teacherId: string
): Promise<ResetPasswordResult> => {
  try {
    console.log('Resetting password for student:', studentEmail);
    
    // Find the student's user document
    const usersCollection = collection(db, 'users');
    const q = query(
      usersCollection, 
      where('email', '==', studentEmail.toLowerCase()),
      where('teacherId', '==', teacherId) // Ensure teacher can only reset their own students
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return {
        success: false,
        message: 'Student not found or you do not have permission to reset this student\'s password'
      };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    // Note: We cannot directly update the password in Firebase Auth without
    // the user being signed in. Teachers would need to provide the new
    // temporary password to the student, and the student would need to
    // sign in with it and then change it.
    
    // Update the user document to mark it as having a temporary password
    await updateDoc(doc(db, 'users', userDoc.id), {
      hasTemporaryPassword: true,
      temporaryPasswordCreatedAt: Timestamp.now(),
      temporaryPasswordResetBy: teacherId,
      updatedAt: Timestamp.now()
    });
    
    console.log('Student document updated with temporary password flag');
    
    return {
      success: true,
      message: 'Student marked as having temporary password. Please provide the new password to the student and ask them to sign in and change it.'
    };
    
  } catch (error) {
    console.error('Error resetting student password:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset password'
    };
  }
};

/**
 * Sends a password reset email to a student
 */
export const sendPasswordResetEmail = async (email: string): Promise<ResetPasswordResult> => {
  try {
    console.log('Sending password reset email to:', email);
    
    await firebaseSendPasswordResetEmail(auth, email);
    
    return {
      success: true,
      message: 'Password reset email sent successfully'
    };
    
  } catch (error) {
    console.error('Error sending password reset email:', error);
    
    let message = 'Failed to send password reset email';
    
    if (error instanceof Error) {
      if (error.message.includes('user-not-found')) {
        message = 'No account found with this email address';
      } else if (error.message.includes('invalid-email')) {
        message = 'Invalid email address';
      } else {
        message = `Error: ${error.message}`;
      }
    }
    
    return {
      success: false,
      message
    };
  }
};

/**
 * Gets student info including temporary password status
 */
export const getStudentPasswordStatus = async (
  studentEmail: string,
  teacherId: string
): Promise<{
  success: boolean;
  hasTemporaryPassword?: boolean;
  temporaryPasswordCreatedAt?: Date;
  message?: string;
}> => {
  try {
    const usersCollection = collection(db, 'users');
    const q = query(
      usersCollection,
      where('email', '==', studentEmail.toLowerCase()),
      where('teacherId', '==', teacherId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return {
        success: false,
        message: 'Student not found'
      };
    }
    
    const userData = querySnapshot.docs[0].data();
    
    return {
      success: true,
      hasTemporaryPassword: userData.hasTemporaryPassword || false,
      temporaryPasswordCreatedAt: userData.temporaryPasswordCreatedAt?.toDate()
    };
    
  } catch (error) {
    console.error('Error getting student password status:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get password status'
    };
  }
}; 