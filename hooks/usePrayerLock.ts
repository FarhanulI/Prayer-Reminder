import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import * as Notifications from "expo-notifications";
import {
  doc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { updateUserStreaks } from "../features/streaks.service";
import { db } from "../lib/firebase";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Social/entertainment package names that are blocked during prayer windows.
 * Extend this list as needed; keep alphabetically sorted for readability.
 */
const BLOCKED_PACKAGES = new Set([
  "com.android.settings", // Included for simulator testing
  "com.facebook.katana",
  "com.google.android.youtube",
  "com.instagram.android",
  "com.netflix.mediaclient",
  "com.reddit.frontpage",
  "com.snapchat.android",
  "com.twitter.android",
  "com.zhiliaoapp.musically",
]);

const STORAGE_KEYS = {
  OVERLAY_SNOOZED_UNTIL: "overlay_snoozed_until",
  PRAYER_SKIP_DEADLINES: "prayer_skip_deadlines",
  COMPLETED_PRAYER_KEYS: "prayer_lock_completed_keys",
  /** Exported so callers (e.g. settings screen) can read/write this flag. */
  PRAYER_LOCK_ENABLED: "prayer_lock_enabled",
} as const;

export const PRAYER_LOCK_ENABLED_KEY = STORAGE_KEYS.PRAYER_LOCK_ENABLED;

/** How long (ms) the foreground poller fires while the app is active. */
const POLL_INTERVAL_MS = 4_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type Prayer = {
  name: string;
  /** "HH:mm" */
  time: string;
  /** "HH:mm" — end of the restriction window */
  end: string;
  isPrayed?: boolean;
  skipped?: boolean;
  /** "YYYY-MM-DD" — falls back to today when absent */
  date?: string;
};

type UsePrayerLockOptions = {
  uid: string | null;
  prayers: Prayer[];
  /**
   * Called whenever a blocked app is detected in the foreground during a
   * prayer window. `prayerDate` is the Firestore doc-id for this slot (needed
   * when the same prayer name appears twice, e.g. overnight Isha).
   */
  onShowOverlay: (
    prayerName: string,
    prayerEnd: string,
    prayerDate: string,
  ) => void;
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Stable key used to de-duplicate completed prayers across sessions. */
function makePrayerSessionKey(name: string, date: string): string {
  return `${name}|${date}`;
}

/** Returns true if the given package is in the blocked list. */
function isBlockedPackage(packageName: string | null | undefined): boolean {
  return !!packageName && BLOCKED_PACKAGES.has(packageName);
}

/**
 * Returns the first prayer whose time window contains `now` and that has not
 * been prayed/skipped/session-completed.
 */
function getActivePrayer(
  prayers: Prayer[],
  completedKeys: Set<string>,
): Prayer | null {
  const now = dayjs();
  const today = now.format("YYYY-MM-DD");

  for (const prayer of prayers) {
    const prayerDate = prayer.date ?? today;

    // Skip if already handled
    if (prayer.isPrayed || prayer.skipped) continue;
    if (completedKeys.has(makePrayerSessionKey(prayer.name, prayerDate))) continue;
    if (!prayer.time || !prayer.end) continue;

    const startTime = dayjs(`${prayerDate} ${prayer.time}`);
    let endTime = dayjs(`${prayerDate} ${prayer.end}`);

    // Handle overnight windows (e.g. Isha ending after midnight)
    if (endTime.isBefore(startTime)) endTime = endTime.add(1, "day");

    if (
      (now.isSame(startTime) || now.isAfter(startTime)) &&
      now.isBefore(endTime)
    ) {
      console.log(
        `[usePrayerLock] Active prayer: ${prayer.name} (${prayer.time}–${prayer.end})`,
      );
      return prayer;
    }
  }

  return null;
}

// ─── Firestore helpers ────────────────────────────────────────────────────────

type PrayerLogPatch = Record<string, unknown>;

/**
 * Attempts an `updateDoc`; falls back to a merged `setDoc` on missing-document
 * errors (first-time log creation).
 */
async function upsertPrayerLog(
  uid: string,
  date: string,
  patch: PrayerLogPatch,
): Promise<void> {
  const ref = doc(db, "users", uid, "prayer_logs", date);
  try {
    await updateDoc(ref, patch);
  } catch {
    // Document may not exist yet — reconstruct a minimal shape from the patch.
    await setDoc(ref, patch, { merge: true });
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePrayerLock({
  uid,
  prayers,
  onShowOverlay,
}: UsePrayerLockOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedKeysRef = useRef<Set<string>>(new Set());
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // ── Completed-keys persistence ─────────────────────────────────────────────

  /** Persist a session-complete key to memory + AsyncStorage + native module. */
  const recordPrayerSessionComplete = useCallback(
    async (prayerName: string, prayerDate: string): Promise<void> => {
      const key = makePrayerSessionKey(prayerName, prayerDate);
      completedKeysRef.current.add(key);

      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.COMPLETED_PRAYER_KEYS);
        const keys: string[] = raw ? JSON.parse(raw) : [];
        if (!keys.includes(key)) {
          await AsyncStorage.setItem(
            STORAGE_KEYS.COMPLETED_PRAYER_KEYS,
            JSON.stringify([...keys, key]),
          );
        }
      } catch (e) {
        console.warn("[usePrayerLock] Failed to persist completed key:", e);
      }

      if (Platform.OS === "android") {
        try {
          const { markPrayerSessionComplete } = await import("../modules/prayer-lock");
          markPrayerSessionComplete(prayerName, prayerDate);
        } catch (e) {
          console.warn("[usePrayerLock] Native session complete failed:", e);
        }
      }
    },
    [],
  );

  /** Load and prune completed keys on mount (keep today + yesterday only). */
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.COMPLETED_PRAYER_KEYS);
        if (!raw) return;

        const today = dayjs().format("YYYY-MM-DD");
        const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");

        const all: string[] = JSON.parse(raw);
        const valid = all.filter((k) => {
          const date = k.split("|")[1];
          return date === today || date === yesterday;
        });

        completedKeysRef.current = new Set(valid);

        if (valid.length !== all.length) {
          await AsyncStorage.setItem(
            STORAGE_KEYS.COMPLETED_PRAYER_KEYS,
            JSON.stringify(valid),
          );
        }
      } catch (e) {
        console.warn("[usePrayerLock] Failed to load completed keys:", e);
      }
    };
    load();
  }, []);

  // ── Permissions ────────────────────────────────────────────────────────────

  /** Returns true only if both Usage Stats and Overlay permissions are granted. */
  const checkPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== "android") return false;
    try {
      const { hasUsageStatsPermission, hasOverlayPermission } =
        await import("../modules/prayer-lock");
      return (await hasUsageStatsPermission()) && (await hasOverlayPermission());
    } catch {
      return false;
    }
  }, []);

  /** Opens the relevant Android settings screens to request missing permissions. */
  const requestAllPermissions = useCallback(async (): Promise<void> => {
    if (Platform.OS !== "android") return;
    try {
      const {
        hasUsageStatsPermission,
        openUsageAccessSettings,
        hasOverlayPermission,
        requestOverlayPermission,
      } = await import("../modules/prayer-lock");

      if (!(await hasUsageStatsPermission())) openUsageAccessSettings();
      if (!(await hasOverlayPermission())) requestOverlayPermission();
    } catch (e) {
      console.warn("[usePrayerLock] Native module not available:", e);
    }
  }, []);

  // ── Native service sync ────────────────────────────────────────────────────

  /**
   * Push the latest prayer list to the native background service.
   * Calling this immediately (before Firestore propagates) prevents
   * the overlay from re-triggering after a complete/skip action.
   */
  const syncImmediately = useCallback(async (updatedPrayers: Prayer[]): Promise<void> => {
    if (Platform.OS !== "android") return;
    try {
      const { syncPrayers, startService } = await import("../modules/prayer-lock");
      const formatted = updatedPrayers.map((p) => ({
        name: p.name,
        time: p.time,
        end: p.end,
        date: p.date ?? dayjs().format("YYYY-MM-DD"),
        isPrayed: p.isPrayed ?? false,
        completed: p.isPrayed ?? false, // Legacy native field
        skipped: p.skipped ?? false,
      }));
      syncPrayers(JSON.stringify(formatted));
      startService();
    } catch (e) {
      console.warn("[usePrayerLock] Instant sync failed:", e);
    }
  }, []);

  /** Keep the native service in sync whenever uid or prayers change. */
  useEffect(() => {
    let active = true;

    const sync = async () => {
      const { syncPrayers, startService, stopService } =
        await import("../modules/prayer-lock");

      if (!active) return;

      if (!uid) {
        stopService();
        return;
      }

      const enabledVal = await AsyncStorage.getItem(STORAGE_KEYS.PRAYER_LOCK_ENABLED);
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

      const formatted = prayers.map((p) => ({
        name: p.name,
        time: p.time,
        end: p.end,
        date: p.date ?? dayjs().format("YYYY-MM-DD"),
        isPrayed: p.isPrayed ?? false,
        completed: p.isPrayed ?? false,
        skipped: p.skipped ?? false,
      }));

      syncPrayers(JSON.stringify(formatted));
      startService();
    };

    if (Platform.OS === "android") sync();

    // NOTE: We intentionally do NOT stop the service in cleanup — the native
    // foreground monitor must outlive Dashboard unmounts. Stop only on logout
    // or when prayer lock is disabled (handled inside `sync` above).
    return () => {
      active = false;
    };
  }, [uid, prayers, checkPermissions]);

  // ── Snooze helpers ─────────────────────────────────────────────────────────

  const syncSnoozeToNative = useCallback(async (untilIso: string | null): Promise<void> => {
    if (Platform.OS !== "android") return;
    try {
      const { syncOverlaySnooze } = await import("../modules/prayer-lock");
      syncOverlaySnooze(untilIso);
    } catch (e) {
      console.warn("[usePrayerLock] Failed to sync snooze to native:", e);
    }
  }, []);

  const snoozeFor2Minutes = useCallback(async (): Promise<void> => {
    const until = dayjs().add(2, "minute").toISOString();
    await AsyncStorage.setItem(STORAGE_KEYS.OVERLAY_SNOOZED_UNTIL, until);
    await syncSnoozeToNative(until);
  }, [syncSnoozeToNative]);

  /**
   * Snoozes the overlay until `targetTime` ("HH:mm"), capped at `prayerEndTime`
   * so the prayer window can never be silently bypassed.
   */
  const snoozeUntilTime = useCallback(
    async (targetTime: string, prayerEndTime: string): Promise<void> => {
      const now = dayjs();
      const today = now.format("YYYY-MM-DD");

      let until = dayjs(`${today} ${targetTime}`);
      let end = dayjs(`${today} ${prayerEndTime}`);

      // Handle overnight end times
      if (end.isBefore(now)) end = end.add(1, "day");
      if (until.isBefore(now)) until = until.add(1, "day");

      // Never snooze past prayer end
      if (until.isAfter(end)) until = end;

      console.log(
        `[usePrayerLock] Snoozing until ${until.format("HH:mm")} (prayer ends ${prayerEndTime})`,
      );

      const untilIso = until.toISOString();
      await AsyncStorage.setItem(STORAGE_KEYS.OVERLAY_SNOOZED_UNTIL, untilIso);
      await syncSnoozeToNative(untilIso);
    },
    [syncSnoozeToNative],
  );

  // ── Core check-and-trigger ─────────────────────────────────────────────────

  const checkAndTrigger = useCallback(async (): Promise<void> => {
    if (AppState.currentState !== "active") return;
    if (!uid || Platform.OS !== "android") return;

    // Respect global snooze
    const snoozedUntil = await AsyncStorage.getItem(STORAGE_KEYS.OVERLAY_SNOOZED_UNTIL);
    if (snoozedUntil && dayjs().isBefore(dayjs(snoozedUntil))) return;

    // Also respect per-prayer skip deadlines
    const rawDeadlines = await AsyncStorage.getItem(STORAGE_KEYS.PRAYER_SKIP_DEADLINES);
    const skipDeadlines: Record<string, string> = rawDeadlines
      ? JSON.parse(rawDeadlines)
      : {};

    const activePrayer = getActivePrayer(prayers, completedKeysRef.current);
    if (!activePrayer) return;

    const today = dayjs().format("YYYY-MM-DD");
    const prayerDate = activePrayer.date ?? today;
    const deadlineKey = `${activePrayer.name}|${prayerDate}`;
    const skipDeadline = skipDeadlines[deadlineKey];

    if (skipDeadline && dayjs().isBefore(dayjs(skipDeadline))) {
      console.log(
        `[usePrayerLock] ${activePrayer.name} is in skip cooldown until ${skipDeadline}`,
      );
      return;
    }

    try {
      const { getForegroundApp } = await import("../modules/prayer-lock");
      const foregroundApp = await getForegroundApp();
      console.log(`[usePrayerLock] Foreground app: ${foregroundApp}`);

      if (isBlockedPackage(foregroundApp)) {
        console.log(
          `[usePrayerLock] Blocking "${foregroundApp}" for ${activePrayer.name}`,
        );
        onShowOverlay(activePrayer.name, activePrayer.end, prayerDate);
      }
    } catch (e) {
      console.warn("[usePrayerLock] Could not get foreground app:", e);
    }
  }, [uid, prayers, onShowOverlay]);

  // ── Foreground polling + AppState handling ─────────────────────────────────

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const startPolling = async (triggerImmediately = false): Promise<void> => {
      if (AppState.currentState !== "active") return;

      const enabledVal = await AsyncStorage.getItem(STORAGE_KEYS.PRAYER_LOCK_ENABLED);
      const isEnabled = enabledVal === null || enabledVal === "true";

      if (!uid || !isEnabled) {
        stopPolling();
        return;
      }

      const granted = await checkPermissions();
      setPermissionsGranted(granted);
      if (!granted) return;

      if (triggerImmediately) {
        const { wasLaunchedFromOverlay, getOverlayLaunchPayload } =
          await import("../modules/prayer-lock");

        if (wasLaunchedFromOverlay()) {
          const payload = getOverlayLaunchPayload();
          const launchName = payload?.prayerName;
          const launchDate = payload?.prayerDate ?? dayjs().format("YYYY-MM-DD");
          const launchEnd = payload?.prayerEnd;

          const alreadyDone =
            !!launchName &&
            completedKeysRef.current.has(
              makePrayerSessionKey(launchName, launchDate),
            );

          if (!alreadyDone && launchName && launchEnd) {
            onShowOverlay(launchName, launchEnd, launchDate);
          } else if (!alreadyDone) {
            checkAndTrigger();
          }
        } else {
          checkAndTrigger();
        }
      }

      if (!intervalRef.current) {
        intervalRef.current = setInterval(checkAndTrigger, POLL_INTERVAL_MS);
      }
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    startPolling(true);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        startPolling(true);
      } else {
        // JS timers pause in the background; native service takes over.
        stopPolling();
      }
    });

    return () => {
      sub.remove();
      stopPolling();
    };
  }, [uid, prayers, onShowOverlay, checkPermissions, checkAndTrigger]);

  // ── Notification scheduling ────────────────────────────────────────────────

  useEffect(() => {
    const schedule = async () => {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        const now = dayjs();

        for (const prayer of prayers) {
          if (prayer.isPrayed || prayer.skipped || !prayer.time) continue;

          const baseDate = prayer.date ?? now.format("YYYY-MM-DD");
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

    schedule();

    return () => {
      // Cancel stale notifications when prayers update or component unmounts
      Notifications.cancelAllScheduledNotificationsAsync().catch(() => { });
    };
  }, [prayers]);

  // ── Public actions ─────────────────────────────────────────────────────────

  /**
   * Records a successful prayer, immediately stops native blocking, and
   * persists to Firestore + streaks.
   */
  const markPrayerComplete = useCallback(
    async (prayerName: string, prayerLogDate?: string): Promise<void> => {
      if (!uid || !prayerName) return;

      const targetDate =
        prayerLogDate ??
        prayers.findLast((p) => p.name === prayerName)?.date ??
        dayjs().format("YYYY-MM-DD");

      // Stop blocking immediately — before Firestore / dashboard refreshes
      await recordPrayerSessionComplete(prayerName, targetDate);

      const updatedPrayers = prayers.map((p) =>
        p.name === prayerName && (p.date ?? dayjs().format("YYYY-MM-DD")) === targetDate
          ? { ...p, isPrayed: true, skipped: false }
          : p,
      );
      await syncImmediately(updatedPrayers);

      const prayerKey = prayerName.toLowerCase();
      console.log(`[usePrayerLock] Marking ${prayerName} as COMPLETE for ${targetDate}`);

      await upsertPrayerLog(uid, targetDate, {
        [`prayers.${prayerKey}.isPrayed`]: true,
        [`prayers.${prayerKey}.status`]: "completed",
        [`prayers.${prayerKey}.completedAt`]: serverTimestamp(),
        [`prayers.${prayerKey}.skippedAt`]: null,
        prayerCount: increment(1),
      });

      await AsyncStorage.removeItem(STORAGE_KEYS.OVERLAY_SNOOZED_UNTIL);
      await updateUserStreaks(uid, targetDate);
    },
    [uid, prayers, syncImmediately, recordPrayerSessionComplete],
  );

  /**
   * Records a skipped prayer, starts a 30-minute cooldown before the overlay
   * can reappear for this prayer, and persists to Firestore.
   */
  const markPrayerSkipped = useCallback(
    async (prayerName: string, prayerLogDate?: string): Promise<void> => {
      if (!uid || !prayerName) return;

      const targetDate =
        prayerLogDate ??
        prayers.findLast((p) => p.name === prayerName)?.date ??
        dayjs().format("YYYY-MM-DD");

      const updatedPrayers = prayers.map((p) =>
        p.name === prayerName && (p.date ?? dayjs().format("YYYY-MM-DD")) === targetDate
          ? { ...p, isPrayed: false, skipped: true }
          : p,
      );
      await syncImmediately(updatedPrayers);

      const prayerKey = prayerName.toLowerCase();
      console.log(`[usePrayerLock] Marking ${prayerName} as SKIPPED for ${targetDate}`);

      await upsertPrayerLog(uid, targetDate, {
        [`prayers.${prayerKey}.skipped`]: true,
        [`prayers.${prayerKey}.isPrayed`]: false,
        [`prayers.${prayerKey}.status`]: "skipped",
        [`prayers.${prayerKey}.skippedAt`]: serverTimestamp(),
        [`prayers.${prayerKey}.completedAt`]: null,
      });

      // Set a 30-minute cooldown so the overlay doesn't immediately re-fire
      const deadlineKey = `${prayerName}|${targetDate}`;
      const reminderTime = dayjs().add(30, "minute").toISOString();

      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.PRAYER_SKIP_DEADLINES);
        const deadlines: Record<string, string> = raw ? JSON.parse(raw) : {};
        deadlines[deadlineKey] = reminderTime;
        await AsyncStorage.setItem(
          STORAGE_KEYS.PRAYER_SKIP_DEADLINES,
          JSON.stringify(deadlines),
        );
      } catch (e) {
        console.warn("[usePrayerLock] Failed to set skip deadline:", e);
      }

      await AsyncStorage.removeItem(STORAGE_KEYS.OVERLAY_SNOOZED_UNTIL);

      console.log(
        `[usePrayerLock] 30-minute cooldown set for ${prayerName}, expires ${reminderTime}`,
      );
    },
    [uid, prayers, syncImmediately],
  );

  // ── Return value ───────────────────────────────────────────────────────────

  return {
    /** Whether both Android Usage Stats and Overlay permissions are active. */
    permissionsGranted,
    /** Opens Android settings screens to request any missing permissions. */
    requestAllPermissions,
    /** Records a successful prayer completion. */
    markPrayerComplete,
    /** Records a skipped prayer and starts a 30-minute overlay cooldown. */
    markPrayerSkipped,
    /** Hides the overlay for 2 minutes. */
    snoozeFor2Minutes,
    /** Hides the overlay until a user-chosen time, capped at prayer end. */
    snoozeUntilTime,
  };
}