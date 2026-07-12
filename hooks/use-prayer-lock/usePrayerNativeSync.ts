import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { loadPrayerLock } from "./prayer-lock.loader";
import { Prayer, toNativePrayer } from "./utils/prayer.helpers";
import { STORAGE_KEYS } from "./utils/prayer.storage";

/**
 * Manages all communication with the native background service:
 * - Syncs the prayer list whenever uid or prayers change
 * - Provides `syncImmediately` for instant post-action syncs
 * - Propagates snooze state to native
 * - Re-syncs prayer data when app comes back to foreground after a long absence
 *   so the native service doesn't act on stale (6+ hour old) prayer times.
 *
 * All native calls are wrapped in try/catch (Bug Fix #4).
 */
export function usePrayerNativeSync(
  uid: string | null,
  prayers: Prayer[],
  checkPermissions: () => Promise<boolean>,
) {
  // Keep a stable ref to the latest prayers so the AppState handler can
  // access current data without creating a stale-closure bug.
  const prayersRef = useRef<Prayer[]>(prayers);
  useEffect(() => {
    prayersRef.current = prayers;
  }, [prayers]);

  // ── Snooze propagation ────────────────────────────────────────────────────

  const syncSnoozeToNative = useCallback(
    async (untilIso: string | null): Promise<void> => {
      if (Platform.OS !== "android") return;
      try {
        const { syncOverlaySnooze } = await loadPrayerLock();
        syncOverlaySnooze(untilIso);
      } catch (e) {
        console.warn("[usePrayerNativeSync] Failed to sync snooze:", e);
      }
    },
    [],
  );

  // ── Immediate sync (called right after a user action) ─────────────────────

  /**
   * Pushes an updated prayer list to the native service immediately — before
   * Firestore propagates — so the overlay does not re-trigger after
   * complete/skip actions.
   */
  const syncImmediately = useCallback(
    async (updatedPrayers: Prayer[]): Promise<void> => {
      if (Platform.OS !== "android") return;
      try {
        const { syncPrayers, startService } = await loadPrayerLock();
        syncPrayers(JSON.stringify(updatedPrayers.map(toNativePrayer)));
        startService();
      } catch (e) {
        console.warn("[usePrayerNativeSync] Instant sync failed:", e);
      }
    },
    [],
  );

  // ── Lifecycle sync (uid / prayers change) ─────────────────────────────────

  useEffect(() => {
    if (Platform.OS !== "android") return;

    let active = true;

    const sync = async (currentPrayers: Prayer[]) => {
      let native: Awaited<ReturnType<typeof loadPrayerLock>>;
      try {
        native = await loadPrayerLock();
      } catch (e) {
        console.warn("[usePrayerNativeSync] Native module unavailable:", e);
        return;
      }

      if (!active) return;

      if (!uid) {
        native.stopService();
        try { native.setEnabled(false); } catch (_) {} // persist for boot receiver
        return;
      }

      const enabledVal = await AsyncStorage.getItem(
        STORAGE_KEYS.PRAYER_LOCK_ENABLED,
      );
      const isEnabled = enabledVal === null || enabledVal === "true";

      if (!isEnabled) {
        native.stopService();
        try { native.setEnabled(false); } catch (_) {}
        return;
      }

      const granted = await checkPermissions();
      if (!granted) {
        native.stopService();
        return;
      }

      // Sync prayers and start service FIRST — these are critical.
      // setEnabled is best-effort (it's a new API; may not exist on old builds).
      native.syncPrayers(JSON.stringify(currentPrayers.map(toNativePrayer)));
      native.startService();
      try { native.setEnabled(true); } catch (_) {}
    };

    sync(prayers);

    // NOTE: We intentionally do NOT stop the service in cleanup — the native
    // foreground monitor must outlive Dashboard unmounts. Stop only on logout
    // or when prayer lock is disabled (handled inside `sync` above).
    return () => {
      active = false;
    };
  }, [uid, prayers, checkPermissions]);

  // ── Re-sync on foreground resume ──────────────────────────────────────────

  /**
   * When the app transitions from background → active after being closed for
   * several hours, the native service may have stale prayer data (yesterday's
   * times). Re-syncing here ensures the service always has up-to-date prayer
   * windows as soon as the user opens the app.
   */
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState !== "active") return;

      console.log("[usePrayerNativeSync] App resumed — re-syncing prayers to native");

      try {
        const native = await loadPrayerLock();

        const enabledVal = await AsyncStorage.getItem(STORAGE_KEYS.PRAYER_LOCK_ENABLED);
        const isEnabled = enabledVal === null || enabledVal === "true";

        if (!uid || !isEnabled) return;

        const granted = await checkPermissions();
        if (!granted) return;

        // Re-push current prayer data so the staleness guard in the native
        // service sees a fresh `last_synced_at` and resumes blocking.
        native.syncPrayers(JSON.stringify(prayersRef.current.map(toNativePrayer)));
        native.startService();
        try { native.setEnabled(true); } catch (_) {}

        console.log("[usePrayerNativeSync] Re-sync complete on foreground resume");
      } catch (e) {
        console.warn("[usePrayerNativeSync] Foreground re-sync failed:", e);
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [uid, checkPermissions]);

  return { syncImmediately, syncSnoozeToNative };
}
