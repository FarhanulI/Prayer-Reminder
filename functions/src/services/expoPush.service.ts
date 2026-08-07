import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { logger } from "firebase-functions/v2";
import { SendResult } from "../types";

const expo = new Expo({ useFcmV1: true });

// Expo push error codes that indicate a permanently invalid token
const PERMANENT_ERROR_CODES = new Set([
  "DeviceNotRegistered",
  "InvalidCredentials",
]);

export interface RecipientMessage {
  uid: string;
  token: string;
  message: Omit<ExpoPushMessage, "to">;
}

export async function sendPushNotifications(
  recipients: RecipientMessage[],
): Promise<SendResult & { invalidUids: string[] }> {
  const messages: ExpoPushMessage[] = recipients.map((r) => ({
    ...r.message,
    to: r.token,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const result: SendResult & { invalidUids: string[] } = {
    successful: 0,
    failed: 0,
    invalidTokens: [],
    invalidUids: [],
  };

  for (const chunk of chunks) {
    let tickets: ExpoPushTicket[];

    try {
      tickets = await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      logger.error("[ExpoPushService] Chunk send error:", error);
      result.failed += chunk.length;
      continue;
    }

    tickets.forEach((ticket, index) => {
      const recipient = recipients[messages.indexOf(chunk[index])];

      if (ticket.status === "ok") {
        result.successful++;
      } else {
        result.failed++;
        const details = (ticket as { details?: { error?: string } }).details;
        const errorCode = details?.error;

        if (errorCode && PERMANENT_ERROR_CODES.has(errorCode)) {
          logger.warn(
            `[ExpoPushService] Permanent error "${errorCode}" for uid=${recipient?.uid}`,
          );
          if (recipient) {
            result.invalidTokens.push(recipient.token);
            result.invalidUids.push(recipient.uid);
          }
        } else {
          logger.warn(
            `[ExpoPushService] Transient error for uid=${recipient?.uid}: ${errorCode}`,
          );
        }
      }
    });
  }

  logger.info(
    `[ExpoPushService] Sent ${result.successful} ok, ${result.failed} failed`,
  );

  return result;
}
