import { 
  User, 
  GoogleAuthProvider, 
  linkWithCredential, 
  signInWithCredential,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface AccountLinkingResult {
  success: boolean;
  user?: User;
  linkedAccount?: boolean;
  error?: string;
  action?: 'linked' | 'merged' | 'created' | 'signed_in';
}

/**
 * Comprehensive account linking and duplication handler
 * This is the recommended approach for handling account conflicts
 */
export class AccountLinkingService {
  
  /**
   * Handle Google Sign-In with potential account conflicts
   */
  static async handleGoogleSignIn(googleCredential: any): Promise<AccountLinkingResult> {
    try {
      const email = googleCredential.user?.email;
      if (!email) {
        return { success: false, error: 'No email found in Google credential' };
      }

      // Check if email already has accounts with other providers
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      
      if (signInMethods.length === 0) {
        // No existing account - proceed with Google sign-in
        return await this.createNewGoogleAccount(googleCredential);
      }

      if (signInMethods.includes('google.com')) {
        // Already has Google account - just sign in
        return await this.signInWithGoogle(googleCredential);
      }

      if (signInMethods.includes('password')) {
        // Has password account - need to link
        return await this.linkGoogleToPasswordAccount(email, googleCredential);
      }

      // Other providers (email link, etc.)
      return await this.handleOtherProviderConflict(email, googleCredential, signInMethods);

    } catch (error) {
      console.error('Error in handleGoogleSignIn:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create new account from Google sign-in
   */
  private static async createNewGoogleAccount(googleCredential: any): Promise<AccountLinkingResult> {
    try {
      // Sign in with Google
      const result = await signInWithCredential(auth, googleCredential);
      
      // Check if there's existing Firestore data for this email
      const existingUserData = await this.findExistingUserData(result.user.email!);
      
      if (existingUserData) {
        // Merge existing data with new Google account
        await this.mergeUserData(result.user, existingUserData);
        return { 
          success: true, 
          user: result.user, 
          action: 'merged',
          linkedAccount: false 
        };
      } else {
        // Create new user document
        await this.createUserDocument(result.user);
        return { 
          success: true, 
          user: result.user, 
          action: 'created',
          linkedAccount: false 
        };
      }
    } catch (error) {
      console.error('Error creating new Google account:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create account'
      };
    }
  }

  /**
   * Sign in with existing Google account
   */
  private static async signInWithGoogle(googleCredential: any): Promise<AccountLinkingResult> {
    try {
      const result = await signInWithCredential(auth, googleCredential);
      return { 
        success: true, 
        user: result.user, 
        action: 'signed_in',
        linkedAccount: false 
      };
    } catch (error) {
      console.error('Error signing in with Google:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sign in'
      };
    }
  }

  /**
   * Link Google account to existing password account
   * This is the critical function for handling student account conflicts
   */
  private static async linkGoogleToPasswordAccount(
    email: string, 
    googleCredential: any
  ): Promise<AccountLinkingResult> {
    try {
      // Find existing user data
      const existingUserData = await this.findExistingUserData(email);
      
      if (!existingUserData) {
        return { 
          success: false, 
          error: 'No existing user data found for email' 
        };
      }

      // For students with temporary passwords, we need special handling
      if (existingUserData.role === 'student' && existingUserData.hasTemporaryPassword) {
        return await this.handleStudentTemporaryPasswordLinking(email, googleCredential, existingUserData);
      }

      // For regular password accounts, prompt for password to link
      return await this.promptForPasswordAndLink(email, googleCredential, existingUserData);

    } catch (error) {
      console.error('Error linking Google to password account:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to link accounts'
      };
    }
  }

  /**
   * Handle student temporary password linking
   * This automatically links Google account for students with temporary passwords
   */
  private static async handleStudentTemporaryPasswordLinking(
    email: string,
    googleCredential: any,
    existingUserData: any
  ): Promise<AccountLinkingResult> {
    try {
      console.log('Handling student temporary password linking for:', email);
      
      // Since this is a student with a temporary password, we can safely
      // link the Google account and remove the temporary password requirement
      
      // First, sign in with Google to get the user
      const result = await signInWithCredential(auth, googleCredential);
      
      // Update the user document to remove temporary password flag
      await updateDoc(doc(db, 'users', result.user.uid), {
        hasTemporaryPassword: false,
        linkedToAuth: true,
        authUid: result.user.uid,
        googleLinkedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Preserve all existing student data
        ...existingUserData,
        // But update auth-related fields
        email: result.user.email,
        displayName: result.user.displayName || existingUserData.displayName
      });

      console.log('Successfully linked Google account for student with temporary password');
      
      return {
        success: true,
        user: result.user,
        action: 'linked',
        linkedAccount: true
      };

    } catch (error) {
      console.error('Error handling student temporary password linking:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link student account'
      };
    }
  }

  /**
   * Prompt user for password and link accounts
   */
  private static async promptForPasswordAndLink(
    email: string,
    googleCredential: any,
    existingUserData: any
  ): Promise<AccountLinkingResult> {
    // This would typically show a modal/dialog in the UI
    // For now, we'll return an error that the UI can handle
    return {
      success: false,
      error: 'ACCOUNT_LINKING_REQUIRED',
      // Include data needed for UI to handle linking
    };
  }

  /**
   * Handle other provider conflicts (email link, etc.)
   */
  private static async handleOtherProviderConflict(
    email: string,
    googleCredential: any,
    signInMethods: string[]
  ): Promise<AccountLinkingResult> {
    // Handle email link provider conflicts
    if (signInMethods.includes('emailLink')) {
      // Similar to password account, but for email link accounts
      return await this.linkGoogleToEmailLinkAccount(email, googleCredential);
    }

    return {
      success: false,
      error: `Account exists with other providers: ${signInMethods.join(', ')}`
    };
  }

  /**
   * Link Google account to email link account
   */
  private static async linkGoogleToEmailLinkAccount(
    email: string,
    googleCredential: any
  ): Promise<AccountLinkingResult> {
    try {
      const result = await signInWithCredential(auth, googleCredential);
      
      // Update existing user data
      const existingUserData = await this.findExistingUserData(email);
      if (existingUserData) {
        await this.mergeUserData(result.user, existingUserData);
      }

      return {
        success: true,
        user: result.user,
        action: 'linked',
        linkedAccount: true
      };
    } catch (error) {
      console.error('Error linking Google to email link account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link accounts'
      };
    }
  }

  /**
   * Find existing user data by email
   */
  private static async findExistingUserData(email: string): Promise<any | null> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        userData.firestoreId = querySnapshot.docs[0].id;
        return userData;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding existing user data:', error);
      return null;
    }
  }

  /**
   * Merge existing user data with new auth user
   */
  private static async mergeUserData(user: User, existingData: any): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Create/update user document with current auth UID
      const userDocRef = doc(db, 'users', user.uid);
      batch.set(userDocRef, {
        ...existingData,
        authUid: user.uid,
        email: user.email,
        displayName: user.displayName || existingData.displayName,
        linkedToAuth: true,
        mergedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // If there was an old document with different ID, delete it
      if (existingData.firestoreId && existingData.firestoreId !== user.uid) {
        const oldDocRef = doc(db, 'users', existingData.firestoreId);
        batch.delete(oldDocRef);
      }

      await batch.commit();
      console.log('User data merged successfully');
    } catch (error) {
      console.error('Error merging user data:', error);
      throw error;
    }
  }

  /**
   * Create new user document
   */
  private static async createUserDocument(user: User): Promise<void> {
    try {
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: user.displayName,
        authUid: user.uid,
        role: 'teacher', // Default role for new Google sign-ins
        linkedToAuth: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating user document:', error);
      throw error;
    }
  }

  /**
   * Manual account linking for UI-driven flows
   */
  static async linkAccountWithPassword(
    email: string,
    password: string,
    googleCredential: any
  ): Promise<AccountLinkingResult> {
    try {
      // First, sign in with email/password
      const passwordResult = await signInWithEmailAndPassword(auth, email, password);
      
      // Then link the Google credential
      const credential = GoogleAuthProvider.credentialFromResult(googleCredential);
      if (credential) {
        await linkWithCredential(passwordResult.user, credential);
      }

      return {
        success: true,
        user: passwordResult.user,
        action: 'linked',
        linkedAccount: true
      };
    } catch (error) {
      console.error('Error linking account with password:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link accounts'
      };
    }
  }
}

/**
 * Updated AuthContext integration
 * Use this in your AuthContext instead of the current loginWithGoogle
 */
export const enhancedGoogleSignIn = async (): Promise<AccountLinkingResult> => {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    return await AccountLinkingService.handleGoogleSignIn({
      user: result.user,
      credential
    });
  } catch (error) {
    console.error('Error in enhanced Google sign in:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Google sign in failed'
    };
  }
}; 