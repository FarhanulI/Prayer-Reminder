import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { loadPrayerLock } from "./prayer-lock.loader";
import { Prayer, toNativePrayer } from "./utils/prayer.helpers";
import { STORAGE_KEYS } from "./utils/prayer.storage";

/**
 * Manages all communication with the native background service:
 * - Syncs the prayer list whenever uid or prayers change
 * - Provides `syncImmediately` for instant post-action syncs
 * - Propagates snooze state to native
 *
 * All native calls are wrapped in try/catch (Bug Fix #4).
 */
export function usePrayerNativeSync(
  uid: string | null,
  prayers: Prayer[],
  checkPermissions: () => Promise<boolean>,
) {
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

    const sync = async () => {
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
        return;
      }

      const enabledVal = await AsyncStorage.getItem(
        STORAGE_KEYS.PRAYER_LOCK_ENABLED,
      );
      const isEnabled = enabledVal === null || enabledVal === "true";

      if (!isEnabled) {
        native.stopService();
        return;
      }

      const granted = await checkPermissions();
      if (!granted) {
        native.stopService();
        return;
      }

      native.syncPrayers(JSON.stringify(prayers.map(toNativePrayer)));
      native.startService();
    };

    sync();

    // NOTE: We intentionally do NOT stop the service in cleanup — the native
    // foreground monitor must outlive Dashboard unmounts. Stop only on logout
    // or when prayer lock is disabled (handled inside `sync` above).
    return () => {
      active = false;
    };
  }, [uid, prayers, checkPermissions]);

  return { syncImmediately, syncSnoozeToNative };
}
