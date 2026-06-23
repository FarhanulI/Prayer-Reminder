import { useCallback, useState } from "react";
import { Platform } from "react-native";
import { loadPrayerLock } from "./prayer-lock.loader";

/**
 * Manages Android Usage Stats + Overlay permission state.
 * Wraps all native calls in try/catch so the hook never crashes if the
 * native module is unavailable (Bug Fix #4).
 */
export function usePrayerPermissions() {
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  /** Returns true only if both Usage Stats and Overlay permissions are granted. */
  const checkPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== "android") return false;
    try {
      const { hasUsageStatsPermission, hasOverlayPermission } =
        await loadPrayerLock();
      const granted =
        (await hasUsageStatsPermission()) && (await hasOverlayPermission());
      setPermissionsGranted(granted);
      return granted;
    } catch (e) {
      console.warn("[usePrayerPermissions] Native module not available:", e);
      setPermissionsGranted(false);
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
      } = await loadPrayerLock();

      if (!(await hasUsageStatsPermission())) openUsageAccessSettings();
      if (!(await hasOverlayPermission())) requestOverlayPermission();
    } catch (e) {
      console.warn("[usePrayerPermissions] Failed to request permissions:", e);
    }
  }, []);

  return { permissionsGranted, checkPermissions, requestAllPermissions };
}
