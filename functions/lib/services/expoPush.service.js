"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotifications = sendPushNotifications;
const expo_server_sdk_1 = require("expo-server-sdk");
const v2_1 = require("firebase-functions/v2");
const expo = new expo_server_sdk_1.Expo({ useFcmV1: true });
// Expo push error codes that indicate a permanently invalid token
const PERMANENT_ERROR_CODES = new Set([
    "DeviceNotRegistered",
    "InvalidCredentials",
]);
async function sendPushNotifications(recipients) {
    const messages = recipients.map((r) => (Object.assign(Object.assign({}, r.message), { to: r.token })));
    const chunks = expo.chunkPushNotifications(messages);
    const result = {
        successful: 0,
        failed: 0,
        invalidTokens: [],
        invalidUids: [],
    };
    for (const chunk of chunks) {
        let tickets;
        try {
            tickets = await expo.sendPushNotificationsAsync(chunk);
        }
        catch (error) {
            v2_1.logger.error("[ExpoPushService] Chunk send error:", error);
            result.failed += chunk.length;
            continue;
        }
        tickets.forEach((ticket, index) => {
            const recipient = recipients[messages.indexOf(chunk[index])];
            if (ticket.status === "ok") {
                result.successful++;
            }
            else {
                result.failed++;
                const details = ticket.details;
                const errorCode = details === null || details === void 0 ? void 0 : details.error;
                if (errorCode && PERMANENT_ERROR_CODES.has(errorCode)) {
                    v2_1.logger.warn(`[ExpoPushService] Permanent error "${errorCode}" for uid=${recipient === null || recipient === void 0 ? void 0 : recipient.uid}`);
                    if (recipient) {
                        result.invalidTokens.push(recipient.token);
                        result.invalidUids.push(recipient.uid);
                    }
                }
                else {
                    v2_1.logger.warn(`[ExpoPushService] Transient error for uid=${recipient === null || recipient === void 0 ? void 0 : recipient.uid}: ${errorCode}`);
                }
            }
        });
    }
    v2_1.logger.info(`[ExpoPushService] Sent ${result.successful} ok, ${result.failed} failed`);
    return result;
}
//# sourceMappingURL=expoPush.service.js.map