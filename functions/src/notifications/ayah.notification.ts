import { ExpoPushMessage } from "expo-server-sdk";
import { AyahData, AyahNotificationPayload } from "../types";

export function buildAyahNotification(
  ayah: AyahData,
): Omit<ExpoPushMessage, "to"> {
  const payload: AyahNotificationPayload = {
    type: "ayah",
    surah: ayah.surah.englishName,
    surahNumber: ayah.surah.number,
    ayahNumber: ayah.verse.ayah,
  };

  return {
    title: `Ayah of the Day — ${ayah.surah.englishName}`,
    body: ayah.verse.translations.sahih_international,
    sound: "default",
    // @ts-ignore
    data: payload,
    channelId: "daily-ayah",
  };
}
