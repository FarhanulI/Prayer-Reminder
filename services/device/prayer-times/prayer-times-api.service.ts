import { PrayerTimesMethodResponse } from "@/types";
import { formatApiDate } from "../utils/date.utils";

export const fetchPrayerTimes = async (
  latitude: number | undefined,
  longitude: number | undefined,
  targetDate: Date = new Date(),
  retries = 3,
  delayMs = 1000,
): Promise<PrayerTimesMethodResponse | null> => {
  if (!latitude || !longitude) return null;

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const formattedDate = formatApiDate(targetDate);

      const response = await fetch(
        `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${latitude}&longitude=${longitude}&method=3&school=1`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();

      if (json.code === 200) {
        return { prayerTimings: json.data?.timings, date: json.data?.date };
      }

      throw new Error(json.data || "Failed to fetch prayer times");
    } catch (error) {
      console.warn(`Attempt ${attempt} to fetch prayer times failed:`, error);

      if (attempt === retries) {
        console.error("All attempts to fetch prayer times failed:", error);
        return null;
      }

      await delay(delayMs * Math.pow(2, attempt - 1));
    }
  }

  return null;
};
