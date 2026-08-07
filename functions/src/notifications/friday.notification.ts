import { ExpoPushMessage } from "expo-server-sdk";
import { JummahNotificationPayload } from "../types";

export function buildFridayNotification(): Omit<ExpoPushMessage, "to"> {
  const payload: JummahNotificationPayload = { type: "jummah" };

  return {
    title: "Jumu'ah Mubarak",
    body: "Recite Surah Al-Kahf and prepare for Jumu'ah prayer.",
    sound: "default",
    // @ts-ignore
    data: payload,
    channelId: "friday-reminder",
  };
}
