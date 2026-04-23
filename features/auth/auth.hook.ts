import { useState, useCallback } from 'react';
import { signupUser, loginUser, logoutUser } from './auth.service';

export const useAuthActions = () => {
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const login = useCallback(async (email: string, pass: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const user = await loginUser(email, pass);
      return user;
    } catch (e: any) {
      setAuthError(e.message);
      throw e;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, pass: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const user = await signupUser(email, pass);
      return user;
    } catch (e: any) {
      setAuthError(e.message);
      throw e;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthLoading(true);
    try {
      await logoutUser();
    } catch (e: any) {
      setAuthError(e.message);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  return { login, signup, logout, authLoading, authError };
};
