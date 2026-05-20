import {
  getGoogleSignInErrorMessage,
  GoogleSignInError,
  isGoogleSignInNativeAvailable,
  signInWithGoogle,
} from '@/features/auth/googleSignIn.service';
import { useCallback, useState } from 'react';

export function useGoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const isNativeAvailable = isGoogleSignInNativeAvailable();

  const signIn = useCallback(async () => {
    setLoading(true);
    try {
      return await signInWithGoogle();
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    signInWithGoogle: signIn,
    googleLoading: loading,
    isGoogleSignInNativeAvailable: isNativeAvailable,
    getGoogleSignInErrorMessage,
    GoogleSignInError,
  };
}
