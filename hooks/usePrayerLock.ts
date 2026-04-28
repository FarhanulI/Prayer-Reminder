import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useEffect, useRef, useState, useCallback } from "react";
import { AppState, Platform } from "react-native";
import { db } from "../lib/firebase";

const BLOCKED_APPS = [
  "com.instagram.android",
  "com.facebook.katana",
  "com.twitter.android",
  "com.google.android.youtube",
  "com.zhiliaoapp.musically",
  "com.snapchat.android",
  "com.reddit.frontpage",
  "com.netflix.mediaclient",
];

const PRAYER_WINDOW_MINUTES = 20;
const OVERLAY_SNOOZED_KEY = "overlay_snoozed_until";

type Prayer = {
  name: string;
  time: string;
};

type UsePrayerLockOptions = {
  uid: string | null;
  prayers: Prayer[];
  onShowOverlay: (prayerName: string) => void;
};

// Gets the currently active prayer if within PRAYER_WINDOW_MINUTES of its start time
function getActivePrayer(prayers: Prayer[]): Prayer | null {
  const now = dayjs();
  const today = now.format("YYYY-MM-DD");
  for (const prayer of prayers) {
    if (!prayer.time) continue;
    const prayerTime = dayjs(`${today} ${prayer.time}`);
    const minutesSince = now.diff(prayerTime, "minute");
    if (minutesSince >= 0 && minutesSince < PRAYER_WINDOW_MINUTES) {
      return prayer;
    }
  }
  return null;
}

export function usePrayerLock({ uid, prayers, onShowOverlay }: UsePrayerLockOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const checkPermissions = useCallback(async () => {
    if (Platform.OS !== "android") return false;
    try {
      const { hasUsageStatsPermission, hasOverlayPermission } = await import("../modules/prayer-lock");
      return hasUsageStatsPermission() && hasOverlayPermission();
    } catch {
      return false;
    }
  }, []);

  const requestAllPermissions = useCallback(async () => {
    if (Platform.OS !== "android") return;
    try {
      const { hasUsageStatsPermission, openUsageAccessSettings, hasOverlayPermission, requestOverlayPermission } =
        await import("../modules/prayer-lock");

      if (!hasUsageStatsPermission()) openUsageAccessSettings();
      if (!hasOverlayPermission()) requestOverlayPermission();
    } catch (e) {
      console.warn("[PrayerLock] Native module not available:", e);
    }
  }, []);

  const checkAndTrigger = useCallback(async () => {
    if (!uid || Platform.OS !== "android") return;

    // Check if snoozed
    const snoozedUntil = await AsyncStorage.getItem(OVERLAY_SNOOZED_KEY);
    if (snoozedUntil && dayjs().isBefore(dayjs(snoozedUntil))) return;

    const activePrayer = getActivePrayer(prayers);
    if (!activePrayer) return;

    try {
      const { getForegroundApp } = await import("../modules/prayer-lock");
      const foregroundApp = getForegroundApp();
      if (foregroundApp && BLOCKED_APPS.includes(foregroundApp)) {
        onShowOverlay(activePrayer.name);
      }
    } catch (e) {
      console.warn("[PrayerLock] Could not get foreground app:", e);
    }
  }, [uid, prayers, onShowOverlay]);

  // Start polling only when app is active
  useEffect(() => {
    if (!uid) return;

    const startPolling = async () => {
      const granted = await checkPermissions();
      setPermissionsGranted(granted);
      if (!granted) return;

      intervalRef.current = setInterval(checkAndTrigger, 4000);
    };

    startPolling();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") startPolling();
      else if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    });

    return () => {
      sub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [uid, checkPermissions, checkAndTrigger]);

  const markPrayerComplete = useCallback(
    async (prayerName: string) => {
      if (!uid) return;
      const today = dayjs().format("YYYY-MM-DD");
      await setDoc(
        doc(db, "users", uid, "prayer_logs", today),
        { [prayerName.toLowerCase()]: { status: "completed", completedAt: serverTimestamp() } },
        { merge: true }
      );
      await AsyncStorage.removeItem(OVERLAY_SNOOZED_KEY);
    },
    [uid]
  );

  const markPrayerSkipped = useCallback(
    async (prayerName: string) => {
      if (!uid) return;
      const today = dayjs().format("YYYY-MM-DD");
      await setDoc(
        doc(db, "users", uid, "prayer_logs", today),
        { [prayerName.toLowerCase()]: { status: "skipped", skippedAt: serverTimestamp() } },
        { merge: true }
      );
      await AsyncStorage.removeItem(OVERLAY_SNOOZED_KEY);
    },
    [uid]
  );

  const snoozeFor2Minutes = useCallback(async () => {
    const until = dayjs().add(2, "minute").toISOString();
    await AsyncStorage.setItem(OVERLAY_SNOOZED_KEY, until);
  }, []);

  return {
    permissionsGranted,
    requestAllPermissions,
    markPrayerComplete,
    markPrayerSkipped,
    snoozeFor2Minutes,
  };
}
