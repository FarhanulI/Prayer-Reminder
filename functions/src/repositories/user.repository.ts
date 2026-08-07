import { Expo } from "expo-server-sdk";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { UserNotificationData } from "../types";

const db = getFirestore();

async function getUsersForNotification(
  preferenceField: keyof UserNotificationData["preferences"],
): Promise<UserNotificationData[]> {
  const snapshot = await db
    .collection("users")
    .where("notificationsEnabled", "==", true)
    .where(`preferences.${preferenceField}`, "==", true)
    .get();

  const users: UserNotificationData[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const token: string = data.expoPushToken;

    if (!token || !Expo.isExpoPushToken(token)) {
      logger.warn(
        `[UserRepository] Invalid or missing token for uid=${doc.id}`,
      );
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

export async function getUsersForDailyAyah(): Promise<UserNotificationData[]> {
  return getUsersForNotification("dailyAyah");
}

export async function getUsersForFridayReminder(): Promise<
  UserNotificationData[]
> {
  return getUsersForNotification("fridayReminder");
}

export async function removeInvalidTokens(uids: string[]): Promise<void> {
  if (uids.length === 0) return;

  const batch = db.batch();
  for (const uid of uids) {
    const ref = db.collection("users").doc(uid);
    batch.update(ref, { expoPushToken: null, notificationsEnabled: false });
  }

  await batch.commit();
  logger.info(
    `[UserRepository] Removed invalid tokens for ${uids.length} users`,
  );
}
