/**
 * NotificationSchedulerService
 *
 * Core service for scheduling prayer notifications.
 * Completely independent from React - pure business logic.
 *
 * Responsibilities:
 * - Request and check notification permissions
 * - Schedule notifications for today's prayers
 * - Cancel previous prayer notifications
 * - Prevent duplicate scheduling (idempotent)
 * - Persist and restore notification IDs
 * - Handle timezone and date changes
 *
 * Usage:
 *   await NotificationSchedulerService.scheduleTodaysPrayers(prayerData);
 */

import dayjs from "dayjs";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { PrayerLogDocument } from "@/types";

import {
  NOTIFICATION_CONFIG,
  NOTIFICATION_ERRORS,
} from "./notification.constants";
import {
  cleanupExpiredData,
  clearNotificationData,
  getAllStoredNotificationIds,
  isRollingScheduleValid,
  saveRollingNotificationData,
} from "./notification.storage";
import {
  NotificationPermissionStatus,
  PrayerNotification,
  ScheduleResult,
} from "./notification.types";
import {
  formatNotificationBody,
  formatNotificationTitle,
  generatePrayerDataHash,
  logScheduledNotifications,
  parsePrayerNotificationsForDate,
  validatePrayerData,
} from "./notification.utils";

/**
 * NotificationSchedulerService - Static service class
 */
export class NotificationSchedulerService {
  private static async ensureNotificationChannel(): Promise<void> {
    if (Platform.OS !== "android") {
      return;
    }

    await Notifications.setNotificationChannelAsync(
      NOTIFICATION_CONFIG.CHANNEL_ID,
      {
        name: NOTIFICATION_CONFIG.CHANNEL_NAME,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: NOTIFICATION_CONFIG.VIBRATE
          ? [0, 250, 250, 250]
          : undefined,
        sound: NOTIFICATION_CONFIG.PLAY_SOUND ? "default" : undefined,
      },
    );
  }

  /**
   * Initialize the notification system
   * Call this once on app startup
   */
  static async initialize(): Promise<void> {
    try {
      // Clean up any expired notification data from previous days
      await cleanupExpiredData();
      await this.ensureNotificationChannel();

      console.info("[NotificationScheduler] Initialized");
    } catch (error) {
      console.error("[NotificationScheduler] Initialization error:", error);
    }
  }

  /**
   * Request notification permissions from the user
   *
   * @returns Permission status
   */
  static async requestPermissions(): Promise<NotificationPermissionStatus> {
    try {
      const { status, canAskAgain } =
        await Notifications.requestPermissionsAsync();

      const result: NotificationPermissionStatus = {
        granted: status === "granted",
        canAskAgain,
        status: status as "granted" | "denied" | "undetermined",
      };

      if (!result.granted) {
        console.warn(
          "[NotificationScheduler] Permission denied or not granted",
        );
      }

      return result;
    } catch (error) {
      console.error(
        "[NotificationScheduler] Error requesting permissions:",
        error,
      );

      return {
        granted: false,
        canAskAgain: false,
        status: "denied",
      };
    }
  }

  /**
   * Check current notification permission status
   *
   * @returns Permission status
   */
  static async checkPermissions(): Promise<NotificationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();

      return {
        granted: status === "granted",
        canAskAgain,
        status: status as "granted" | "denied" | "undetermined",
      };
    } catch (error) {
      console.error(
        "[NotificationScheduler] Error checking permissions:",
        error,
      );

      return {
        granted: false,
        canAskAgain: false,
        status: "denied",
      };
    }
  }

  /**
   * Cancel all prayer notifications
   * Does not cancel other app notifications
   */
  static async cancelAllPrayerNotifications(): Promise<void> {
    try {
      const notificationIds = await getAllStoredNotificationIds();

      if (notificationIds.length > 0) {
        // Cancel each scheduled notification
        await Promise.all(
          notificationIds.map((id) =>
            Notifications.cancelScheduledNotificationAsync(id).catch((err) =>
              console.warn(
                `[NotificationScheduler] Failed to cancel notification ${id}:`,
                err,
              ),
            ),
          ),
        );

        console.info(
          `[NotificationScheduler] Cancelled ${notificationIds.length} prayer notifications`,
        );
      }

      // Clear stored data
      await clearNotificationData();
    } catch (error) {
      console.error(
        "[NotificationScheduler] Error cancelling notifications:",
        error,
      );
    }
  }

  /**
   * Schedule a single prayer notification
   *
   * @param notification - Prayer notification object
   * @returns Notification ID from expo-notifications
   */
  private static async scheduleNotification(
    notification: PrayerNotification,
  ): Promise<string | null> {
    try {
      // Validate trigger time is valid and in the future
      const now = new Date();
      const secondsUntilTrigger = Math.floor(
        (notification.triggerTime.getTime() - now.getTime()) / 1000,
      );

      // Skip if prayer time has already passed or is invalid
      if (
        !notification.triggerTime ||
        isNaN(notification.triggerTime.getTime())
      ) {
        console.error(
          `[NotificationScheduler] Invalid trigger time for ${notification.name}`,
        );
        return null;
      }

      if (secondsUntilTrigger <= 0) {
        console.warn(
          `[NotificationScheduler] Skipping ${notification.name} - time has already passed`,
        );
        return null;
      }

      console.info(
        `[NotificationScheduler] Scheduling ${notification.name} at ${dayjs(notification.triggerTime).format("HH:mm")} (in ${secondsUntilTrigger}s)`,
      );

      // Use DATE trigger (absolute timestamp) instead of TIME_INTERVAL (relative seconds).
      // DATE triggers are scheduled as system-level alarms and survive process kills,
      // Doze mode, and OEM battery optimisers — ensuring the notification fires even
      // if the app has been force-stopped or the phone has been sleeping for hours.
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: formatNotificationTitle(notification.name),
          body: formatNotificationBody(notification.name, notification.time),
          sound: NOTIFICATION_CONFIG.PLAY_SOUND,
          priority: NOTIFICATION_CONFIG.PRIORITY,
          vibrate: NOTIFICATION_CONFIG.VIBRATE ? [0, 250, 250, 250] : undefined,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          channelId: NOTIFICATION_CONFIG.CHANNEL_ID,
          date: notification.triggerTime,
        },
      });

      console.info(
        `[NotificationScheduler] ✓ Successfully scheduled ${notification.name} (ID: ${notificationId})`,
      );

      return notificationId;
    } catch (error) {
      console.error(
        `[NotificationScheduler] Failed to schedule ${notification.name}:`,
        error,
      );
      console.error(
        `[NotificationScheduler] Debug - Trigger time: ${notification.triggerTime?.toString()}`,
      );
      return null;
    }
  }

  /**
   * Schedule notifications for today and tomorrow's prayers (Rolling Schedule)
   *
   * This is the main method for rolling notification scheduling.
   *
   * Features:
   * - Schedules remaining prayers for today
   * - Schedules all prayers for tomorrow
   * - Detects date changes and auto-reschedules
   * - Detects location changes and auto-reschedules
   * - Idempotent - won't create duplicates
   *
   * @param todayData - Today's prayer data
   * @param tomorrowData - Tomorrow's prayer data
   * @param currentDate - Current date (YYYY-MM-DD)
   * @param tomorrowDate - Tomorrow's date (YYYY-MM-DD)
   * @param location - User location coordinates
   * @returns Result object with success status and details
   */
  static async scheduleRollingPrayers(params: {
    todayData: PrayerLogDocument | null;
    tomorrowData: PrayerLogDocument | null;
    currentDate: string;
    tomorrowDate: string;
    location: { latitude: number; longitude: number } | null;
  }): Promise<ScheduleResult> {
    try {
      await this.initialize();
      const { todayData, tomorrowData, currentDate, tomorrowDate, location } =
        params;

      // Validate at least today's data exists
      if (!validatePrayerData(todayData)) {
        console.warn(
          "[NotificationScheduler] Invalid or missing today's prayer data",
        );
        return {
          success: false,
          scheduledCount: 0,
          error: NOTIFICATION_ERRORS.INVALID_PRAYER_DATA,
        };
      }

      // Generate hashes for change detection
      const todayHash = generatePrayerDataHash(todayData!);
      const tomorrowHash = tomorrowData
        ? generatePrayerDataHash(tomorrowData)
        : "";

      // Check if rescheduling is needed (idempotency check)
      const isValid = await isRollingScheduleValid({
        currentDate,
        tomorrowDate,
        todayDataHash: todayHash,
        tomorrowDataHash: tomorrowHash,
        location,
      });

      if (isValid) {
        console.info(
          "[NotificationScheduler] Rolling schedule is up-to-date, no rescheduling needed",
        );
        return {
          success: true,
          scheduledCount: 0,
          error: "Already scheduled",
        };
      }

      // Check permissions
      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        const newPermissions = await this.requestPermissions();
        if (!newPermissions.granted) {
          console.warn("[NotificationScheduler] Permissions not granted");
          return {
            success: false,
            scheduledCount: 0,
            error: NOTIFICATION_ERRORS.PERMISSION_DENIED,
          };
        }
      }

      // Cancel all existing prayer notifications
      await this.cancelAllPrayerNotifications();

      // Parse notifications for today (filter out past times)
      const todayNotifications = parsePrayerNotificationsForDate(
        todayData!,
        currentDate,
        true, // Filter past times
      );

      // Parse notifications for tomorrow (include all times)
      const tomorrowNotifications =
        tomorrowData && validatePrayerData(tomorrowData)
          ? parsePrayerNotificationsForDate(
              tomorrowData,
              tomorrowDate,
              false, // Don't filter - schedule all prayers
            )
          : [];

      const allNotifications = [
        ...todayNotifications,
        ...tomorrowNotifications,
      ];

      if (allNotifications.length === 0) {
        console.info(
          "[NotificationScheduler] No prayers to schedule for today or tomorrow",
        );

        // Still save empty schedule to prevent re-checking
        await saveRollingNotificationData({
          todayDate: currentDate,
          todayIds: [],
          todayHash,
          tomorrowDate,
          tomorrowIds: [],
          tomorrowHash,
          location,
        });

        return {
          success: true,
          scheduledCount: 0,
        };
      }

      // Schedule all notifications
      const todayIds: string[] = [];
      const tomorrowIds: string[] = [];

      console.info(
        `[NotificationScheduler] Scheduling ${todayNotifications.length} prayers for today, ${tomorrowNotifications.length} for tomorrow`,
      );

      // Schedule today's prayers
      for (const notification of todayNotifications) {
        const id = await this.scheduleNotification(notification);
        if (id) {
          todayIds.push(id);
        }
      }

      // Schedule tomorrow's prayers
      for (const notification of tomorrowNotifications) {
        const id = await this.scheduleNotification(notification);
        if (id) {
          tomorrowIds.push(id);
        }
      }

      // Persist the rolling schedule
      await saveRollingNotificationData({
        todayDate: currentDate,
        todayIds,
        todayHash,
        tomorrowDate,
        tomorrowIds,
        tomorrowHash,
        location,
      });

      // Log results
      if (todayNotifications.length > 0) {
        console.info(`📅 Today's scheduled prayers: ${new Date()}`);
        logScheduledNotifications(todayNotifications);
      }
      if (tomorrowNotifications.length > 0) {
        console.info(`📅 Tomorrow's scheduled prayers: ${tomorrowData}`);
        logScheduledNotifications(tomorrowNotifications);
      }

      return {
        success: true,
        scheduledCount: todayIds.length + tomorrowIds.length,
        notificationIds: [...todayIds, ...tomorrowIds],
      };
    } catch (error) {
      console.error(
        "[NotificationScheduler] Error scheduling rolling prayers:",
        error,
      );

      return {
        success: false,
        scheduledCount: 0,
        error:
          error instanceof Error
            ? error.message
            : NOTIFICATION_ERRORS.SCHEDULING_FAILED,
      };
    }
  }

  /**
   * Schedule notifications for today's prayers
   *
   * @deprecated Use scheduleRollingPrayers for better multi-day support
   *
   * This is the main public method to call
   *
   * Idempotent: Can be called multiple times safely
   * - Checks if already scheduled for today
   * - Detects if prayer data changed
   * - Skips scheduling if not needed
   *
   * @param prayerData - Today's prayer data from Firestore
   * @returns Result object with success status and details
   */
  static async scheduleTodaysPrayers(
    prayerData: PrayerLogDocument | null | undefined,
  ): Promise<ScheduleResult> {
    // Delegate to rolling scheduler with only today's data
    const today = dayjs().format("YYYY-MM-DD");
    const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");

    return this.scheduleRollingPrayers({
      todayData: prayerData || null,
      tomorrowData: null,
      currentDate: today,
      tomorrowDate: tomorrow,
      location: null,
    });
  }

  /**
   * Get currently scheduled prayer notifications
   * Useful for debugging
   */
  static async getScheduledNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      return scheduled;
    } catch (error) {
      console.error(
        "[NotificationScheduler] Error getting scheduled notifications:",
        error,
      );
      return [];
    }
  }
}
