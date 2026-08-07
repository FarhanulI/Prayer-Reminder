import { Timings } from "@/types";
import dayjs from "dayjs";
import { fetchPrayerTimes } from "../prayer-times/prayer-times-api.service";
import {
    getPrayerLogDoc,
    setPrayerLogDoc,
} from "../repositories/prayer-log.repository";
import { getUserDoc } from "../repositories/user.repository";
import {
    createDailyPrayerStatusCollection,
    mergeDailyPrayerTimes,
} from "./prayer-log.factory";

export const saveDailyPrayerTimes = async (uid: string, timings: Timings) => {
  try {
    const today = dayjs().format("YYYY-MM-DD");
    const docSnap = await getPrayerLogDoc(uid, today);

    if (docSnap.exists()) {
      const currentData = docSnap.data();
      const currentPrayers = (currentData.prayers || {}) as Record<
        string,
        Record<string, unknown>
      >;
      const updatedPrayers = mergeDailyPrayerTimes(currentPrayers, timings);

      await setPrayerLogDoc(uid, today, { prayers: updatedPrayers }, true);
      console.log("Updated daily prayer logs timings for:", today);
      return;
    }

    await setPrayerLogDoc(
      uid,
      today,
      {
        prayers: createDailyPrayerStatusCollection(timings),
        prayerCount: 0,
      },
      true,
    );

    console.log("Daily prayer logs initialized for:", today);
  } catch (error) {
    console.error("Error saving daily prayer logs:", error);
  }
};

export const createTomorrowPrayerLog = async (uid: string) => {
  try {
    const tomorrow = dayjs().add(1, "day");
    const tomorrowStr = tomorrow.format("YYYY-MM-DD");

    const docSnap = await getPrayerLogDoc(uid, tomorrowStr);
    if (docSnap.exists()) {
      return;
    }

    const userDoc = await getUserDoc(uid);
    const location = userDoc.data()?.location;

    if (!location?.latitude || !location?.longitude) {
      console.log("No location found to create tomorrow's prayer log.");
      return;
    }

    const prayerTimes = await fetchPrayerTimes(
      location.latitude,
      location.longitude,
      tomorrow.toDate(),
    );

    if (!prayerTimes?.prayerTimings) {
      return;
    }

    await setPrayerLogDoc(
      uid,
      tomorrowStr,
      {
        prayers: createDailyPrayerStatusCollection(prayerTimes.prayerTimings),
        prayerCount: 0,
      },
      true,
    );

    console.log("Tomorrow's prayer logs initialized for:", tomorrowStr);
  } catch (error) {
    console.error("Error creating tomorrow's prayer logs:", error);
  }
};
