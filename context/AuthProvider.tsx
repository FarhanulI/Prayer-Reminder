import { fetchPrayerTimes, getDeviceToken, getLocation } from "@/features/device.service";
import { UserDocument } from "@/types";
import { getUserInfo, saveUserInfo } from "@/utils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { auth } from "../lib/firebase";

type AuthContextType = {
  user: UserDocument | null;
  loading: boolean;
  logout: () => Promise<void>;
  authStatus: AuthStatus;
  setAuthStatus: React.Dispatch<React.SetStateAction<AuthStatus>>
};

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "onboarding";

export const AUTHSTATUS = {
  loading: "loading",
  authenticated: "authenticated",
  unauthenticated: "unauthenticated",
  onboarding: "onboarding",
} as const;

const SESSION_KEY = "auth_session_timestamp";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => { },
  authStatus: 'loading',
  setAuthStatus: () => { }
});

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const logout = async () => {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  // const checkSession = async (firebaseUser: User) => {
  //   try {
  //     const storedTime = await AsyncStorage.getItem(SESSION_KEY);
  //     const now = Date.now();

  //     if (storedTime) {
  //       const loginTime = parseInt(storedTime, 10);
  //       if (now - loginTime > ONE_WEEK_MS) {
  //         // Session expired
  //         await logout();
  //         return;
  //       }
  //     } else {
  //       // No timestamp found, but user is logged in. Set current time as start of session.
  //       await AsyncStorage.setItem(SESSION_KEY, now.toString());
  //     }
  //     setUser(firebaseUser);
  //   } catch (error) {
  //     console.error("Session Check Error:", error);
  //     setUser(firebaseUser);
  //   }
  // };

  const syncUserInfo = async (firebaseUser: User) => {
    console.log({ firebaseUser });

    const userDoc = await getUserInfo(firebaseUser.uid);

    if (!userDoc) {
      const [token, location] = await Promise.all([
        getDeviceToken(),
        getLocation(),
      ]);

      const prayerTimes = await fetchPrayerTimes(location?.coords.latitude, location?.coords.longitude);

      console.log({ prayerTimes });


      const info: UserDocument = {
        createdAt: serverTimestamp(),
        deviceToken: token ?? null,
        location: location?.coords ?? null,
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        onboardingCompleted: false,
        profile: {
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          subscription: 'free', // Assuming 'free' is a subscription tier
          uid: firebaseUser?.uid
        }
      }

      await saveUserInfo(firebaseUser?.uid, info)
      setUser(info)
      setAuthStatus("onboarding")
      return;
    }


    setUser(userDoc);

    if (!userDoc?.onboardingCompleted) {
      setAuthStatus("onboarding")
    } else {
      setAuthStatus("authenticated")
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setAuthStatus(
          "unauthenticated"
        );

        if (Platform.OS === "android") {
          try {
            const { stopService } = await import("../modules/prayer-lock");
            stopService();
          } catch {
            /* native module unavailable */
          }
        }
        return;
      }

      syncUserInfo(firebaseUser)


      // if (firebaseUser) {
      //   await checkSession(firebaseUser);
      // } else {
      //   setUser(null);
      //   await AsyncStorage.removeItem(SESSION_KEY);

      // }
      // setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout, authStatus, setAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);