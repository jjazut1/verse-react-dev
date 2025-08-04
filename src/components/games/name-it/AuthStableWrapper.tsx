import React, { ReactNode, useEffect, useState, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Center, Spinner, Box } from '@chakra-ui/react';

interface AuthStableWrapperProps {
  children: ReactNode;
  fallbackPlayerId?: string;
}

/**
 * AuthStableWrapper prevents auth state changes from unmounting 
 * child components during active gameplay by maintaining stable 
 * user identity even during auth transitions.
 */
const AuthStableWrapperComponent: React.FC<AuthStableWrapperProps> = ({
  children,
  fallbackPlayerId = 'local-player'
}) => {
  const auth = useAuth();
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const stableUserRef = useRef<any>(null);
  
  // ✅ COMPONENT LIFECYCLE: Track wrapper mounting/unmounting
  useEffect(() => {
    console.log('🎬 AUTH STABLE WRAPPER: MOUNTED at', new Date().toISOString());
    return () => {
      console.log('💀 AUTH STABLE WRAPPER: UNMOUNTING!!! at', new Date().toISOString());
      console.trace();
    };
  }, []);
  
  // ✅ STABILITY: Once we have a user, lock it in for the game session
  useEffect(() => {
    if (auth.currentUser && !isAuthInitialized) {
      stableUserRef.current = auth.currentUser;
      setIsAuthInitialized(true);
      console.log('🔒 AUTH STABILIZED: User locked for game session:', auth.currentUser.uid);
    }
  }, [auth.currentUser, isAuthInitialized]);
  
  // ✅ DEBUGGING: Track auth changes during stabilized session
  useEffect(() => {
    if (isAuthInitialized && auth.currentUser?.uid !== stableUserRef.current?.uid) {
      console.log('⚠️ AUTH CHANGED DURING GAME:', {
        stableUserId: stableUserRef.current?.uid,
        newUserId: auth.currentUser?.uid,
        'This could cause unmount without wrapper': true
      });
    }
  }, [auth.currentUser, isAuthInitialized]);
  
  // ✅ LOADING GATE: Wait for auth initialization
  if (!isAuthInitialized && !auth.currentUser) {
    return (
      <Center height="50vh">
        <Box textAlign="center">
          <Spinner size="xl" />
          <Box mt={4}>Initializing authentication...</Box>
        </Box>
      </Center>
    );
  }
  
  // ✅ STABLE RENDERING: Render children with stable auth context
  return <>{children}</>;
};

// ✅ STABILITY: Wrap with React.memo to prevent unnecessary re-renders
export const AuthStableWrapper = React.memo(AuthStableWrapperComponent, (prevProps, nextProps) => {
  console.log('🔧 AUTH STABLE WRAPPER REACT.MEMO: Checking if re-render needed');
  
  // Compare fallbackPlayerId (should be stable)
  const fallbackPlayerIdChanged = prevProps.fallbackPlayerId !== nextProps.fallbackPlayerId;
  
  // Since children is a React element, shallow comparison should work
  // But we'll be more permissive and only check if children type changed
  const childrenChanged = typeof prevProps.children !== typeof nextProps.children ||
                         React.isValidElement(prevProps.children) !== React.isValidElement(nextProps.children);
  
  const shouldRerender = fallbackPlayerIdChanged || childrenChanged;
  
  console.log('🔧 AUTH STABLE WRAPPER REACT.MEMO:', {
    fallbackPlayerIdChanged,
    childrenChanged,
    shouldRerender,
    action: shouldRerender ? 'ALLOWING re-render' : 'PREVENTING re-render'
  });
  
  return !shouldRerender; // Return true to prevent re-render, false to allow
});

AuthStableWrapper.displayName = 'AuthStableWrapper';

export default AuthStableWrapper; 