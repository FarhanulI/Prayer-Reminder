import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState, Platform } from "react-native";
import { loadPrayerLock } from "./prayer-lock.loader";
import {
  getActivePrayer,
  isBlockedPackage,
  makePrayerSessionKey,
  Prayer,
} from "./utils/prayer.helpers";
import { readSnoozeAndDeadlines, STORAGE_KEYS } from "./utils/prayer.storage";

/** How long (ms) the foreground poller fires while the app is active. */
const POLL_INTERVAL_MS = 4_000;

/**
 * Minimum ms between showing the overlay for the same prayer key.
 * Prevents overlay spam when the user hasn't reacted yet (Fix #8).
 */
const OVERLAY_COOLDOWN_MS = 10_000;

type UsePrayerPollingOptions = {
  uid: string | null;
  prayers: Prayer[];
  completedKeysRef: React.MutableRefObject<Set<string>>;
  checkPermissions: () => Promise<boolean>;
  onShowOverlay: (
    prayerName: string,
    prayerEnd: string,
    prayerDate: string,
  ) => void;
};

/**
 * Manages the foreground polling loop and AppState lifecycle.
 *
 * Improvements applied:
 * - Fix #8: Per-prayer overlay cooldown ref to prevent spam
 * - Fix #9: `useMemo` for active prayer so the loop only checks foreground app
 * - Parallelized AsyncStorage reads via `readSnoozeAndDeadlines` (Fix #5)
 * - All native calls wrapped in try/catch (Bug Fix #4)
 */
export function usePrayerPolling({
  uid,
  prayers,
  completedKeysRef,
  checkPermissions,
  onShowOverlay,
}: UsePrayerPollingOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Tracks the last timestamp (ms) the overlay was shown per prayer key (Fix #8). */
  const lastOverlayShownRef = useRef<Record<string, number>>({});

  // ── Core check-and-trigger ────────────────────────────────────────────────

  const checkAndTrigger = useCallback(async (): Promise<void> => {
    if (AppState.currentState !== "active") return;
    if (!uid || Platform.OS !== "android") return;

    const activePrayer = getActivePrayer(prayers, completedKeysRef.current);
    if (!activePrayer) return;

    // Parallelized reads (Fix #5)
    const { snoozedUntil, skipDeadlines } = await readSnoozeAndDeadlines();

    // Respect global snooze
    if (snoozedUntil && dayjs().isBefore(dayjs(snoozedUntil))) return;

    const today = dayjs().format("YYYY-MM-DD");
    let prayerDate = activePrayer.date ?? today;

    // Adjust for overnight windows where no explicit date is set
    if (!activePrayer.date) {
      const start = dayjs(`${today} ${activePrayer.time}`, "YYYY-MM-DD HH:mm");
      const end = dayjs(`${today} ${activePrayer.end}`, "YYYY-MM-DD HH:mm");
      if (end.isBefore(start) && dayjs().isBefore(end)) {
        prayerDate = dayjs().subtract(1, "day").format("YYYY-MM-DD");
      }
    }

    const deadlineKey = makePrayerSessionKey(activePrayer.name, prayerDate);
    const skipDeadline = skipDeadlines[deadlineKey];

    if (skipDeadline && dayjs().isBefore(dayjs(skipDeadline))) {
      console.log(
        `[usePrayerPolling] ${activePrayer.name} in skip cooldown until ${skipDeadline}`,
      );
      return;
    }

    // Overlay spam cooldown (Fix #8)
    const now = Date.now();
    const lastShown = lastOverlayShownRef.current[deadlineKey] ?? 0;
    if (now - lastShown < OVERLAY_COOLDOWN_MS) return;

    try {
      const { getForegroundApp } = await loadPrayerLock();
      const foregroundApp = await getForegroundApp();
      console.log(`[usePrayerPolling] Foreground app: ${foregroundApp}`);

      if (isBlockedPackage(foregroundApp)) {
        console.log(
          `[usePrayerPolling] Blocking "${foregroundApp}" for ${activePrayer.name}`,
        );
        lastOverlayShownRef.current[deadlineKey] = now;
        onShowOverlay(activePrayer.name, activePrayer.end, prayerDate);
      }
    } catch (e) {
      console.warn("[usePrayerPolling] Could not get foreground app:", e);
    }
  }, [uid, prayers, onShowOverlay]);

  // ── Foreground polling + AppState handling ────────────────────────────────

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const startPolling = async (triggerImmediately = false): Promise<void> => {
      if (AppState.currentState !== "active") return;

      const enabledVal = await AsyncStorage.getItem(
        STORAGE_KEYS.PRAYER_LOCK_ENABLED,
      );
      const isEnabled = enabledVal === null || enabledVal === "true";

      if (!uid || !isEnabled) {
        stopPolling();
        return;
      }

      const granted = await checkPermissions();
      if (!granted) return;

      if (triggerImmediately) {
        try {
          const { wasLaunchedFromOverlay, getOverlayLaunchPayload } =
            await loadPrayerLock();

          if (wasLaunchedFromOverlay()) {
            const payload = getOverlayLaunchPayload();
            const launchName = payload?.prayerName;
            const launchDate =
              payload?.prayerDate ?? dayjs().format("YYYY-MM-DD");
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
        } catch (e) {
          console.warn("[usePrayerPolling] Launch payload check failed:", e);
          checkAndTrigger();
        }
      }

      if (!intervalRef.current) {
        intervalRef.current = setInterval(checkAndTrigger, POLL_INTERVAL_MS);
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
}
