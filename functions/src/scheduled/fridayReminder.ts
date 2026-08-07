import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { buildFridayNotification } from "../notifications/friday.notification";
import {
    getUsersForFridayReminder,
    removeInvalidTokens,
} from "../repositories/user.repository";
import {
    RecipientMessage,
    sendPushNotifications,
} from "../services/expoPush.service";

// Runs every Friday at 10:00 AM Asia/Dhaka
export const fridayReminder = onSchedule(
  {
    schedule: "0 10 * * 5",
    timeZone: "Asia/Dhaka",
    memory: "256MiB",
  },
  async () => {
    logger.info("[fridayReminder] Function started");

    const users = await getUsersForFridayReminder();
    logger.info(`[fridayReminder] ${users.length} eligible users found`);

    if (users.length === 0) return;

    const notification = buildFridayNotification();

    const recipients: RecipientMessage[] = users.map((u) => ({
      uid: u.uid,
      token: u.expoPushToken,
      message: notification,
    }));

    const result = await sendPushNotifications(recipients);

    if (result.invalidUids.length > 0) {
      await removeInvalidTokens(result.invalidUids);
    }

    logger.info(
      `[fridayReminder] Done — sent: ${result.successful}, failed: ${result.failed}, ` +
        `invalid tokens removed: ${result.invalidUids.length}`,
    );
  },
);
