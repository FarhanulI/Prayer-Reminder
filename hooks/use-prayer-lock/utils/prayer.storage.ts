import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { makePrayerSessionKey } from "./prayer.helpers";

// ─── Keys ─────────────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  OVERLAY_SNOOZED_UNTIL: "overlay_snoozed_until",
  PRAYER_SKIP_DEADLINES: "prayer_skip_deadlines",
  COMPLETED_PRAYER_KEYS: "prayer_lock_completed_keys",
  /** Exported so callers (e.g. settings screen) can read/write this flag. */
  PRAYER_LOCK_ENABLED: "prayer_lock_enabled",
} as const;

/** Re-exported for external callers (e.g. the Settings screen). */
export const PRAYER_LOCK_ENABLED_KEY = STORAGE_KEYS.PRAYER_LOCK_ENABLED;

// ─── Completed-key persistence ────────────────────────────────────────────────

/**
 * Loads completed prayer keys from AsyncStorage, pruning anything older than
 * yesterday so the set never grows indefinitely.
 */
export async function loadCompletedKeys(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.COMPLETED_PRAYER_KEYS);
    if (!raw) return new Set();

    const today = dayjs().format("YYYY-MM-DD");
    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");

    const all: string[] = JSON.parse(raw);
    const valid = all.filter((k) => {
      const date = k.split("|")[1];
      return date === today || date === yesterday;
    });

    if (valid.length !== all.length) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.COMPLETED_PRAYER_KEYS,
        JSON.stringify(valid),
      );
    }

    return new Set(valid);
  } catch (e) {
    console.warn("[prayer.storage] Failed to load completed keys:", e);
    return new Set();
  }
}

/**
 * Adds `key` to the persisted set if not already present.
 */
export async function persistCompletedKey(key: string): Promise<void> {
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
    console.warn("[prayer.storage] Failed to persist completed key:", e);
  }
}

// ─── Snooze helpers ───────────────────────────────────────────────────────────

export async function setSnooze(untilIso: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.OVERLAY_SNOOZED_UNTIL, untilIso);
}

export async function clearSnooze(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.OVERLAY_SNOOZED_UNTIL);
}

// ─── Skip deadline helpers ────────────────────────────────────────────────────

/**
 * Stores a 30-minute skip cooldown for the given prayer/date pair and
 * simultaneously prunes all expired entries so AsyncStorage never grows
 * indefinitely.
 */
export async function setSkipDeadline(
  prayerName: string,
  date: string,
): Promise<void> {
  const key = makePrayerSessionKey(prayerName, date);
  const reminderTime = dayjs().add(30, "minute").toISOString();

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PRAYER_SKIP_DEADLINES);
    const deadlines: Record<string, string> = raw ? JSON.parse(raw) : {};

    // Add new entry
    deadlines[key] = reminderTime;

    // Prune expired entries (Bug Fix #3)
    const now = dayjs();
    const pruned = Object.fromEntries(
      Object.entries(deadlines).filter(([, deadline]) =>
        dayjs(deadline).isAfter(now),
      ),
    );

    await AsyncStorage.setItem(
      STORAGE_KEYS.PRAYER_SKIP_DEADLINES,
      JSON.stringify(pruned),
    );
  } catch (e) {
    console.warn("[prayer.storage] Failed to set skip deadline:", e);
  }
}

// ─── Parallel reads ───────────────────────────────────────────────────────────

/**
 * Reads snooze timestamp and skip deadlines in parallel (Fix #5).
 * Returns `null` for snoozedUntil if not set.
 */
export async function readSnoozeAndDeadlines(): Promise<{
  snoozedUntil: string | null;
  skipDeadlines: Record<string, string>;
}> {
  const [snoozedUntil, rawDeadlines] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.OVERLAY_SNOOZED_UNTIL),
    AsyncStorage.getItem(STORAGE_KEYS.PRAYER_SKIP_DEADLINES),
  ]);

  const skipDeadlines: Record<string, string> = rawDeadlines
    ? JSON.parse(rawDeadlines)
    : {};

  return { snoozedUntil, skipDeadlines };
}

/**
 * Reads skip deadlines in parallel on startup and removes expired entries.
 * Call once at app boot to keep AsyncStorage clean.
 */
export async function pruneExpiredSkipDeadlines(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PRAYER_SKIP_DEADLINES);
    if (!raw) return;

    const deadlines: Record<string, string> = JSON.parse(raw);
    const now = dayjs();
    const pruned = Object.fromEntries(
      Object.entries(deadlines).filter(([, deadline]) =>
        dayjs(deadline).isAfter(now),
      ),
    );

    if (Object.keys(pruned).length !== Object.keys(deadlines).length) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PRAYER_SKIP_DEADLINES,
        JSON.stringify(pruned),
      );
    }
  } catch (e) {
    console.warn("[prayer.storage] Failed to prune skip deadlines:", e);
  }
}
