import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';

const auth = getAuth();

export async function safeGoogleSignIn(loginHint?: string) {
  const provider = new GoogleAuthProvider();

  // Force account chooser to appear for clarity in multi-account browsers
  const customParams: any = { prompt: 'select_account' };
  
  // If we have a login hint (expected email), add it to help Google pre-select the right account
  if (loginHint && loginHint.trim()) {
    customParams.login_hint = loginHint.toLowerCase().trim();
    console.log('[Google Sign-In] Using login hint:', customParams.login_hint);
  }
  
  provider.setCustomParameters(customParams);

    try {
    console.log('[Google Sign-In] Starting with account selection...');
    
    // Try popup with timeout, fall back to redirect if popup fails or takes too long
    try {
      // Create a timeout promise that rejects after 8 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('auth/popup-timeout'));
        }, 8000); // 8 second timeout
      });
      
      // Race between popup and timeout
      const result = await Promise.race([
        signInWithPopup(auth, provider),
        timeoutPromise
      ]) as any;
      
      console.log('[Google Sign-In] ✅ Popup Success:', result.user.email);
      
      // Check for account mismatch if login hint was provided
      if (loginHint && loginHint.trim() && result.user.email !== loginHint.toLowerCase().trim()) {
        console.warn('[Google Sign-In] ⚠️ Account mismatch detected');
        console.warn(`   Expected: ${loginHint.toLowerCase().trim()}`);
        console.warn(`   Received: ${result.user.email}`);
        
        const error = new Error(`Account mismatch: You signed in with ${result.user.email}, but this login is for ${loginHint}. Please try again and select the correct account.`);
        (error as any).code = 'auth/account-mismatch';
        throw error;
      }
      
      return result;
    } catch (popupError: any) {
      console.log('[Google Sign-In] Popup failed or timed out, trying redirect...', popupError.message || popupError.code);
      
      // If popup fails or times out, use redirect as fallback
      if (popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/popup-closed-by-user' || 
          popupError.code === 'auth/cancelled-popup-request' ||
          popupError.message === 'auth/popup-timeout') {
        
        console.log('[Google Sign-In] Using redirect method...');
        await signInWithRedirect(auth, provider);
        
        // This will not return immediately - the page will redirect
        // The redirect result will be handled when the page loads
        return null;
      }
      
      throw popupError;
    }
  } catch (error: any) {
    console.error('[Google Sign-In] ❌ Error:', error.code, error.message);
    
    // Provide user-friendly error messages
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled. Please try again.');
    }
    
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked by your browser. Please allow popups for this site and try again.');
    }
    
    if (error.code === 'auth/account-mismatch') {
      throw error; // Already has user-friendly message
    }
    
    throw error;
  }
}

// Check for redirect result when the page loads
export async function checkRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log('[Google Sign-In] ✅ Redirect Success:', result.user.email);
      return result;
    }
    return null;
  } catch (error: any) {
    console.error('[Google Sign-In] ❌ Redirect Error:', error.code, error.message);
    throw error;
  }
} 