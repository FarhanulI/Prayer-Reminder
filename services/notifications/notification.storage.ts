/**
 * AsyncStorage persistence layer for notification IDs and metadata
 *
 * Responsibilities:
 * - Store scheduled notification IDs for today and tomorrow
 * - Retrieve notification metadata
 * - Clean up expired notification data
 * - Prevent duplicate scheduling via data hashing
 * - Track location and timezone changes
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";

import { NOTIFICATION_STORAGE_KEYS } from "./notification.constants";
import { StoredNotificationData } from "./notification.types";

interface SaveRollingNotificationsParams {
  todayDate: string;
  todayIds: string[];
  todayHash: string;
  tomorrowDate: string;
  tomorrowIds: string[];
  tomorrowHash: string;
  location: { latitude: number; longitude: number } | null;
  timezone?: string;
}

/**
 * Save scheduled notification IDs for both today and tomorrow
 *
 * @param params - Rolling notification data
 * @returns Promise that resolves when saved
 */
export const saveRollingNotificationData = async (
  params: SaveRollingNotificationsParams,
): Promise<void> => {
  try {
    const data: StoredNotificationData = {
      scheduledDate: dayjs().format("YYYY-MM-DD"),
      today: {
        date: params.todayDate,
        notificationIds: params.todayIds,
        dataHash: params.todayHash,
      },
      tomorrow: {
        date: params.tomorrowDate,
        notificationIds: params.tomorrowIds,
        dataHash: params.tomorrowHash,
      },
      createdAt: new Date().toISOString(),
      location: params.location,
      timezone: params.timezone,
    };

    await AsyncStorage.setItem(
      NOTIFICATION_STORAGE_KEYS.PRAYER_NOTIFICATIONS,
      JSON.stringify(data),
    );

    console.info(
      `[NotificationStorage] Saved rolling schedule: ${params.todayIds.length} today, ${params.tomorrowIds.length} tomorrow`,
    );
  } catch (error) {
    console.error(
      "[NotificationStorage] Failed to save notification IDs:",
      error,
    );
    throw new Error("Failed to persist notification data");
  }
};

/**
 * Retrieve stored notification metadata
 *
 * @returns Stored notification data or null if none exists
 */
export const getStoredNotificationData =
  async (): Promise<StoredNotificationData | null> => {
    try {
      const raw = await AsyncStorage.getItem(
        NOTIFICATION_STORAGE_KEYS.PRAYER_NOTIFICATIONS,
      );

      if (!raw) return null;

      const data: StoredNotificationData = JSON.parse(raw);

      // Validate new data structure
      if (
        !data.scheduledDate ||
        !data.today?.date ||
        !Array.isArray(data.today?.notificationIds) ||
        !data.tomorrow?.date ||
        !Array.isArray(data.tomorrow?.notificationIds)
      ) {
        console.warn(
          "[NotificationStorage] Invalid stored data format, clearing...",
        );
        await clearNotificationData();
        return null;
      }

      return data;
    } catch (error) {
      console.error(
        "[NotificationStorage] Failed to retrieve notification data:",
        error,
      );
      return null;
    }
  };

/**
 * Get all notification IDs from stored data (both today and tomorrow)
 *
 * @returns Array of all notification IDs
 */
export const getAllStoredNotificationIds = async (): Promise<string[]> => {
  try {
    const data = await getStoredNotificationData();
    if (!data) return [];

    return [...data.today.notificationIds, ...data.tomorrow.notificationIds];
  } catch (error) {
    console.error(
      "[NotificationStorage] Error getting notification IDs:",
      error,
    );
    return [];
  }
};

interface ValidationOptions {
  currentDate: string;
  tomorrowDate: string;
  todayDataHash?: string;
  tomorrowDataHash?: string;
  location?: { latitude: number; longitude: number } | null;
}

/**
 * Check if stored notification data is still valid
 * 
 * Validation criteria:
 * - Scheduled date must be today
 * - Today's date in data must match current date
 * - Tomorrow's date in data must match tomorrow's date
 * - Prayer data hashes must match (if provided)
 * - Location must match (if provided)
 *
 * @param options - Validation parameters
 * @returns True if data is valid and current, false otherwise
 */
export const isRollingScheduleValid = async (
  options: ValidationOptions,
): Promise<boolean> => {
  try {
    const data = await getStoredNotificationData();
    if (!data) return false;

    const today = dayjs().format("YYYY-MM-DD");

    // Check if scheduled today
    if (data.scheduledDate !== today) {
      console.info(
        `[NotificationStorage] Schedule is outdated (scheduled: ${data.scheduledDate}, today: ${today})`,
      );
      return false;
    }

    // Check if dates match
    if (
      data.today.date !== options.currentDate ||
      data.tomorrow.date !== options.tomorrowDate
    ) {
      console.info(
        "[NotificationStorage] Date mismatch in stored schedule",
      );
      return false;
    }

    // Check if prayer data has changed
    if (options.todayDataHash && data.today.dataHash !== options.todayDataHash) {
      console.info("[NotificationStorage] Today's prayer data has changed");
      return false;
    }

    if (options.tomorrowDataHash && data.tomorrow.dataHash !== options.tomorrowDataHash) {
      console.info("[NotificationStorage] Tomorrow's prayer data has changed");
      return false;
    }

    // Check if location has changed
    if (options.location) {
      const locationChanged =
        !data.location ||
        Math.abs(data.location.latitude - options.location.latitude) > 0.001 ||
        Math.abs(data.location.longitude - options.location.longitude) > 0.001;

      if (locationChanged) {
        console.info("[NotificationStorage] Location has changed");
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("[NotificationStorage] Error checking data validity:", error);
    return false;
  }
};

/**
 * Clear all stored notification data
 *
 * @returns Promise that resolves when cleared
 */
export const clearNotificationData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(
      NOTIFICATION_STORAGE_KEYS.PRAYER_NOTIFICATIONS,
    );
    console.info("[NotificationStorage] Cleared notification data");
  } catch (error) {
    console.error(
      "[NotificationStorage] Failed to clear notification data:",
      error,
    );
  }
};

/**
 * Clean up expired notification data (call this on app start)
 * Removes data if it's from a previous day
 *
 * @returns Promise that resolves when cleanup is complete
 */
export const cleanupExpiredData = async (): Promise<void> => {
  try {
    const data = await getStoredNotificationData();
    if (!data) return;

    const today = dayjs().format("YYYY-MM-DD");

    // Clear if scheduled on a previous day
    if (data.scheduledDate !== today) {
      await clearNotificationData();
      console.info(
        `[NotificationStorage] Cleaned up expired notification data (was scheduled for ${data.scheduledDate})`,
      );
    }
  } catch (error) {
    console.error("[NotificationStorage] Error during cleanup:", error);
  }
};
