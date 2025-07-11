import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  UserCredential,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// For demo purposes, we'll check if user email is in this list to determine if they're a teacher
const TEACHER_EMAILS = [
  'teacher@example.com',
  'admin@example.com'
];

interface AuthContextType {
  currentUser: User | null;
  isTeacher: boolean;
  isStudent: boolean;
  loginWithGoogle: (useRedirect?: boolean, loginHint?: string) => Promise<UserCredential | null>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signup: (email: string, password: string, recaptchaToken?: string) => Promise<UserCredential>;
  setCurrentUserAsAdmin: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isTeacher: false,
  isStudent: false,
  loginWithGoogle: async () => null,
  login: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  updateEmail: async () => {},
  updatePassword: async () => {},
  signup: async () => { return {} as UserCredential; },
  setCurrentUserAsAdmin: async () => { return false; }
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check the user's role
  const checkUserRole = async (user: User | null) => {
    if (!user) {
      setIsTeacher(false);
      setIsStudent(false);
      return;
    }
    
    try {
      // First check if email is in our demo teacher list
      if (TEACHER_EMAILS.includes(user.email || '')) {
        setIsTeacher(true);
        setIsStudent(false);
        return;
      }
      
      // Check if they have a role in their user document
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Update lastLogin timestamp - preserve existing createdAt
          try {
            const updateData: any = {
              lastLogin: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              authUid: user.uid,
              userId: user.uid,
              displayName: user.displayName || userData.displayName || user.email?.split('@')[0],
              email: user.email,
              emailVerified: user.emailVerified,
              linkedToAuth: true
            };
            
            // IMPORTANT: Preserve existing createdAt if it exists, otherwise create one
            if (userData.createdAt) {
              updateData.createdAt = userData.createdAt;
            } else {
              updateData.createdAt = new Date().toISOString();
            }
            
            await updateDoc(userDocRef, updateData);
          } catch (error) {
            console.error('Error updating user login timestamp:', error);
          }
          
          // Check their role
          if (userData.role === 'teacher') {
            setIsTeacher(true);
            setIsStudent(false);
            return;
          } else if (userData.role === 'student') {
            setIsTeacher(false);
            setIsStudent(true);
            
            // Check if student has temporary password and redirect (only if not already on password change page)
            if (userData.hasTemporaryPassword && window.location.pathname !== '/password-change') {
              console.log('🔑 Student has temporary password - redirecting to password change');
              // Use a small delay to ensure auth state is fully updated
              setTimeout(() => {
                window.location.href = '/password-change';
              }, 100);
              return;
            }
            return;
          }
        } else {
        }
      } catch (error) {
        console.error('Error checking user document by UID:', error);
      }
      
      // Fallback: try to find user by email (for legacy documents)
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const existingUserDoc = querySnapshot.docs[0];
          const existingUserData = existingUserDoc.data();
          
          // 🛡️ IMPORTANT: Check if this document is already using the correct UID
          // If the document ID matches the user's UID, then it's NOT a legacy document
          if (existingUserDoc.id === user.uid) {
            console.log('✅ Found user document by email, but it already has correct UID - no migration needed');
            
            // Just update the existing document with current auth info
            try {
              const updateData: any = {
                lastLogin: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                authUid: user.uid,
                userId: user.uid,
                displayName: user.displayName || existingUserData.displayName || user.email?.split('@')[0],
                email: user.email,
                emailVerified: user.emailVerified,
                linkedToAuth: true
              };
              
              // Preserve existing createdAt
              if (existingUserData.createdAt) {
                updateData.createdAt = existingUserData.createdAt;
              } else {
                updateData.createdAt = new Date().toISOString();
              }
              
              await updateDoc(existingUserDoc.ref, updateData);
              
              // Set their role
              if (existingUserData.role === 'teacher' || existingUserData.role === 'admin') {
                setIsTeacher(true);
                setIsStudent(false);
              } else if (existingUserData.role === 'student') {
                setIsTeacher(false);
                setIsStudent(true);
                
                // Check if student has temporary password and redirect (only if not already on password change page)
                if (existingUserData.hasTemporaryPassword && window.location.pathname !== '/password-change') {
                  console.log('🔑 Student has temporary password - redirecting to password change');
                  // Use a small delay to ensure auth state is fully updated
                  setTimeout(() => {
                    window.location.href = '/password-change';
                  }, 100);
                  return;
                }
              }
              return;
            } catch (error) {
              console.error('Error updating existing user document:', error);
            }
          } else {
            console.log('🔄 Found legacy user document with different UID - performing migration');
            console.log(`   Legacy UID: ${existingUserDoc.id}`);
            console.log(`   Current UID: ${user.uid}`);

            
            // This is a real legacy document - perform migration
          try {
            const newUserData: any = {
              ...existingUserData,
              userId: user.uid,
              authUid: user.uid,
              updatedAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              displayName: user.displayName || existingUserData.displayName || user.email?.split('@')[0],
              email: user.email,
              emailVerified: user.emailVerified,
              linkedToAuth: true,
              role: existingUserData.role  // Preserve their original role
            };
            
            // IMPORTANT: Preserve existing createdAt if it exists, otherwise create one
            if (existingUserData.createdAt) {
              newUserData.createdAt = existingUserData.createdAt;
            } else {
              newUserData.createdAt = new Date().toISOString();
            }
            
            await setDoc(doc(db, 'users', user.uid), newUserData);
            
              // Delete the old document ONLY if it has a different UID
            await deleteDoc(existingUserDoc.ref);
              console.log('✅ Successfully migrated legacy user document');
            
            // Set their role based on the migrated data
              if (existingUserData.role === 'teacher' || existingUserData.role === 'admin') {
              setIsTeacher(true);
              setIsStudent(false);
            } else if (existingUserData.role === 'student') {
              setIsTeacher(false);
              setIsStudent(true);
              
              // Check if student has temporary password and redirect (only if not already on password change page)
              if (existingUserData.hasTemporaryPassword && window.location.pathname !== '/password-change') {
                console.log('🔑 Migrated student has temporary password - redirecting to password change');
                // Use a small delay to ensure auth state is fully updated
                setTimeout(() => {
                  window.location.href = '/password-change';
                }, 100);
                return;
              }
            }
            return;
          } catch (error) {
            console.error('Error creating new user document with correct UID:', error);
            }
          }
        } else {
          console.log('❌ DEBUG: No user documents found by email search');
        }
      } catch (error) {
        console.error('Error checking user by email:', error);
      }
      
      // No role found
      setIsTeacher(false);
      setIsStudent(false);
    } catch (error) {
      console.error('Error in checkUserRole:', error);
      setIsTeacher(false);
      setIsStudent(false);
    }
  };

  useEffect(() => {
    // Check for redirect result first
    getRedirectResult(auth).then((result) => {
      if (result) {
        // Redirect sign-in successful
      }
    }).catch((error) => {
      console.error('Redirect sign-in error:', error);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      checkUserRole(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email: string, password: string, recaptchaToken?: string): Promise<UserCredential> => {
    try {
      // Validate recaptcha token if present (this would typically be done server-side)
      if (!recaptchaToken) {
        console.log('No reCAPTCHA token provided, proceeding with signup without verification');
        // In a production environment, you might want to implement server-side verification
        // and reject signups without a valid token
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create a user record in the users collection
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: email,
        createdAt: new Date().toISOString(),
        userId: userCredential.user.uid,
        // Store the fact that user was verified by reCAPTCHA
        verifiedByRecaptcha: !!recaptchaToken,
      });
      
      return userCredential;
    } catch (error) {
      console.error('Error creating user with email and password:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in with email and password:', error);
      throw error;
    }
  };

  const loginWithGoogle = async (useRedirect = false, loginHint?: string) => {
    // Create the provider instance
    const provider = new GoogleAuthProvider();
    
    // Add scopes that you need
    provider.addScope('profile');
    provider.addScope('email');
    
    // Set custom parameters for the auth provider - force account selection for login modal
    const customParams: any = {
      prompt: 'select_account'
    };
    
    // If we have a login hint (expected email), add it to help Google pre-select the right account
    if (loginHint && loginHint.trim()) {
      customParams.login_hint = loginHint.toLowerCase().trim();
    }
    
    provider.setCustomParameters(customParams);
    
    if (useRedirect) {
      try {
        await signInWithRedirect(auth, provider);
        // Note: signInWithRedirect doesn't return a result directly
        // The user will be redirected away and back
        return null;
      } catch (error: any) {
        console.error('Redirect sign-in failed:', error);
        throw error;
      }
    }
    
    try {
      // Test popup blocker first
      const testPopup = window.open('', '_blank', 'width=1,height=1');
             if (!testPopup || testPopup.closed) {
         testPopup?.close();
         return await loginWithGoogle(true);
       }
      testPopup.close();
      
      // Use signInWithPopup for direct feedback with timeout
      const signInPromise = signInWithPopup(auth, provider);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Google Sign-In popup timed out after 30 seconds')), 30000);
      });
      
      const result = await Promise.race([signInPromise, timeoutPromise]) as UserCredential;
      return result;
          } catch (error: any) {
        console.error('Google Sign-In error occurred:', error);
      
      // Handle specific error cases
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled. Please try again.');
      }
      
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by your browser. Please allow popups for this site and try again.');
      }
      
      // Handle timeout - fallback to redirect
      if (error.message && error.message.includes('timed out')) {
        try {
          return await loginWithGoogle(true);
        } catch (redirectError) {
          console.error('Redirect fallback also failed:', redirectError);
          throw new Error('Both popup and redirect sign-in methods failed. Please try again or contact support.');
        }
      }
      
      // Handle IndexedDB/storage errors
      if (error.message && error.message.includes('IndexedDB')) {
        throw new Error('Browser storage issue detected. Please clear your browser data (F12 → Application → Storage → Clear site data) and try again.');
      }
      
      // Handle other storage-related errors
      if (error.message && (error.message.includes('storage') || error.message.includes('quota'))) {
        throw new Error('Browser storage is full or corrupted. Please clear your browser data and try again.');
      }
      
      // Handle account linking when user already has email/password account
      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email;
        if (email) {
          throw new Error(`You already have an account with ${email}. Please sign in with your email and password to link your Google account.`);
        }
      }
      
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };

  const updateEmail = async (email: string) => {
    try {
      if (currentUser) {
        await firebaseUpdateEmail(currentUser, email);
      } else {
        throw new Error('No user logged in');
      }
    } catch (error) {
      console.error('Error updating email:', error);
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    try {
      if (currentUser) {
        await firebaseUpdatePassword(currentUser, password);
      } else {
        throw new Error('No user logged in');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  };

  const setCurrentUserAsAdmin = async () => {
    try {
      if (!currentUser) {
        throw new Error('No user logged in');
      }
      
      // Update the user document with admin role
      await setDoc(doc(db, 'users', currentUser.uid), {
        email: currentUser.email,
        role: 'admin',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Force set isTeacher to true locally, this ensures the UI will work
      // even if there are permission issues with reading the user doc
      setIsTeacher(true);
      console.log('User set as admin and teacher flag activated');
      
      return true;
    } catch (error) {
      console.error('Error setting user as admin:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    isTeacher,
    isStudent,
    loginWithGoogle,
    login,
    logout,
    resetPassword,
    updateEmail,
    updatePassword,
    signup,
    setCurrentUserAsAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 