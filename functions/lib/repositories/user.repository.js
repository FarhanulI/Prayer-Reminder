"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsersForDailyAyah = getUsersForDailyAyah;
exports.getUsersForFridayReminder = getUsersForFridayReminder;
exports.removeInvalidTokens = removeInvalidTokens;
const expo_server_sdk_1 = require("expo-server-sdk");
const firestore_1 = require("firebase-admin/firestore");
const v2_1 = require("firebase-functions/v2");
const db = (0, firestore_1.getFirestore)();
async function getUsersForNotification(preferenceField) {
    const snapshot = await db
        .collection("users")
        .where("notificationsEnabled", "==", true)
        .where(`preferences.${preferenceField}`, "==", true)
        .get();
    const users = [];
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const token = data.expoPushToken;
        if (!token || !expo_server_sdk_1.Expo.isExpoPushToken(token)) {
            v2_1.logger.warn(`[UserRepository] Invalid or missing token for uid=${doc.id}`);
            continue;
        }
        users.push({
            uid: doc.id,
            expoPushToken: token,
            notificationsEnabled: data.notificationsEnabled,
            preferences: data.preferences,
        });
    }
    return users;
}
async function getUsersForDailyAyah() {
    return getUsersForNotification("dailyAyah");
}
async function getUsersForFridayReminder() {
    return getUsersForNotification("fridayReminder");
}
async function removeInvalidTokens(uids) {
    if (uids.length === 0)
        return;
    const batch = db.batch();
    for (const uid of uids) {
        const ref = db.collection("users").doc(uid);
        batch.update(ref, { expoPushToken: null, notificationsEnabled: false });
    }
    await batch.commit();
    v2_1.logger.info(`[UserRepository] Removed invalid tokens for ${uids.length} users`);
}
//# sourceMappingURL=user.repository.js.map