/**
 * Utility functions for notification scheduling
 *
 * Responsibilities:
 * - Parse prayer times into notification objects
 * - Validate prayer data
 * - Calculate trigger times
 * - Generate data hashes for change detection
 * - Filter expired prayers
 */

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import { PrayerLogDocument } from "@/types";

import {
    NOTIFICATION_CONFIG,
    PRAYER_DISPLAY_NAMES,
    PRAYER_NAMES,
} from "./notification.constants";
import { PrayerNotification } from "./notification.types";

// Extend dayjs with custom parse format
dayjs.extend(customParseFormat);

/**
 * Validate that prayer data is complete and properly formatted
 *
 * @param prayerData - Prayer log document from Firestore
 * @returns True if valid, false otherwise
 */
export const validatePrayerData = (
  prayerData: PrayerLogDocument | null | undefined,
): boolean => {
  if (!prayerData?.prayers) {
    return false;
  }

  // Check that all required prayers exist with time data
  for (const prayerName of PRAYER_NAMES) {
    const prayer = prayerData.prayers[prayerName];
    if (!prayer?.time) {
      return false;
    }
  }

  return true;
};

/**
 * Parse a prayer time string and create a Date object for a specific date
 *
 * @param timeString - Time in format "HH:MM" or "HH:MM AM/PM"
 * @param date - Date string (YYYY-MM-DD) for which to parse the time
 * @returns Date object for the specified date at the specified time
 */
export const parsePrayerTimeForDate = (
  timeString: string,
  date: string,
): Date => {
  // Try multiple time formats
  let parsed = dayjs(`${date} ${timeString}`, "YYYY-MM-DD HH:mm");

  if (!parsed.isValid()) {
    // Try 12-hour format with AM/PM
    parsed = dayjs(`${date} ${timeString}`, "YYYY-MM-DD hh:mm A");
  }

  if (!parsed.isValid()) {
    console.warn(
      `[NotificationUtils] Failed to parse time: ${timeString} for date: ${date}`,
    );
    // Return current time as fallback
    return new Date();
  }

  return parsed.toDate();
};

/**
 * Parse a prayer time string and create a Date object for today
 *
 * @param timeString - Time in format "HH:MM" or "HH:MM AM/PM"
 * @returns Date object for today at the specified time
 */
export const parsePrayerTime = (timeString: string): Date => {
  const today = dayjs().format("YYYY-MM-DD");
  return parsePrayerTimeForDate(timeString, today);
};

/**
 * Calculate the notification trigger time
 * Subtracts ADVANCE_MINUTES from the prayer time
 *
 * @param prayerTime - Date object for prayer time
 * @returns Date object for when notification should trigger
 */
export const calculateTriggerTime = (prayerTime: Date): Date => {
  return dayjs(prayerTime)
    .subtract(NOTIFICATION_CONFIG.ADVANCE_MINUTES, "minute")
    .toDate();
};

/**
 * Check if a prayer time is in the future
 *
 * @param prayerTime - Date object to check
 * @returns True if prayer time is in the future
 */
export const isFuturePrayer = (prayerTime: Date): boolean => {
  return dayjs(prayerTime).isAfter(dayjs());
};

/**
 * Convert prayer log data into notification objects for a specific date
 * 
 * @param prayerData - Prayer log document from Firestore
 * @param date - Date string (YYYY-MM-DD) for which to schedule
 * @param filterPast - Whether to filter out past prayer times (true for today, false for tomorrow)
 * @returns Array of prayer notification objects
 */
export const parsePrayerNotificationsForDate = (
  prayerData: PrayerLogDocument,
  date: string,
  filterPast: boolean = true,
): PrayerNotification[] => {
  const notifications: PrayerNotification[] = [];
  const now = dayjs();

  for (const prayerName of PRAYER_NAMES) {
    const prayer = prayerData.prayers[prayerName];

    if (!prayer?.time) {
      console.warn(`[NotificationUtils] Missing time for ${prayerName} on ${date}`);
      continue;
    }

    const prayerTime = parsePrayerTimeForDate(prayer.time, date);
    const triggerTime = calculateTriggerTime(prayerTime);

    // For today, filter out past times; for tomorrow, include all
    if (filterPast) {
      const secondsUntilTrigger = Math.floor(
        (triggerTime.getTime() - now.toDate().getTime()) / 1000
      );

      if (secondsUntilTrigger < 5) {
        console.info(
          `[NotificationUtils] Skipping past prayer: ${prayerName} at ${prayer.time} on ${date}`,
        );
        continue;
      }
    }

    notifications.push({
      name: PRAYER_DISPLAY_NAMES[prayerName] || prayerName,
      time: prayer.time,
      triggerTime,
    });
  }

  return notifications;
};

/**
 * Convert prayer log data into notification objects
 * Filters out prayers that have already passed
 *
 * @param prayerData - Prayer log document from Firestore
 * @returns Array of prayer notification objects
 */
export const parsePrayerNotifications = (
  prayerData: PrayerLogDocument,
): PrayerNotification[] => {
  const today = dayjs().format("YYYY-MM-DD");
  return parsePrayerNotificationsForDate(prayerData, today, true);
};

/**
 * Generate a hash of prayer data for change detection
 * Uses prayer times as input to detect if schedule needs updating
 *
 * @param prayerData - Prayer log document
 * @returns Hash string
 */
export const generatePrayerDataHash = (
  prayerData: PrayerLogDocument,
): string => {
  const times = PRAYER_NAMES.map(
    (name) => prayerData.prayers[name]?.time || "",
  ).join("|");

  // Simple hash function (could use crypto if needed)
  let hash = 0;
  for (let i = 0; i < times.length; i++) {
    const char = times.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return hash.toString(36);
};

/**
 * Format notification title for a prayer
 *
 * @param prayerName - Name of the prayer
 * @returns Formatted title string
 */
export const formatNotificationTitle = (prayerName: string): string => {
  return `${prayerName} Prayer Time`;
};

/**
 * Format notification body for a prayer
 *
 * @param prayerName - Name of the prayer
 * @param time - Prayer time string
 * @returns Formatted body string
 */
export const formatNotificationBody = (
  prayerName: string,
  time: string,
): string => {
  return `It's time for ${prayerName} prayer at ${time}`;
};

/**
 * Log notification scheduling details (for debugging)
 *
 * @param notifications - Array of prayer notifications
 */
export const logScheduledNotifications = (
  notifications: PrayerNotification[],
): void => {
  console.info(
    `[NotificationUtils] Scheduled ${notifications.length} prayer notifications:`,
  );

  notifications.forEach((notif) => {
    console.info(
      `  - ${notif.name} at ${notif.time} (trigger: ${dayjs(notif.triggerTime).format("HH:mm")})`,
    );
  });
};
