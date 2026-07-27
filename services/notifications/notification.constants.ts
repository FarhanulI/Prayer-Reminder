/**
 * Constants for the Prayer Notification System
 */

/**
 * AsyncStorage keys for notification data persistence
 */
export const NOTIFICATION_STORAGE_KEYS = {
  /** Key for storing scheduled prayer notification IDs */
  PRAYER_NOTIFICATIONS: "@prayer_notifications",

  /** Key for storing last notification permission request timestamp */
  LAST_PERMISSION_REQUEST: "@notification_permission_last_request",
} as const;

/**
 * Prayer names in order (used for iteration)
 */
export const PRAYER_NAMES = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
] as const;

/**
 * Prayer display names (capitalized)
 */
export const PRAYER_DISPLAY_NAMES: Record<string, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
} as const;

/**
 * Notification configuration
 */
export const NOTIFICATION_CONFIG = {
  /** How many minutes before prayer time to send notification (0 = at prayer time) */
  ADVANCE_MINUTES: 0,

  /** Whether to vibrate on notification */
  VIBRATE: true,

  /** Whether to play sound on notification */
  PLAY_SOUND: true,

  /** Notification channel ID (Android) */
  CHANNEL_ID: "prayer-times",

  /** Notification channel name (Android) */
  CHANNEL_NAME: "Prayer Times",

  /** Notification channel importance (Android) */
  CHANNEL_IMPORTANCE: 4, // max importance

  /** Priority for iOS */
  PRIORITY: "high" as const,
} as const;

/**
 * Error messages
 */
export const NOTIFICATION_ERRORS = {
  PERMISSION_DENIED: "Notification permission denied",
  NO_PRAYER_DATA: "No prayer data available",
  INVALID_PRAYER_DATA: "Invalid prayer data format",
  SCHEDULING_FAILED: "Failed to schedule notifications",
  STORAGE_ERROR: "Failed to persist notification data",
} as const;
