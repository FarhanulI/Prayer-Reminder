import { PrayerLogDocument } from "@/types";
import dayjs from "dayjs";
import { TPrayerList } from "./UpcomingPrayerCard";

/**
 * Formats Gregorian date to a short readable string (e.g. "Mon, 18 May").
 */
export const getEnglishDateString = (gregorian: any): string => {
  if (gregorian) {
    const weekdayShort = gregorian.weekday?.en
      ? gregorian.weekday.en.substring(0, 3)
      : "";
    const monthShort = gregorian.month?.en
      ? gregorian.month.en.substring(0, 3)
      : "";
    return `${weekdayShort ? weekdayShort + ", " : ""}${gregorian.day} ${monthShort}`;
  }
  return dayjs().format("ddd, D MMM");
};

export const createPrayerList = (
  prayerData: PrayerLogDocument | null | undefined,
) => {
  if (!prayerData?.prayers) return [];

  const today = dayjs().format("YYYY-MM-DD");
  const keys = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
  const labels: Record<(typeof keys)[number], string> = {
    fajr: "Fajr",
    dhuhr: "Dhuhr",
    asr: "Asr",
    maghrib: "Maghrib",
    isha: "Isha",
  };

  return keys.map((key) => {
    const p = prayerData.prayers[key];
    return {
      name: labels[key],
      time: formatPrayerTime(p?.time),
      rawTime: p?.time ?? "",
      end: p?.end ?? "",
      isPrayed: !!p?.isPrayed,
      skipped: !!p?.skipped,
      date: today,
    };
  });
};

/**
 * Formats Hijri date to a short readable string (e.g. "18 Dhu al-Qi'dah 1447").
 */
export const getHijriDateString = (hijri: any): string => {
  if (hijri) {
    const day = hijri.day;
    const year = hijri.year;
    const monthEn = hijri.month?.en || "";
    return `${day} ${monthEn} ${year}`;
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-US-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const formatted = formatter.format(new Date());
    const dayMatch = formatted.match(/\d+/);
    const yearMatch = formatted.match(/\d{4}/);
    const day = dayMatch ? dayMatch[0] : "18";
    const year = yearMatch ? yearMatch[0] : "1447";
    const month = formatted
      .replace(day, "")
      .replace(year, "")
      .replace("AH", "")
      .replace(/[,]/g, "")
      .trim();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return "18 Dhu al-Qi'dah 1447";
  }
};

/**
 * Formats reverse geocoding result into a city, country string.
 */
export const formatLocationName = (result: any): string => {
  if (!result) return "Unknown Location";
  const loc = [result.city || result.subregion || result.region, result.country]
    .filter(Boolean)
    .join(", ");
  return loc || "Unknown Location";
};

/** Formats a raw prayer time string (e.g. "04:32 (UTC)") to "4:32 AM". */
export function formatPrayerTime(raw: string | undefined): string {
  if (!raw) return "--:--";
  const clean = raw.split(" ")[0];
  return dayjs(`2000-01-01 ${clean}`).format("h:mm A");
}

export const handleCurrentInfo = (
  prayerList: TPrayerList[],
  yesterdayData: PrayerLogDocument,
) => {
  if (!prayerList || prayerList.length === 0) return null;

  const now = dayjs();
  const today = now.format("YYYY-MM-DD");
  const yesterday = now.subtract(1, "day").format("YYYY-MM-DD");

  const times = [
    ...(yesterdayData?.prayers?.isha
      ? [
          {
            name: "Isha",
            time: yesterdayData.prayers.isha.time,
            end: yesterdayData.prayers.isha.end,
            isPrayed: !!yesterdayData.prayers.isha.isPrayed,
            skipped: !!yesterdayData.prayers.isha.skipped,
            date: yesterday,
            dateTime: dayjs(`${yesterday} ${yesterdayData.prayers.isha.time}`),
            isYesterday: true,
          },
        ]
      : []),
    ...prayerList.map((p) => ({
      ...p,
      date: today,
      dateTime: p.rawTime ? dayjs(`${today} ${p.rawTime}`) : dayjs(),
      isYesterday: false,
    })),
  ];

  const active = [...times].reverse().find((p) => !p.dateTime.isAfter(now));
  const upcoming = times.find((p) => p.dateTime.isAfter(now));

  if (active) {
    let endTime = dayjs(`${active.date} ${active.end}`);
    if (endTime.isBefore(active.dateTime)) endTime = endTime.add(1, "day");

    if (!now.isAfter(endTime)) {
      return {
        title: "Current Prayer",
        name: active.name,
        time: active.time,
        date: active.date,
        countdownTarget: endTime.toISOString(),
        isYesterday: active.isYesterday,
        isPrayed: active.isPrayed,
        isSkipped: active.skipped,
      };
    }
  }

  const fallback = upcoming ?? {
    ...times[0],
    dateTime: times[0].dateTime.add(1, "day"),
    date: dayjs(today).add(1, "day").format("YYYY-MM-DD"),
  };

  return {
    title: "Upcoming Prayer",
    name: fallback.name,
    time: fallback.time,
    date: fallback.date,
    countdownTarget: fallback.dateTime.toISOString(),
    isYesterday: false,
    isPrayed: false,
    isSkipped: false,
  };
};

export function handleCheckYesterdaysLastPendingPrayer(
  yesterdayData: PrayerLogDocument,
): boolean {
  // 1. Target the Isha prayer directly from yesterday's log
  const isha = yesterdayData?.prayers?.isha;
  if (!isha) return false;

  // RULE 1: If I prayed (or explicitly skipped), return false
  if (isha.isPrayed || isha.skipped) {
    return false;
  }

  // Extract and clean timestamps safely
  const cleanTime = isha.time?.split(" ")[0];
  const cleanEnd = isha.end?.split(" ")[0];
  if (!cleanTime || !cleanEnd) return false;

  const now = dayjs();
  const yesterdayStr = now.subtract(1, "day").format("YYYY-MM-DD");

  const startTimeObj = dayjs(`${yesterdayStr} ${cleanTime}`);
  let endTimeObj = dayjs(`${yesterdayStr} ${cleanEnd}`);

  // Midnight Rollover: If Isha's end time is numerically before its start time
  // (e.g., starts at 9:00 PM yesterday and ends at 1:30 AM today), push the deadline to today.
  if (endTimeObj.isBefore(startTimeObj)) {
    endTimeObj = endTimeObj.add(1, "day");
  }

  // RULE 2: When the prayer end time has passed, return false
  if (now.isAfter(endTimeObj)) {
    return false;
  }

  // If you haven't prayed yet and the deadline hasn't passed, return true
  return true;
}
