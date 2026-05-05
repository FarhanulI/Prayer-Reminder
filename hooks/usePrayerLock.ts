import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { db } from "../lib/firebase";

/**
 * List of package names for social media and entertainment apps that should be
 * restricted during prayer times to prevent distractions.
 */
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



/**
 * AsyncStorage key used to store the timestamp until which the overlay is snoozed.
 */
const OVERLAY_SNOOZED_KEY = "overlay_snoozed_until";

/**
 * Represents a prayer with its name and scheduled time.
 */
type Prayer = {
  name: string;
  time: string; // Expected format: "HH:mm"
  end: string;  // Expected format: "HH:mm"
  completed?: boolean;
};

/**
 * Configuration options for the usePrayerLock hook.
 */
type UsePrayerLockOptions = {
  uid: string | null;            // Authenticated user ID
  prayers: Prayer[];             // List of prayer times for the day
  onShowOverlay: (prayerName: string) => void; // Callback to trigger the UI overlay
};

/**
 * Determines if the current time falls within the restriction window of any prayer.
 * 
 * @param prayers - Array of prayer objects with times.
 * @returns The active Prayer object if within the window, otherwise null.
 */
function getActivePrayer(prayers: Prayer[]): Prayer | null {
  const now = dayjs();
  const today = now.format("YYYY-MM-DD");

  for (const prayer of prayers) {
    if (!prayer.time || !prayer.end || prayer.completed) continue;

    const startTime = dayjs(`${today} ${prayer.time}`);
    const endTime = dayjs(`${today} ${prayer.end}`);

    // Handle cases where the end time is on the next day (e.g., Isha/Midnight)
    let adjustedEnd = endTime;
    if (endTime.isBefore(startTime)) {
      adjustedEnd = endTime.add(1, "day");
    }

    // Check if current time is within the prayer window [startTime, adjustedEnd)
    if (now.isSame(startTime) || (now.isAfter(startTime) && now.isBefore(adjustedEnd))) {
      return prayer;
    }
  }
  return null;
}

/**
 * A custom hook that monitors app usage during prayer times on Android.
 * It checks if a user is using a "blocked" app during a prayer window and
 * triggers an overlay if necessary.
 * 
 * @returns An object containing permission status and control methods.
 */
export function usePrayerLock({ uid, prayers, onShowOverlay }: UsePrayerLockOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  /**
   * Checks both Usage Stats and Overlay permissions.
   */
  const checkPermissions = useCallback(async () => {
    if (Platform.OS !== "android") return false;
    try {
      const { hasUsageStatsPermission, hasOverlayPermission } = await import("../modules/prayer-lock");
      const UsageStatsPermission = await hasUsageStatsPermission();
      const OverlayPermission = await hasOverlayPermission();

      return UsageStatsPermission && OverlayPermission;
    } catch {
      return false;
    }
  }, []);

  /**
   * Opens Android settings to request necessary permissions.
   */
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

  /**
   * The core logic to check if a blocked app is in the foreground during a prayer window.
   */
  const checkAndTrigger = useCallback(async () => {
    if (!uid || Platform.OS !== "android") return;

    // 1. Check if the user has snoozed the overlay recently
    const snoozedUntil = await AsyncStorage.getItem(OVERLAY_SNOOZED_KEY);
    if (snoozedUntil && dayjs().isBefore(dayjs(snoozedUntil))) return;

    // 2. Identify if we are currently in a prayer restriction window
    const activePrayer = getActivePrayer(prayers);
    if (!activePrayer) return;

    try {
      // 3. Query the native module for the current foreground application
      const { getForegroundApp } = await import("../modules/prayer-lock");
      const foregroundApp = getForegroundApp();

      const isBlockedApps = foregroundApp && BLOCKED_APPS.includes(foregroundApp)

      // 4. Trigger the overlay if the foreground app is in our blocked list
      if (isBlockedApps) {
        onShowOverlay(activePrayer.name);
      }
    } catch (e) {
      console.warn("[PrayerLock] Could not get foreground app:", e);
    }
  }, [uid, prayers, onShowOverlay]);

  // Handle polling and AppState changes
  useEffect(() => {
    if (!uid) return;

    const startPolling = async () => {
      const granted = await checkPermissions();

      setPermissionsGranted(granted);

      // Only start the interval if we have the required native permissions
      if (!granted) return;

      // Poll every 4 seconds for a balance between responsiveness and battery life
      intervalRef.current = setInterval(checkAndTrigger, 4000);
    };

    startPolling();

    // Re-check/restart polling when the app comes back to the foreground
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        startPolling();
      } else if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    });

    return () => {
      sub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [uid, checkPermissions, checkAndTrigger]);

  /**
   * Marks a prayer as completed in Firestore and clears any active snooze.
   */
  const markPrayerComplete = useCallback(
    async (prayerName: string) => {
      if (!uid) return;
      const today = dayjs().format("YYYY-MM-DD");
      await setDoc(
        doc(db, "users", uid, "prayer_logs", today),
        { [prayerName.toLowerCase()]: { status: "completed", completedAt: serverTimestamp() } },
        { merge: true }
      );
      // Also update the prayerTimes collection so the UI reflects the completion
      await setDoc(
        doc(db, "users", uid, "prayerTimes", today),
        { [prayerName.toLowerCase()]: { done: true } },
        { merge: true }
      );
      await AsyncStorage.removeItem(OVERLAY_SNOOZED_KEY);
    },
    [uid]
  );

  /**
   * Marks a prayer as skipped in Firestore and clears any active snooze.
   */
  const markPrayerSkipped = useCallback(
    async (prayerName: string) => {
      if (!uid) return;
      const today = dayjs().format("YYYY-MM-DD");
      await setDoc(
        doc(db, "users", uid, "prayer_logs", today),
        { [prayerName.toLowerCase()]: { status: "skipped", skippedAt: serverTimestamp() } },
        { merge: true }
      );
      // Also update the prayerTimes collection so the UI reflects that this prayer is handled
      await setDoc(
        doc(db, "users", uid, "prayerTimes", today),
        { [prayerName.toLowerCase()]: { done: true } },
        { merge: true }
      );
      await AsyncStorage.removeItem(OVERLAY_SNOOZED_KEY);
    },
    [uid]
  );

  /**
   * Temporarily disables the overlay for 2 minutes.
   */
  const snoozeFor2Minutes = useCallback(async () => {
    const until = dayjs().add(2, "minute").toISOString();
    await AsyncStorage.setItem(OVERLAY_SNOOZED_KEY, until);
  }, []);

  return {
    permissionsGranted,    // Whether Android permissions are currently active
    requestAllPermissions, // Function to trigger permission request screens
    markPrayerComplete,    // Function to record successful prayer completion
    markPrayerSkipped,     // Function to record a skipped prayer
    snoozeFor2Minutes,     // Function to hide the overlay briefly
  };
}
