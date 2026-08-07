import { Timings } from "@/types";

type PrayerRecord = Record<string, Record<string, unknown>>;

const createPrayerStatusEntry = (time: string, end: string) => ({
  isPrayed: false,
  time,
  end,
  status: null,
  completedAt: null,
  skippedAt: null,
});

const createPrayerSkippedEntry = (time: string, end: string) => ({
  time,
  end,
  isPrayed: false,
  skipped: false,
});

export const createDailyPrayerStatusCollection = (timings: Timings) => ({
  fajr: createPrayerStatusEntry(timings.Fajr, timings.Sunrise),
  dhuhr: createPrayerStatusEntry(timings.Dhuhr, timings.Asr),
  asr: createPrayerStatusEntry(timings.Asr, timings.Sunset),
  maghrib: createPrayerStatusEntry(timings.Maghrib, timings.Isha),
  isha: createPrayerStatusEntry(timings.Isha, timings.Fajr),
});

export const createBootstrapPrayerCollection = (timings: Timings) => ({
  fajr: createPrayerSkippedEntry(timings.Fajr, timings.Sunrise),
  dhuhr: createPrayerSkippedEntry(timings.Dhuhr, timings.Asr),
  asr: createPrayerSkippedEntry(timings.Asr, timings.Maghrib),
  maghrib: createPrayerSkippedEntry(timings.Maghrib, timings.Isha),
  isha: createPrayerSkippedEntry(timings.Isha, timings.Fajr),
});

export const mergeDailyPrayerTimes = (
  currentPrayers: PrayerRecord,
  timings: Timings,
) => ({
  fajr: {
    ...(currentPrayers.fajr || {}),
    time: timings.Fajr,
    end: timings.Sunrise,
  },
  dhuhr: {
    ...(currentPrayers.dhuhr || {}),
    time: timings.Dhuhr,
    end: timings.Asr,
  },
  asr: {
    ...(currentPrayers.asr || {}),
    time: timings.Asr,
    end: timings.Sunset,
  },
  maghrib: {
    ...(currentPrayers.maghrib || {}),
    time: timings.Maghrib,
    end: timings.Isha,
  },
  isha: {
    ...(currentPrayers.isha || {}),
    time: timings.Isha,
    end: timings.Fajr,
  },
});
