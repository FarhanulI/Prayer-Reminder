import dayjs from "dayjs";
import { increment, serverTimestamp } from "firebase/firestore";
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { updateUserStreaks } from "../../features/streaks.service";
import { loadPrayerLock } from "./prayer-lock.loader";
import { usePrayerNativeSync } from "./usePrayerNativeSync";
import { usePrayerPermissions } from "./usePrayerPermissions";
import { usePrayerPolling } from "./usePrayerPolling";
import { upsertPrayerLog } from "./utils/prayer.firestore";
import {
  getEffectivePrayerDate,
  getPrayerDate,
  makePrayerSessionKey,
  Prayer,
} from "./utils/prayer.helpers";
import {
  clearSnooze,
  loadCompletedKeys,
  persistCompletedKey,
  PRAYER_LOCK_ENABLED_KEY,
  setSkipDeadline,
  setSnooze,
} from "./utils/prayer.storage";

// Re-export for external callers (e.g. Settings screen) — no import path change needed.
export { PRAYER_LOCK_ENABLED_KEY };
export type { Prayer };

// ─── Hook options ─────────────────────────────────────────────────────────────

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Orchestrates all prayer-lock concerns by composing focused sub-hooks and
 * utility modules. The public API is identical to the original monolithic hook.
 *
 * Sub-hooks:
 *  - {@link usePrayerPermissions}  — Android Usage Stats + Overlay permissions
 *  - {@link usePrayerNativeSync}   — Background service lifecycle + snooze sync
 *  - {@link usePrayerNotifications}— Per-ID notification scheduling
 *  - {@link usePrayerPolling}      — Foreground app detection loop
 */
export function usePrayerLock({
  uid,
  prayers,
  onShowOverlay,
}: UsePrayerLockOptions) {
  // In-memory set of session-completed prayer keys; shared via ref across hooks.
  const completedKeysRef = useRef<Set<string>>(new Set());

  // ── Sub-hooks ─────────────────────────────────────────────────────────────

  const { permissionsGranted, checkPermissions, requestAllPermissions } =
    usePrayerPermissions();

  const { syncImmediately, syncSnoozeToNative } = usePrayerNativeSync(
    uid,
    prayers,
    checkPermissions,
  );

  usePrayerPolling({
    uid,
    prayers,
    completedKeysRef,
    checkPermissions,
    onShowOverlay,
  });

  // ── Completed-key persistence ─────────────────────────────────────────────

  /** Persist a session-complete key to memory + AsyncStorage + native module. */
  const recordPrayerSessionComplete = useCallback(
    async (prayerName: string, prayerDate: string): Promise<void> => {
      const key = makePrayerSessionKey(prayerName, prayerDate);
      completedKeysRef.current.add(key);
      await persistCompletedKey(key);

      if (Platform.OS === "android") {
        try {
          const { markPrayerSessionComplete } = await loadPrayerLock();
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
    loadCompletedKeys().then((keys) => {
      completedKeysRef.current = keys;
    });
  }, []);

  // ── Snooze helpers ────────────────────────────────────────────────────────

  /** Hides the overlay for 2 minutes. */
  const snoozeFor2Minutes = useCallback(async (): Promise<void> => {
    const until = dayjs().add(2, "minute").toISOString();
    await setSnooze(until);
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
      await setSnooze(untilIso);
      await syncSnoozeToNative(untilIso);
    },
    [syncSnoozeToNative],
  );

  // ── Public actions ────────────────────────────────────────────────────────

  /**
   * Records a successful prayer, immediately stops native blocking, and
   * persists to Firestore + streaks.
   */
  const markPrayerComplete = useCallback(
    async (prayerName: string, prayerLogDate?: string): Promise<void> => {
      if (!uid || !prayerName) return;

      // Shared date resolution — no more duplicate findLast (Fix #7)
      const targetDate = getPrayerDate(prayers, prayerName, prayerLogDate);

      // Stop blocking immediately — before Firestore / dashboard refreshes
      await recordPrayerSessionComplete(prayerName, targetDate);

      const updatedPrayers = prayers.map((p) =>
        p.name === prayerName && getEffectivePrayerDate(p) === targetDate
          ? { ...p, isPrayed: true, skipped: false }
          : p,
      );
      await syncImmediately(updatedPrayers);

      const prayerKey = prayerName.toLowerCase();
      console.log(
        `[usePrayerLock] Marking ${prayerName} as COMPLETE for ${targetDate}`,
      );

      await upsertPrayerLog(uid, targetDate, {
        [`prayers.${prayerKey}.isPrayed`]: true,
        [`prayers.${prayerKey}.status`]: "completed",
        [`prayers.${prayerKey}.completedAt`]: serverTimestamp(),
        [`prayers.${prayerKey}.skippedAt`]: null,
        prayerCount: increment(1),
      });

      await clearSnooze();
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

      // Shared date resolution — no more duplicate findLast (Fix #7)
      const targetDate = getPrayerDate(prayers, prayerName, prayerLogDate);

      const updatedPrayers = prayers.map((p) =>
        p.name === prayerName && getEffectivePrayerDate(p) === targetDate
          ? { ...p, isPrayed: false, skipped: true }
          : p,
      );
      await syncImmediately(updatedPrayers);

      const prayerKey = prayerName.toLowerCase();
      console.log(
        `[usePrayerLock] Marking ${prayerName} as SKIPPED for ${targetDate}`,
      );

      await upsertPrayerLog(uid, targetDate, {
        [`prayers.${prayerKey}.skipped`]: true,
        [`prayers.${prayerKey}.isPrayed`]: false,
        [`prayers.${prayerKey}.status`]: "skipped",
        [`prayers.${prayerKey}.skippedAt`]: serverTimestamp(),
        [`prayers.${prayerKey}.completedAt`]: null,
      });

      // 30-minute cooldown — also prunes expired entries (Bug Fix #3)
      await setSkipDeadline(prayerName, targetDate);
      await clearSnooze();

      console.log(
        `[usePrayerLock] 30-minute cooldown set for ${prayerName} (${targetDate})`,
      );
    },
    [uid, prayers, syncImmediately],
  );

  // ── Return value ──────────────────────────────────────────────────────────

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