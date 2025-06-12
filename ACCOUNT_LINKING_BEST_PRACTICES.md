# Account Linking and Duplication Best Practices

## The Problem

When a student account is created with email/password authentication and the same email later attempts to sign in with Google, several issues can occur:

1. **Firebase Auth Provider Conflicts**: Firebase Auth may throw `auth/account-exists-with-different-credential` errors
2. **Duplicate Accounts**: The system might create separate Firebase Auth accounts for the same email
3. **Data Inconsistency**: Student data might be split across multiple accounts
4. **Poor User Experience**: Students might lose access to their assignments and progress

## Current Implementation Issues

The existing `AuthContext.tsx` has partial solutions but doesn't handle Firebase Auth provider conflicts properly:

```typescript
// Current problematic flow in checkUserRole()
const usersRef = collection(db, 'users');
const q = query(usersRef, where('email', '==', user.email));
const querySnapshot = await getDocs(q);

if (!querySnapshot.empty) {
  // This only links at Firestore level, not Firebase Auth level
  await updateDoc(userDoc.ref, {
    authUid: user.uid,
    linkedToAuth: true
  });
}
```

## Recommended Solution

### 1. Use the AccountLinkingService

The new `AccountLinkingService` provides comprehensive account linking:

```typescript
import { AccountLinkingService, enhancedGoogleSignIn } from '../services/accountLinking';

// Replace the current loginWithGoogle in AuthContext
const loginWithGoogle = async () => {
  try {
    const result = await enhancedGoogleSignIn();
    
    if (result.success) {
      // Handle successful sign-in/linking
      console.log(`Account ${result.action}: ${result.linkedAccount ? 'linked' : 'signed in'}`);
      return result;
    } else {
      // Handle linking requirements or errors
      if (result.error === 'ACCOUNT_LINKING_REQUIRED') {
        // Show account linking modal
        setShowAccountLinkingModal(true);
        setLinkingData({ email, googleCredential });
      } else {
        throw new Error(result.error);
      }
    }
  } catch (error) {
    console.error('Google sign-in failed:', error);
    throw error;
  }
};
```

### 2. Handle Student Temporary Password Scenarios

The service automatically handles students with temporary passwords:

```typescript
// In AccountLinkingService.handleStudentTemporaryPasswordLinking()
if (existingUserData.role === 'student' && existingUserData.hasTemporaryPassword) {
  // Automatically link Google account and remove temporary password requirement
  const result = await signInWithCredential(auth, googleCredential);
  
  await updateDoc(doc(db, 'users', result.user.uid), {
    hasTemporaryPassword: false,
    linkedToAuth: true,
    googleLinkedAt: serverTimestamp(),
    // Preserve all existing student data
    ...existingUserData
  });
}
```

### 3. Use the Account Linking Modal

For non-student accounts or when manual linking is required:

```tsx
import { AccountLinkingModal } from '../components/AccountLinkingModal';

const AuthProvider = ({ children }) => {
  const [showAccountLinkingModal, setShowAccountLinkingModal] = useState(false);
  const [linkingData, setLinkingData] = useState(null);
  
  const handleLinkingComplete = (result) => {
    console.log('Account linking completed:', result);
    // Update authentication state
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
      
      <AccountLinkingModal
        isOpen={showAccountLinkingModal}
        onClose={() => setShowAccountLinkingModal(false)}
        email={linkingData?.email}
        googleCredential={linkingData?.googleCredential}
        onLinkingComplete={handleLinkingComplete}
      />
    </AuthContext.Provider>
  );
};
```

## Implementation Steps

### Step 1: Update AuthContext

Replace the current `loginWithGoogle` function:

```typescript
const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    const linkingResult = await AccountLinkingService.handleGoogleSignIn({
      user: result.user,
      credential
    });

    if (linkingResult.success) {
      return result;
    } else if (linkingResult.error === 'ACCOUNT_LINKING_REQUIRED') {
      // Show linking modal for manual password entry
      setShowAccountLinkingModal(true);
      setLinkingData({ 
        email: result.user.email, 
        googleCredential: { user: result.user, credential } 
      });
      return null; // Don't complete sign-in yet
    } else {
      throw new Error(linkingResult.error);
    }
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};
```

### Step 2: Update Student Creation Process

Ensure student accounts are created with proper flags:

```typescript
// In passwordAuth.ts - createStudentAccountWithTemporaryPassword
await setDoc(userDocRef, {
  email: params.email.toLowerCase(),
  displayName: params.name,
  role: 'student',
  teacherId: params.teacherId,
  hasTemporaryPassword: true, // Critical for automatic linking
  temporaryPasswordCreatedAt: Timestamp.now(),
  createdAt: Timestamp.now(),
  createdBy: 'teacher'
});
```

### Step 3: Add Account Linking UI

Include the `AccountLinkingModal` in your app's modal system or directly in the AuthProvider.

## User Experience Flows

### Flow 1: Student with Temporary Password

1. Teacher creates student account with temporary password
2. Student clicks Google Sign-In
3. System detects existing password account with `hasTemporaryPassword: true`
4. **Automatic linking** - no user interaction required
5. Student is signed in with Google, temporary password requirement removed

### Flow 2: Teacher/Student with Regular Password

1. User has existing password account
2. User clicks Google Sign-In
3. System detects existing password account
4. **Modal appears** asking for current password
5. User enters password to confirm identity
6. Accounts are linked at Firebase Auth level
7. User can now sign in with either method

### Flow 3: New User

1. User clicks Google Sign-In
2. No existing accounts found
3. **New account created** with Google as primary provider
4. Default role assigned (teacher for new Google accounts)

## Security Considerations

### 1. Verify Identity Before Linking

```typescript
// Always verify the user's identity before linking accounts
const result = await signInWithEmailAndPassword(auth, email, password);
// Only after successful password verification:
await linkWithCredential(result.user, googleCredential);
```

### 2. Preserve Student Data

```typescript
// When linking, preserve all existing student data
await updateDoc(doc(db, 'users', user.uid), {
  // Preserve existing data
  ...existingUserData,
  // Update auth-related fields
  authUid: user.uid,
  linkedToAuth: true,
  googleLinkedAt: serverTimestamp()
});
```

### 3. Handle Edge Cases

- **Multiple providers**: Plan for Facebook, Apple, etc.
- **Email changes**: Handle when Google account email differs from original
- **Account deletion**: What happens when linked accounts are deleted?

## Testing Scenarios

### Test Case 1: Student Temporary Password Linking
1. Create student with temporary password
2. Sign in with Google using same email
3. Verify automatic linking and password flag removal

### Test Case 2: Teacher Password Linking
1. Create teacher account with password
2. Attempt Google sign-in
3. Verify modal appears and manual linking works

### Test Case 3: Duplicate Prevention
1. Try to create multiple accounts with same email
2. Verify proper error handling and linking

## Monitoring and Analytics

Track these metrics to ensure the system works well:

```typescript
// Track account linking events
analytics.logEvent('account_linked', {
  link_method: 'google_to_password',
  user_role: existingUserData.role,
  automatic: existingUserData.hasTemporaryPassword
});

// Track linking failures
analytics.logEvent('account_linking_failed', {
  error_type: result.error,
  user_email: email
});
```

## Future Enhancements

1. **Multiple Provider Support**: Extend to Facebook, Apple, etc.
2. **Account Merging**: Merge data when multiple accounts exist
3. **Progressive Linking**: Link accounts gradually as users use different providers
4. **Admin Tools**: Allow admins to manually link/unlink accounts

## Common Issues and Solutions

### Issue: "auth/account-exists-with-different-credential"

**Solution**: Use `fetchSignInMethodsForEmail()` first, then guide user through proper linking flow.

### Issue: Students can't access assignments after Google sign-in

**Solution**: Ensure account linking preserves all student data and teacher relationships.

### Issue: Teachers accidentally create student accounts

**Solution**: Implement role validation and account type confirmation during linking.

This comprehensive approach ensures a smooth user experience while maintaining data integrity and security. 