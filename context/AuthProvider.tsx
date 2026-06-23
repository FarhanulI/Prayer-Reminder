import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { loadPrayerLock } from "@/hooks/use-prayer-lock/prayer-lock.loader";
import { auth, db } from "@/lib/firebase";
import { UserDocument } from "@/types";
import { Platform } from "react-native";

export const AUTHSTATUS = {
  loading: "loading",
  authenticated: "authenticated",
  unauthenticated: "unauthenticated",
  onboarding: "onboarding",
} as const;

type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "onboarding";

type AuthContextType = {
  user: UserDocument | null;
  authStatus: AuthStatus;
  logout: () => Promise<void>;
  setAuthStatus: React.Dispatch<React.SetStateAction<AuthStatus>>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  authStatus: "loading",
  logout: async () => {},
  setAuthStatus: () => {},
});

const SESSION_KEY = "auth_session_timestamp";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserDocument | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");

  const logout = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        try {
          const { stopService } = await loadPrayerLock();
          stopService();
        } catch (error) {
          console.warn(
            "[AuthProvider] Failed to stop prayer lock service:",
            error,
          );
        }
      }

      await AsyncStorage.removeItem(SESSION_KEY);
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  }, []);

  const ensureUserDocument = async (firebaseUser: User) => {
    const userRef = doc(db, "users", firebaseUser.uid);

    const snap = await getDoc(userRef);

    if (snap.exists()) {
      return;
    }

    const userData: UserDocument = {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      onboardingCompleted: false,

      profile: {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        subscription: "free",
      },

      location: null,
    };

    await setDoc(userRef, userData);
  };

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          setAuthStatus("unauthenticated");
          return;
        }

        setAuthStatus("loading");

        // Create user doc if needed
        await ensureUserDocument(firebaseUser);

        unsubscribeUserDoc?.();

        unsubscribeUserDoc = onSnapshot(
          doc(db, "users", firebaseUser.uid),
          (snap) => {
            if (!snap.exists()) {
              return;
            }

            const userDoc = snap.data() as UserDocument;

            setUser(userDoc);

            setAuthStatus(
              userDoc.onboardingCompleted ? "authenticated" : "onboarding",
            );
          },
        );
      } catch (err) {
        console.error("Auth bootstrap failed:", err);

        setUser(null);
        setAuthStatus("unauthenticated");
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUserDoc?.();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      authStatus,
      logout,
      setAuthStatus,
    }),
    [user, authStatus, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);
