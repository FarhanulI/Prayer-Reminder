import { db } from "@/lib/firebase";
// import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useRef } from "react";

async function requestPermissionAndGetToken(): Promise<string | null> {
  if (true) {
    console.warn(
      "[ExpoPushToken] Must use physical device for push notifications",
    );
    return null;
  }

}

async function saveTokenToFirestore(uid: string, token: string): Promise<void> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return;

  const existing = snap.data().expoPushToken;
  if (existing === token) return;

  await updateDoc(userRef, { expoPushToken: token });
  console.info("[ExpoPushToken] Token saved for uid:", uid);
}

async function clearTokenFromFirestore(uid: string): Promise<void> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return;

  await updateDoc(userRef, { expoPushToken: null });
  console.info("[ExpoPushToken] Token cleared for uid:", uid);
}

export function useExpoPushToken(uid: string | null | undefined) {
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    let tokenSubscription: Notifications.Subscription | undefined;

    const register = async () => {
      const token = await requestPermissionAndGetToken();
      if (!token) return;

      tokenRef.current = token;
      await saveTokenToFirestore(uid, token);

      // Update token if it rotates
      tokenSubscription = Notifications.addPushTokenListener(
        async (newToken) => {
          if (newToken.data && newToken.data !== tokenRef.current) {
            tokenRef.current = newToken.data;
            await saveTokenToFirestore(uid, newToken.data);
          }
        },
      );
    };

    register();

    return () => {
      tokenSubscription?.remove();
    };
  }, [uid]);

  // Call this on logout
  const clearToken = async () => {
    if (uid) {
      await clearTokenFromFirestore(uid);
    }
    tokenRef.current = null;
  };

  return { clearToken };
}
