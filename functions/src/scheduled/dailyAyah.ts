import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { buildAyahNotification } from "../notifications/ayah.notification";
import {
    getUsersForDailyAyah,
    removeInvalidTokens,
} from "../repositories/user.repository";
import {
    RecipientMessage,
    sendPushNotifications,
} from "../services/expoPush.service";
import { AyahApiResponse, AyahData } from "../types";

// Mirrors the fetch in useGetRandomAyah — same endpoint, no React Query
async function fetchRandomAyah(): Promise<AyahData> {
  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL;
  if (!baseUrl)
    throw new Error("[dailyAyah] BASE_URL environment variable is not set");

  const response = await fetch(`${baseUrl}/api/quran/random`);
  if (!response.ok)
    throw new Error(`Ayah API responded with status ${response.status}`);

  const { data }: AyahApiResponse = await response.json();
  return data;
}

// Runs at 7:00 AM UTC daily
export const dailyAyah = onSchedule(
  {
    schedule: "0 7 * * *",
    timeZone: "UTC",
    memory: "256MiB",
  },
  async () => {
    logger.info("[dailyAyah] Function started");

    let ayah;
    try {
      ayah = await fetchRandomAyah();
    } catch (error) {
      logger.error("[dailyAyah] Failed to fetch Ayah:", error);
      return;
    }

    const users = await getUsersForDailyAyah();
    logger.info(`[dailyAyah] ${users.length} eligible users found`);

    if (users.length === 0) return;

    const notification = buildAyahNotification(ayah);

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
      `[dailyAyah] Done — sent: ${result.successful}, failed: ${result.failed}, ` +
        `invalid tokens removed: ${result.invalidUids.length}`,
    );
  },
);
