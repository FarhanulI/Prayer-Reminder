"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyAyah = void 0;
const v2_1 = require("firebase-functions/v2");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const ayah_notification_1 = require("../notifications/ayah.notification");
const user_repository_1 = require("../repositories/user.repository");
const expoPush_service_1 = require("../services/expoPush.service");
// Mirrors the fetch in useGetRandomAyah — same endpoint, no React Query
async function fetchRandomAyah() {
    const baseUrl = process.env.EXPO_PUBLIC_BASE_URL;
    if (!baseUrl)
        throw new Error("[dailyAyah] BASE_URL environment variable is not set");
    const response = await fetch(`${baseUrl}/api/quran/random`);
    if (!response.ok)
        throw new Error(`Ayah API responded with status ${response.status}`);
    const { data } = await response.json();
    return data;
}
// Runs at 7:00 AM UTC daily
exports.dailyAyah = (0, scheduler_1.onSchedule)({
    schedule: "0 7 * * *",
    timeZone: "UTC",
    memory: "256MiB",
}, async () => {
    v2_1.logger.info("[dailyAyah] Function started");
    let ayah;
    try {
        ayah = await fetchRandomAyah();
    }
    catch (error) {
        v2_1.logger.error("[dailyAyah] Failed to fetch Ayah:", error);
        return;
    }
    const users = await (0, user_repository_1.getUsersForDailyAyah)();
    v2_1.logger.info(`[dailyAyah] ${users.length} eligible users found`);
    if (users.length === 0)
        return;
    const notification = (0, ayah_notification_1.buildAyahNotification)(ayah);
    const recipients = users.map((u) => ({
        uid: u.uid,
        token: u.expoPushToken,
        message: notification,
    }));
    const result = await (0, expoPush_service_1.sendPushNotifications)(recipients);
    if (result.invalidUids.length > 0) {
        await (0, user_repository_1.removeInvalidTokens)(result.invalidUids);
    }
    v2_1.logger.info(`[dailyAyah] Done — sent: ${result.successful}, failed: ${result.failed}, ` +
        `invalid tokens removed: ${result.invalidUids.length}`);
});
//# sourceMappingURL=dailyAyah.js.map