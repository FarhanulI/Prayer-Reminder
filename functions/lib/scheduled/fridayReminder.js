"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fridayReminder = void 0;
const v2_1 = require("firebase-functions/v2");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const friday_notification_1 = require("../notifications/friday.notification");
const user_repository_1 = require("../repositories/user.repository");
const expoPush_service_1 = require("../services/expoPush.service");
// Runs every Friday at 10:00 AM Asia/Dhaka
exports.fridayReminder = (0, scheduler_1.onSchedule)({
    schedule: "0 10 * * 5",
    timeZone: "Asia/Dhaka",
    memory: "256MiB",
}, async () => {
    v2_1.logger.info("[fridayReminder] Function started");
    const users = await (0, user_repository_1.getUsersForFridayReminder)();
    v2_1.logger.info(`[fridayReminder] ${users.length} eligible users found`);
    if (users.length === 0)
        return;
    const notification = (0, friday_notification_1.buildFridayNotification)();
    const recipients = users.map((u) => ({
        uid: u.uid,
        token: u.expoPushToken,
        message: notification,
    }));
    const result = await (0, expoPush_service_1.sendPushNotifications)(recipients);
    if (result.invalidUids.length > 0) {
        await (0, user_repository_1.removeInvalidTokens)(result.invalidUids);
    }
    v2_1.logger.info(`[fridayReminder] Done — sent: ${result.successful}, failed: ${result.failed}, ` +
        `invalid tokens removed: ${result.invalidUids.length}`);
});
//# sourceMappingURL=fridayReminder.js.map