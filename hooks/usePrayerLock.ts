import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import * as Notifications from "expo-notifications";
import { doc, increment, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
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
 * AsyncStorage key for prayers marked complete this session (before Firestore catches up).
 * Format: ["PrayerName|YYYY-MM-DD", ...]
 */
const COMPLETED_PRAYER_KEYS = "prayer_lock_completed_keys";

function prayerSessionKey(name: string, date: string): string {
  return `${name}|${date}`;
}

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
  /** `prayerDate` is the `prayer_logs` doc id (YYYY-MM-DD) for this slot — required when the same name appears twice (e.g. overnight Isha). */
  onShowOverlay: (prayerName: string, prayerEnd: string, prayerDate: string) => void;
};

/**
 * Determines if the current time falls within the restriction window of any prayer.
 *
 * @param prayers - Array of prayer objects with times.
 * @returns The active Prayer object if within the window, otherwise null.
 */
function getActivePrayer(
  prayers: Prayer[],
  completedKeys?: Set<string>,
): Prayer | null {
  const now = dayjs();
  const today = now.format("YYYY-MM-DD");

  for (const prayer of prayers) {
    const prayerDate = prayer.date || today;
    if (
      completedKeys?.has(prayerSessionKey(prayer.name, prayerDate))
    ) {
      continue;
    }

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
  const completedKeysRef = useRef<Set<string>>(new Set());
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const recordPrayerSessionComplete = useCallback(
    async (prayerName: string, prayerDate: string) => {
      const key = prayerSessionKey(prayerName, prayerDate);
      completedKeysRef.current.add(key);

      try {
        const stored = await AsyncStorage.getItem(COMPLETED_PRAYER_KEYS);
        const keys: string[] = stored ? JSON.parse(stored) : [];
        if (!keys.includes(key)) {
          keys.push(key);
          await AsyncStorage.setItem(COMPLETED_PRAYER_KEYS, JSON.stringify(keys));
        }
      } catch (e) {
        console.warn("[usePrayerLock] Failed to persist completed key:", e);
      }

      if (Platform.OS === "android") {
        try {
          const { markPrayerSessionComplete } =
            await import("../modules/prayer-lock");
          markPrayerSessionComplete(prayerName, prayerDate);
        } catch (e) {
          console.warn("[usePrayerLock] Native session complete failed:", e);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const loadCompletedKeys = async () => {
      try {
        const stored = await AsyncStorage.getItem(COMPLETED_PRAYER_KEYS);
        if (!stored) return;
        const keys: string[] = JSON.parse(stored);
        const today = dayjs().format("YYYY-MM-DD");
        const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
        const valid = keys.filter((k) => {
          const date = k.split("|")[1];
          return date === today || date === yesterday;
        });
        completedKeysRef.current = new Set(valid);
        if (valid.length !== keys.length) {
          await AsyncStorage.setItem(
            COMPLETED_PRAYER_KEYS,
            JSON.stringify(valid),
          );
        }
      } catch (e) {
        console.warn("[usePrayerLock] Failed to load completed keys:", e);
      }
    };
    loadCompletedKeys();
  }, []);

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
    if (AppState.currentState !== "active") return;
    if (!uid || Platform.OS !== "android") return;

    // 1. Check if the user has snoozed the overlay recently
    const snoozedUntil = await AsyncStorage.getItem(OVERLAY_SNOOZED_KEY);
    if (snoozedUntil && dayjs().isBefore(dayjs(snoozedUntil))) return;

    // 2. Identify if we are currently in a prayer restriction window
    const activePrayer = getActivePrayer(prayers, completedKeysRef.current);
    if (!activePrayer) return;

    try {
      // 3. Query the native module for the current foreground application
      const { getForegroundApp } = await import("../modules/prayer-lock");
      const foregroundApp = await getForegroundApp();

      console.log(`[usePrayerLock] Foreground app: ${foregroundApp}`);


      const isBlockedApps =
        foregroundApp && BLOCKED_APPS.includes(foregroundApp);

      // 4. Trigger the overlay if the foreground app is in our blocked list
      if (isBlockedApps) {
        console.log(`[usePrayerLock] Blocking app: ${foregroundApp} for prayer: ${activePrayer.name}`);
        onShowOverlay(
          activePrayer.name,
          activePrayer.end,
          activePrayer.date || dayjs().format("YYYY-MM-DD"),
        );
      }
    } catch (e) {
      console.warn("[PrayerLock] Could not get foreground app:", e);
    }
  }, [uid, prayers, onShowOverlay]);

  // Schedule Local Notifications for Prayer Times
  useEffect(() => {
    const schedulePrayerNotifications = async () => {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();

        const now = dayjs();
        for (const prayer of prayers) {
          if (prayer.isPrayed || prayer.skipped || !prayer.time) continue;

          const baseDate = prayer.date || now.format("YYYY-MM-DD");
          const prayerTime = dayjs(`${baseDate} ${prayer.time}`);

          if (prayerTime.isAfter(now)) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `${prayer.name} Prayer Time`,
                body: `It is now time for ${prayer.name} prayer.`,
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: prayerTime.toDate(),
              },
            });
          }
        }
      } catch (e) {
        console.warn("[usePrayerLock] Failed to schedule notifications:", e);
      }
    };

    schedulePrayerNotifications();
  }, [prayers]);

  // Sync with Native Background Service
  useEffect(() => {
    const syncWithService = async () => {
      const { syncPrayers, startService, stopService } =
        await import("../modules/prayer-lock");

      if (!uid) {
        stopService();
        return;
      }

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
    // Do not call stopService() here. This cleanup runs when the Dashboard unmounts
    // or the process is shutting down; stopping the service would tear down the
    // native foreground monitor the user expects while the app is "closed". Stop
    // only when prayer lock is disabled, permissions fail, or the user logs out
    // (handled in syncWithService / AuthProvider).
  }, [uid, prayers, checkPermissions]);

  // Handle foreground polling and AppState changes
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const startPolling = async (triggerImmediately = false) => {
      if (AppState.currentState !== "active") {
        console.log("[usePrayerLock] startPolling called but AppState is not active. Skipping.");
        return;
      }

      const enabledVal = await AsyncStorage.getItem(PRAYER_LOCK_ENABLED_KEY);
      const isEnabled = enabledVal === null || enabledVal === "true"; // Default to true if not set

      if (!uid || !isEnabled) {
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
        const { wasLaunchedFromOverlay, getOverlayLaunchPayload } =
          await import("../modules/prayer-lock");

        if (wasLaunchedFromOverlay()) {
          const payload = getOverlayLaunchPayload();
          const launchName = payload?.prayerName;
          const launchDate =
            payload?.prayerDate || dayjs().format("YYYY-MM-DD");
          const launchEnd = payload?.prayerEnd;

          const launchAlreadyCompleted =
            !!launchName &&
            completedKeysRef.current.has(
              prayerSessionKey(launchName, launchDate),
            );

          if (launchAlreadyCompleted) {
            // Native may have launched us before prefs updated; prayer is already done.
            return;
          }

          if (launchName && launchEnd) {
            onShowOverlay(launchName, launchEnd, launchDate);
          } else {
            checkAndTrigger();
          }
        } else {
          checkAndTrigger();
        }
      }

      // Poll every 4 seconds for continued monitoring while in foreground
      if (!intervalRef.current) {
        intervalRef.current = setInterval(checkAndTrigger, 4000);
      }
    };

    startPolling(true);

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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [uid, prayers, onShowOverlay, checkPermissions, checkAndTrigger]);

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
    async (prayerName: string, prayerLogDate?: string) => {
      if (!uid || !prayerName) return;

      const targetDate =
        prayerLogDate ||
        prayers.filter((p) => p.name === prayerName).pop()?.date ||
        dayjs().format("YYYY-MM-DD");

      // Stop native + JS blocking immediately (before Firestore / dashboard refresh).
      await recordPrayerSessionComplete(prayerName, targetDate);

      const updatedPrayers = prayers.map((p) =>
        p.name === prayerName && p.date === targetDate
          ? { ...p, isPrayed: true, skipped: false }
          : p,
      );
      await syncImmediately(updatedPrayers);

      const prayerKey = prayerName.toLowerCase();
      console.log(
        `[usePrayerLock] Marking ${prayerName} as COMPLETE for ${targetDate}`,
      );

      try {
        await updateDoc(doc(db, "users", uid, "prayer_logs", targetDate), {
          [`prayers.${prayerKey}.isPrayed`]: true,
          [`prayers.${prayerKey}.status`]: "completed",
          [`prayers.${prayerKey}.completedAt`]: serverTimestamp(),
          [`prayers.${prayerKey}.skippedAt`]: null,
          prayerCount: increment(1),
        });
      } catch (_e) {
        await setDoc(
          doc(db, "users", uid, "prayer_logs", targetDate),
          {
            prayers: {
              [prayerKey]: {
                isPrayed: true,
                status: "completed",
                completedAt: serverTimestamp(),
                skippedAt: null,
              },
            },
            prayerCount: 1,
          },
          { merge: true },
        );
      }
      await AsyncStorage.removeItem(OVERLAY_SNOOZED_KEY);

      await updateUserStreaks(uid, targetDate);
    },
    [uid, prayers, syncImmediately, recordPrayerSessionComplete],
  );

  /**
   * Marks a prayer as skipped in Firestore and sets a 30-minute reminder.
   * After 30 minutes, the overlay will show again to remind the user.
   */
  const markPrayerSkipped = useCallback(
    async (prayerName: string, prayerLogDate?: string) => {
      if (!uid || !prayerName) return;

      const targetDate =
        prayerLogDate ||
        prayers.filter((p) => p.name === prayerName).pop()?.date ||
        dayjs().format("YYYY-MM-DD");

      const updatedPrayers = prayers.map((p) =>
        p.name === prayerName && p.date === targetDate
          ? { ...p, isPrayed: false, skipped: true }
          : p,
      );
      await syncImmediately(updatedPrayers);

      const prayerKey = prayerName.toLowerCase();
      console.log(
        `[usePrayerLock] Marking ${prayerName} as SKIPPED for ${targetDate}`,
      );

      try {
        await updateDoc(doc(db, "users", uid, "prayer_logs", targetDate), {
          [`prayers.${prayerKey}.skipped`]: true,
          [`prayers.${prayerKey}.isPrayed`]: false,
          [`prayers.${prayerKey}.status`]: "skipped",
          [`prayers.${prayerKey}.skippedAt`]: serverTimestamp(),
          [`prayers.${prayerKey}.completedAt`]: null,
        });
      } catch (_e) {
        await setDoc(
          doc(db, "users", uid, "prayer_logs", targetDate),
          {
            prayers: {
              [prayerKey]: {
                isPrayed: false,
                skipped: true,
                status: "skipped",
                skippedAt: serverTimestamp(),
                completedAt: null,
              },
            },
          },
          { merge: true },
        );
      }

      const reminderTime = dayjs().add(30, "minute").toISOString();

      await AsyncStorage.removeItem(OVERLAY_SNOOZED_KEY);

      try {
        const deadlines = await AsyncStorage.getItem(PRAYER_SKIP_DEADLINES_KEY);
        const deadlineObj = deadlines ? JSON.parse(deadlines) : {};
        const deadlineKey = `${prayerName}|${targetDate}`;
        deadlineObj[deadlineKey] = reminderTime;
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
  const syncSnoozeToNative = useCallback(async (untilIso: string | null) => {
    if (Platform.OS !== "android") return;
    try {
      const { syncOverlaySnooze } = await import("../modules/prayer-lock");
      syncOverlaySnooze(untilIso);
    } catch (e) {
      console.warn("[usePrayerLock] Failed to sync snooze to native:", e);
    }
  }, []);

  const snoozeFor2Minutes = useCallback(async () => {
    const until = dayjs().add(2, "minute").toISOString();
    await AsyncStorage.setItem(OVERLAY_SNOOZED_KEY, until);
    await syncSnoozeToNative(until);
  }, [syncSnoozeToNative]);

  /**
   * Snoozes the overlay until a specific time chosen by the user.
   * The `targetTime` must be a "HH:mm" string. It will be capped at
   * the prayer's end time to prevent indefinite dismissal.
   *
   * @param targetTime - e.g. "14:35"
   * @param prayerEndTime - The prayer's end time "HH:mm" to cap at
   */
  const snoozeUntilTime = useCallback(
    async (targetTime: string, prayerEndTime: string) => {
      const now = dayjs();
      const today = now.format("YYYY-MM-DD");

      let until = dayjs(`${today} ${targetTime}`);
      let end = dayjs(`${today} ${prayerEndTime}`);

      // Handle overnight (e.g. Isha end time is after midnight)
      if (end.isBefore(now)) end = end.add(1, "day");
      if (until.isBefore(now)) until = until.add(1, "day");

      // Cap: never snooze beyond the prayer's end time
      if (until.isAfter(end)) until = end;

      console.log(
        `[usePrayerLock] Snoozing until ${until.format("HH:mm")} (prayer ends ${prayerEndTime})`,
      );
      const untilIso = until.toISOString();
      await AsyncStorage.setItem(OVERLAY_SNOOZED_KEY, untilIso);
      await syncSnoozeToNative(untilIso);
    },
    [syncSnoozeToNative],
  );

  return {
    permissionsGranted, // Whether Android permissions are currently active
    requestAllPermissions, // Function to trigger permission request screens
    markPrayerComplete, // Function to record successful prayer completion
    markPrayerSkipped, // Function to record a skipped prayer
    snoozeFor2Minutes, // Function to hide the overlay briefly
    snoozeUntilTime,  // Function to snooze until a user-chosen time (capped at prayer end)
  };
}
