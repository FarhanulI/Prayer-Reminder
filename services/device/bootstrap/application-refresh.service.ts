import dayjs from "dayjs";
import { getLocation } from "../location/location.service";
import { getDeviceToken } from "../notification/device-token.service";
import { saveDailyPrayerTimes } from "../prayer-logs/prayer-log.service";
import { fetchPrayerTimes } from "../prayer-times/prayer-times-api.service";
import { getUserDoc, updateUser } from "../repositories/user.repository";
import { saveUserDeviceInfo } from "../user/device-user.service";
import { isLocationChangedSignificantly } from "../utils/location.utils";

export const refreshApplicationData = async (uid: string) => {
  try {
    const [deviceToken, location] = await Promise.all([
      getDeviceToken(),
      getLocation(),
    ]);

    const userSnap = await getUserDoc(uid);
    const userData = userSnap.data();

    const lastDate = userData?.lastPrayerRefreshDate;
    const storedLocation = userData?.location;
    const today = dayjs().format("YYYY-MM-DD");

    let needsPrayerTimesRefresh = false;

    if (today !== lastDate) {
      needsPrayerTimesRefresh = true;
    } else if (
      location?.coords &&
      isLocationChangedSignificantly(storedLocation, location.coords)
    ) {
      needsPrayerTimesRefresh = true;
    }

    await saveUserDeviceInfo(uid, {
      deviceToken,
      location: location?.coords || storedLocation || null,
    });

    if (!needsPrayerTimesRefresh) {
      console.log(
        "Skipping prayer times API refresh: location and date are unchanged.",
      );
      return true;
    }

    const lat = location?.coords?.latitude || storedLocation?.latitude;
    const lng = location?.coords?.longitude || storedLocation?.longitude;

    if (lat && lng) {
      const prayerTimes = await fetchPrayerTimes(lat, lng);
      if (prayerTimes?.prayerTimings) {
        await saveDailyPrayerTimes(uid, prayerTimes.prayerTimings);
        await updateUser(uid, { lastPrayerRefreshDate: today });
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to refresh application data:", error);
    throw error;
  }
};
