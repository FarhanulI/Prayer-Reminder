import dayjs from "dayjs";

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

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Social/entertainment package names that are blocked during prayer windows.
 * Extend this list as needed; keep alphabetically sorted for readability.
 */
export const BLOCKED_PACKAGES = new Set([
  // "com.android.settings", // Included for simulator testing
  "com.facebook.katana",
  "com.google.android.youtube",
  "com.instagram.android",
  "com.netflix.mediaclient",
  "com.snapchat.android",
  "com.twitter.android",
  "com.whatsapp",
]);

// ─── Safe array helpers ───────────────────────────────────────────────────────

/**
 * Safe polyfill for `Array.prototype.findLast` — not available in older
 * React Native / Hermes versions.
 */
export function findLastPrayer<T>(
  arr: T[],
  predicate: (item: T) => boolean,
): T | undefined {
  return [...arr].reverse().find(predicate);
}

// ─── Prayer key / identity helpers ───────────────────────────────────────────

/** Stable key used to de-duplicate completed prayers across sessions. */
export function makePrayerSessionKey(name: string, date: string): string {
  return `${name}|${date}`;
}

/** Returns true if the given package is in the blocked list. */
export function isBlockedPackage(packageName: string | null | undefined): boolean {
  return !!packageName && BLOCKED_PACKAGES.has(packageName);
}

// ─── Prayer date resolution ───────────────────────────────────────────────────

/**
 * Resolves the canonical date for a prayer, avoiding duplicate `findLast`
 * calls across `markPrayerComplete` / `markPrayerSkipped`.
 *
 * Priority: `explicitDate` → matching prayer's `.date` → today.
 */
export function getPrayerDate(
  prayers: Prayer[],
  prayerName: string,
  explicitDate?: string,
): string {
  return (
    explicitDate ??
    findLastPrayer(prayers, (p) => p.name === prayerName)?.date ??
    dayjs().format("YYYY-MM-DD")
  );
}

/**
 * Resolves the effective session date for a prayer window, including
 * overnight windows that continue past midnight.
 */
export function getEffectivePrayerDate(prayer: Prayer): string {
  const now = dayjs();
  const prayerDate = prayer.date ?? now.format("YYYY-MM-DD");

  // The stored date already represents the correct start date.
  // No need to subtract a day — just return the stored date.
  return prayerDate;
}

// ─── Native prayer shape ──────────────────────────────────────────────────────

/**
 * Maps a `Prayer` to the shape expected by the native background service.
 * Centralises the repeated inline object literal so there is a single source
 * of truth for field names and defaults.
 */
export function toNativePrayer(prayer: Prayer): {
  name: string;
  time: string;
  end: string;
  date: string;
  isPrayed: boolean;
  /** Legacy native field — mirrors isPrayed */
  completed: boolean;
  skipped: boolean;
} {
  return {
    name: prayer.name,
    time: prayer.time,
    end: prayer.end,
    date: prayer.date ?? dayjs().format("YYYY-MM-DD"),
    isPrayed: prayer.isPrayed ?? false,
    completed: prayer.isPrayed ?? false,
    skipped: prayer.skipped ?? false,
  };
}

// ─── Active prayer detection ──────────────────────────────────────────────────

/**
 * Returns the first prayer whose time window contains `now` and that has not
 * been prayed/skipped/session-completed.
 */
export function getActivePrayer(
  prayers: Prayer[],
  completedKeys: Set<string>,
): Prayer | null {
  const now = dayjs();
  const today = now.format("YYYY-MM-DD");

  for (const prayer of prayers) {
    const prayerDate = prayer.date ?? today;

    // Skip if already handled
    if (prayer.isPrayed || prayer.skipped) continue;
    if (!prayer.time || !prayer.end) continue;

    let startTime = dayjs(`${prayerDate} ${prayer.time}`);
    let endTime = dayjs(`${prayerDate} ${prayer.end}`);

    // Handle overnight windows (e.g. Isha ending after midnight):
    // Only push end forward. The stored date already represents the correct
    // start date, so we never subtract a day from startTime.
    if (endTime.isBefore(startTime)) {
      endTime = endTime.add(1, "day");
    }

    const effectiveDate = getEffectivePrayerDate(prayer);

    // Skip if this specific effective session is already completed/skipped
    if (completedKeys.has(makePrayerSessionKey(prayer.name, effectiveDate))) continue;

    if (
      (now.isSame(startTime) || now.isAfter(startTime)) &&
      now.isBefore(endTime)
    ) {
      // Return prayer with corrected date for overnight cases
      return { ...prayer, date: effectiveDate };
    }
  }

  return null;
}
