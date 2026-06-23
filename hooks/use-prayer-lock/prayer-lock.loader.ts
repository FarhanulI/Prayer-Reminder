/**
 * Singleton loader for the `prayer-lock` native Expo module.
 *
 * Caches the module after the first successful import so subsequent calls are
 * synchronous-equivalent and easier to mock in tests (Fix #3).
 */

type PrayerLockModule = typeof import("../../modules/prayer-lock");

let cachedModule: PrayerLockModule | null = null;

export async function loadPrayerLock(): Promise<PrayerLockModule> {
  if (!cachedModule) {
    cachedModule = await import("../../modules/prayer-lock");
  }
  return cachedModule;
}

/** Reset the cache — useful in unit tests to force re-import. */
export function _resetPrayerLockCache(): void {
  cachedModule = null;
}
