export interface NotificationPreferences {
  dailyAyah: boolean;
  fridayReminder: boolean;
}

export interface UserNotificationData {
  uid: string;
  expoPushToken: string;
  notificationsEnabled: boolean;
  preferences: NotificationPreferences;
}

export interface AyahSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: "Medinan" | "Meccan";
}

export interface AyahVerseTranslations {
  sahih_international: string;
  pickthall: string;
  yusuf_ali: string;
  urdu: string;
  bengali: string;
  [key: string]: string;
}

export interface AyahVerse {
  verse_key: string;
  ayah: number;
  arabic: string;
  transliteration: string;
  translations: AyahVerseTranslations;
}

export interface AyahData {
  surah: AyahSurah;
  verse: AyahVerse;
  total_verses: number;
}

export interface AyahApiResponse {
  data: AyahData;
}

export interface AyahNotificationPayload {
  type: "ayah";
  surah: string;
  ayahNumber: number;
  surahNumber: number;
}

export interface JummahNotificationPayload {
  type: "jummah";
}

export type NotificationPayload =
  | AyahNotificationPayload
  | JummahNotificationPayload;

export interface SendResult {
  successful: number;
  failed: number;
  invalidTokens: string[];
}
