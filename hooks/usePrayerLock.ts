import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { updateUserStreaks } from "../features/streaks.service";
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
  "com.android.settings", // Added for simulator testing
];

/**
 * AsyncStorage key used to store the timestamp until which the overlay is snoozed.
 */
const OVERLAY_SNOOZED_KEY = "overlay_snoozed_until";

/**
 * AsyncStorage key used to store skip deadlines for each prayer.
 * Format: { "prayerName": "ISO_TIMESTAMP" }
 * When a prayer is skipped, it remains blocked for 30 minutes.
 * After 30 minutes, if not prayed, it can be skipped again or prayed.
 */
const PRAYER_SKIP_DEADLINES_KEY = "prayer_skip_deadlines";

/**
 * AsyncStorage key used to determine if the prayer lock functionality is globally enabled.
 */
export const PRAYER_LOCK_ENABLED_KEY = "prayer_lock_enabled";

/**
 * Represents a prayer with its name and scheduled time.
 */
type Prayer = {
  name: string;
  time: string; // Expected format: "HH:mm"
  end: string; // Expected format: "HH:mm"
  isPrayed?: boolean;
  skipped?: boolean;
  date?: string; // Optional: "YYYY-MM-DD"
};

/**
 * Configuration options for the usePrayerLock hook.
 */
type UsePrayerLockOptions = {
  uid: string | null; // Authenticated user ID
  prayers: Prayer[]; // List of prayer times for the day
  onShowOverlay: (prayerName: string, prayerEnd: string) => void; // Callback to trigger the UI overlay
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
    if (
      !prayer.time ||
      !prayer.end ||
      prayer.isPrayed ||
      (prayer as any).skipped
    ) {
      continue;
    }

    const baseDate = prayer.date || today;
    const startTime = dayjs(`${baseDate} ${prayer.time}`);
    const endTime = dayjs(`${baseDate} ${prayer.end}`);

    let adjustedEnd = endTime;
    if (endTime.isBefore(startTime)) {
      adjustedEnd = endTime.add(1, "day");
    }

    if (
      now.isSame(startTime) ||
      (now.isAfter(startTime) && now.isBefore(adjustedEnd))
    ) {
      console.log(`[usePrayerLock] Active prayer found: ${prayer.name} (${prayer.time} - ${prayer.end})`);
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
export function usePrayerLock({
  uid,
  prayers,
  onShowOverlay,
}: UsePrayerLockOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  /**
   * Checks both Usage Stats and Overlay permissions.
   */
  const checkPermissions = useCallback(async () => {
    if (Platform.OS !== "android") return false;
    try {
      const { hasUsageStatsPermission, hasOverlayPermission } =
        await import("../modules/prayer-lock");
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
      const {
        hasUsageStatsPermission,
        openUsageAccessSettings,
        hasOverlayPermission,
        requestOverlayPermission,
      } = await import("../modules/prayer-lock");

      if (!hasUsageStatsPermission()) openUsageAccessSettings();
      if (!hasOverlayPermission()) requestOverlayPermission();
    } catch (e) {
      console.warn("[PrayerLock] Native module not available:", e);
    }
  }, []);

  /**
   * The core logic to check if a blocked app is in the foreground during a prayer window.
   * Also handles 30-minute reminders after skip.
   */
  const checkAndTrigger = useCallback(async () => {
    if (!uid || Platform.OS !== "android") return;

    // 1. Check if the user has snoozed the overlay recently
    const snoozedUntil = await AsyncStorage.getItem(OVERLAY_SNOOZED_KEY);
    if (snoozedUntil && dayjs().isBefore(dayjs(snoozedUntil))) return;

    // 1.5. Check for skip deadline reminders (30-minute reminders after skipping)
    try {
      const deadlines = await AsyncStorage.getItem(PRAYER_SKIP_DEADLINES_KEY);
      if (deadlines) {
        const deadlineObj = JSON.parse(deadlines);
        const now = dayjs();

        // Check each prayer's skip deadline
        for (const [prayerName, deadline] of Object.entries(deadlineObj)) {
          if (now.isAfter(dayjs(deadline as string))) {
            // 30 minutes have passed since skip, show reminder
            const prayer = prayers.find((p) => p.name === prayerName);
            if (prayer && prayer.end) {
              console.log(
                `[usePrayerLock] 30-minute skip reminder triggered for ${prayerName}`,
              );
              onShowOverlay(prayerName, prayer.end);
              // Clear this deadline after showing reminder
              delete deadlineObj[prayerName];
              await AsyncStorage.setItem(
                PRAYER_SKIP_DEADLINES_KEY,
                JSON.stringify(deadlineObj),
              );
              return; // Show only one reminder at a time
            }
          }
        }
      }
    } catch (e) {
      console.warn("[usePrayerLock] Error checking skip deadlines:", e);
    }

    // 2. Identify if we are currently in a prayer restriction window
    const activePrayer = getActivePrayer(prayers);
    if (!activePrayer) return;

    try {
      // 3. Query the native module for the current foreground application
      const { getForegroundApp } = await import("../modules/prayer-lock");
      const foregroundApp = getForegroundApp();
      
      if (foregroundApp) {
        console.log(`[usePrayerLock] Foreground app: ${foregroundApp}`);
      }

      const isBlockedApps =
        foregroundApp && BLOCKED_APPS.includes(foregroundApp);

      // 4. Trigger the overlay if the foreground app is in our blocked list
      if (isBlockedApps) {
        console.log(`[usePrayerLock] Blocking app: ${foregroundApp} for prayer: ${activePrayer.name}`);
        onShowOverlay(activePrayer.name, activePrayer.end);
      }
    } catch (e) {
      console.warn("[PrayerLock] Could not get foreground app:", e);
    }
  }, [uid, prayers, onShowOverlay]);

  // Sync with Native Background Service
  useEffect(() => {
    if (Platform.OS !== "android" || !uid) return;

    const syncWithService = async () => {
      const { syncPrayers, startService, stopService } =
        await import("../modules/prayer-lock");

      const enabledVal = await AsyncStorage.getItem(PRAYER_LOCK_ENABLED_KEY);
      const isEnabled = enabledVal === null || enabledVal === "true";

      if (!isEnabled) {
        stopService();
        return;
      }

      const granted = await checkPermissions();
      if (!granted) {
        stopService();
        return;
      }

      // Format prayers for the native service
      const formattedPrayers = prayers.map((p) => ({
        name: p.name,
        time: p.time,
        end: p.end,
        date: p.date || dayjs().format("YYYY-MM-DD"),
        isPrayed: p.isPrayed || false,
        completed: p.isPrayed || false, // Support legacy native code
        skipped: p.skipped || false,
      }));

      syncPrayers(JSON.stringify(formattedPrayers));
      startService();
    };

    syncWithService();
  }, [uid, prayers, checkPermissions]);

  // Handle foreground polling and AppState changes
  useEffect(() => {
    if (!uid) return;

    const startPolling = async (triggerImmediately = false) => {
      const enabledVal = await AsyncStorage.getItem(PRAYER_LOCK_ENABLED_KEY);
      const isEnabled = enabledVal === null || enabledVal === "true"; // Default to true if not set

      if (!isEnabled) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      const granted = await checkPermissions();
      setPermissionsGranted(granted);

      // Only start the interval if we have the required native permissions
      if (!granted) return;

      // KEY FIX: When the app returns to foreground, fire the check immediately
      // instead of waiting up to 4 seconds for the first interval tick.
      // This ensures the overlay shows right away if the user was on a blocked app.
      if (triggerImmediately) {
        const { wasLaunchedFromOverlay } =
          await import("../modules/prayer-lock");
        const activePrayer = getActivePrayer(prayers);

        if (wasLaunchedFromOverlay() && activePrayer) {
          onShowOverlay(activePrayer.name, activePrayer.end);
        } else {
          checkAndTrigger();
        }
      }

      // Poll every 4 seconds for continued monitoring while in foreground
      if (!intervalRef.current) {
        intervalRef.current = setInterval(checkAndTrigger, 4000);
      }
    };

    startPolling();

    // Re-check/restart polling when the app comes back to the foreground.
    // Pass triggerImmediately=true so the overlay fires at once if needed.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        startPolling(true);
      } else {
        // Clear the interval when backgrounded — JS timers are paused anyway.
        // The Native Service will take over monitoring in the background.
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    });

    return () => {
      sub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [uid, checkPermissions, checkAndTrigger]);

  /**
   * Helper to immediately update the native service without waiting for Firestore.
   * This prevents race conditions where the overlay might re-trigger during the DB update.
   */
  const syncImmediately = useCallback(async (updatedPrayers: Prayer[]) => {
    if (Platform.OS !== "android") return;
    try {
      const { syncPrayers, startService } =
        await import("../modules/prayer-lock");
      const formatted = updatedPrayers.map((p) => ({
        name: p.name,
        time: p.time,
        end: p.end,
        date: p.date || dayjs().format("YYYY-MM-DD"),
        isPrayed: p.isPrayed || false,
        completed: p.isPrayed || false,
        skipped: p.skipped || false,
      }));
      syncPrayers(JSON.stringify(formatted));
      startService();
    } catch (e) {
      console.warn("[usePrayerLock] Instant sync failed:", e);
    }
  }, []);

  /**
   * Marks a prayer as completed in Firestore and clears any active snooze.
   */
  const markPrayerComplete = useCallback(
    async (prayerName: string) => {
      if (!uid || !prayerName) return;

      const prayer = prayers.find((p) => p.name === prayerName);
      const targetDate = prayer?.date || dayjs().format("YYYY-MM-DD");

      // INSTANT SYNC: Update native service immediately to prevent re-trigger
      const updatedPrayers = prayers.map((p) =>
        p.name === prayerName ? { ...p, isPrayed: true, skipped: false } : p,
      );
      await syncImmediately(updatedPrayers);

      const prayerKey = prayerName.toLowerCase();
      console.log(
        `[usePrayerLock] Marking ${prayerName} as COMPLETE for ${targetDate}`,
      );

      try {
        await updateDoc(doc(db, "users", uid, "prayer_logs", targetDate), {
          [`${prayerKey}.isPrayed`]: true,
          [`${prayerKey}.status`]: "completed",
          [`${prayerKey}.completedAt`]: serverTimestamp(),
          [`${prayerKey}.skippedAt`]: null,
        });
      } catch (_e) {
        await setDoc(
          doc(db, "users", uid, "prayer_logs", targetDate),
          {
            [prayerKey]: {
              isPrayed: true,
              status: "completed",
              completedAt: serverTimestamp(),
              skippedAt: null,
            },
          },
          { merge: true },
        );
      }
      await AsyncStorage.removeItem(OVERLAY_SNOOZED_KEY);
      
      // Update streaks logic
      await updateUserStreaks(uid, targetDate);
    },
    [uid, prayers, syncImmediately],
  );

  /**
   * Marks a prayer as skipped in Firestore and sets a 30-minute reminder.
   * After 30 minutes, the overlay will show again to remind the user.
   */
  const markPrayerSkipped = useCallback(
    async (prayerName: string) => {
      if (!uid || !prayerName) return;

      const prayer = prayers.find((p) => p.name === prayerName);
      const targetDate = prayer?.date || dayjs().format("YYYY-MM-DD");

      // INSTANT SYNC: Update native service immediately to disable app blocking
      const updatedPrayers = prayers.map((p) =>
        p.name === prayerName ? { ...p, isPrayed: false, skipped: true } : p,
      );
      await syncImmediately(updatedPrayers);

      const prayerKey = prayerName.toLowerCase();
      console.log(
        `[usePrayerLock] Marking ${prayerName} as SKIPPED for ${targetDate}`,
      );

      try {
        await updateDoc(doc(db, "users", uid, "prayer_logs", targetDate), {
          [`${prayerKey}.skipped`]: true,
          [`${prayerKey}.isPrayed`]: false,
          [`${prayerKey}.status`]: "skipped",
          [`${prayerKey}.skippedAt`]: serverTimestamp(),
          [`${prayerKey}.completedAt`]: null,
        });
      } catch (_e) {
        await setDoc(
          doc(db, "users", uid, "prayer_logs", targetDate),
          {
            [prayerKey]: {
              isPrayed: false,
              skipped: true,
              status: "skipped",
              skippedAt: serverTimestamp(),
              completedAt: null,
            },
          },
          { merge: true },
        );
      }

      // Set 30-minute reminder
      // This will allow blocked apps to be used now, but show the overlay again after 30 mins
      const reminderTime = dayjs().add(30, "minute").toISOString();

      // Clear any active snooze to ensure clean state
      await AsyncStorage.removeItem(OVERLAY_SNOOZED_KEY);

      // Track skip deadlines for 30-minute reminders
      try {
        const deadlines = await AsyncStorage.getItem(PRAYER_SKIP_DEADLINES_KEY);
        const deadlineObj = deadlines ? JSON.parse(deadlines) : {};
        deadlineObj[prayerName] = reminderTime;
        await AsyncStorage.setItem(
          PRAYER_SKIP_DEADLINES_KEY,
          JSON.stringify(deadlineObj),
        );
      } catch (e) {
        console.warn("[usePrayerLock] Failed to set skip deadline:", e);
      }

      console.log(
        `[usePrayerLock] 30-minute reminder set for ${prayerName}. Overlay will show at ${reminderTime}`,
      );
    },
    [uid, prayers, syncImmediately],
  );

  /**
   * Temporarily disables the overlay for 2 minutes.
   */
  const snoozeFor2Minutes = useCallback(async () => {
    const until = dayjs().add(2, "minute").toISOString();
    await AsyncStorage.setItem(OVERLAY_SNOOZED_KEY, until);
  }, []);

  return {
    permissionsGranted, // Whether Android permissions are currently active
    requestAllPermissions, // Function to trigger permission request screens
    markPrayerComplete, // Function to record successful prayer completion
    markPrayerSkipped, // Function to record a skipped prayer
    snoozeFor2Minutes, // Function to hide the overlay briefly
  };
}
