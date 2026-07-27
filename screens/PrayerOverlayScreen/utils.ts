import dayjs, { Dayjs } from "dayjs";
import { HADITHS, REMINDER_OPTIONS } from "./constants";
import { PrayerKey, ReminderOption } from "./types";

// Calculate the prayer end date for today or the next day when the end time
// has already passed (e.g., overnight Isha).
export function getPrayerEndDate(endTime: string, now: Dayjs) {
  const today = now.format("YYYY-MM-DD");
  let prayerEndDate = dayjs(`${today} ${endTime}`);

  if (prayerEndDate.isBefore(now)) {
    prayerEndDate = prayerEndDate.add(1, "day");
  }

  return prayerEndDate;
}

// Return human-friendly countdown text like "1h 23m 12s" or "Ended".
export function formatRemainingTime(now: Dayjs, endTime: string) {
  const prayerEndDate = getPrayerEndDate(endTime, now);
  const differenceInMs = prayerEndDate.diff(now);

  if (differenceInMs <= 0) {
    return "Ended";
  }

  const hours = Math.floor(differenceInMs / (1000 * 60 * 60));
  const minutes = Math.floor((differenceInMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((differenceInMs % (1000 * 60)) / 1000);

  const hoursDisplay = hours > 0 ? `${hours}h ` : "";
  const minutesDisplay = `${minutes}m `;
  const secondsDisplay = `${seconds}s`;

  return `${hoursDisplay}${minutesDisplay}${secondsDisplay}`;
}

// Resolve a prayer key from a name string safely against the HADITHS map.
export function getPrayerKey(prayerName: string): PrayerKey | null {
  const normalizedName = prayerName.toLowerCase() as PrayerKey;
  return normalizedName in HADITHS ? normalizedName : null;
}

// Generate reminder options (minutes + formatted times) while capping any
// options that fall after the prayer end time.
export function getAvailableReminderOptions(endTime: string) {
  const now = dayjs();
  const prayerEndDate = endTime ? getPrayerEndDate(endTime, now) : null;

  return REMINDER_OPTIONS.reduce<ReminderOption[]>((options, minutes) => {
    const targetTime = now.add(minutes, "minute");

    if (prayerEndDate && targetTime.isAfter(prayerEndDate)) {
      return options;
    }

    options.push({
      minutes,
      formattedTime: targetTime.format("h:mm A"),
      targetTime24: targetTime.format("HH:mm"),
    });

    return options;
  }, []);
}
