import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../lib/firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const SESSION_KEY = "auth_session_timestamp";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => { },
});

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const checkSession = async (firebaseUser: User) => {
    try {
      const storedTime = await AsyncStorage.getItem(SESSION_KEY);
      const now = Date.now();

      if (storedTime) {
        const loginTime = parseInt(storedTime, 10);
        if (now - loginTime > ONE_WEEK_MS) {
          // Session expired
          await logout();
          return;
        }
      } else {
        // No timestamp found, but user is logged in. Set current time as start of session.
        await AsyncStorage.setItem(SESSION_KEY, now.toString());
      }
      setUser(firebaseUser);
    } catch (error) {
      console.error("Session Check Error:", error);
      setUser(firebaseUser);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await checkSession(firebaseUser);
      } else {
        setUser(null);
        await AsyncStorage.removeItem(SESSION_KEY);
      }
    });
    setLoading(false);

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);