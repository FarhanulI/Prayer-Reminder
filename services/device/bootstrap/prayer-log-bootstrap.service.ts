import dayjs from "dayjs";
import * as Location from "expo-location";
import { serverTimestamp } from "firebase/firestore";
import { getLocation } from "../location/location.service";
import { createBootstrapPrayerCollection } from "../prayer-logs/prayer-log.factory";
import { fetchPrayerTimes } from "../prayer-times/prayer-times-api.service";
import {
    getPrayerLogDoc,
    setPrayerLogDoc,
} from "../repositories/prayer-log.repository";
import { getUserDoc, updateUser } from "../repositories/user.repository";

const resolveLocation = async (
  userLocation: Location.LocationObjectCoords | null,
): Promise<Location.LocationObjectCoords> => {
  if (userLocation) {
    return userLocation;
  }

  const currentLocation = await getLocation();
  if (!currentLocation?.coords) {
    throw new Error("Location unavailable. Please enable location services.");
  }

  return currentLocation.coords;
};

export const createPrayerLog = async (
  uid: string,
  date: string,
  location: Location.LocationObjectCoords,
) => {
  const prayerData = await fetchPrayerTimes(
    location.latitude,
    location.longitude,
    dayjs(date).toDate(),
  );

  if (!prayerData?.prayerTimings) {
    throw new Error(`Unable to fetch prayer times for ${date}`);
  }

  const prayersList = createBootstrapPrayerCollection(prayerData.prayerTimings);

  await setPrayerLogDoc(
    uid,
    date,
    {
      date,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      prayers: prayersList,
    },
    false,
  );

  return prayersList;
};

const shouldCreateYesterdayLog = async (
  location: Location.LocationObjectCoords,
) => {
  const prayerData = await fetchPrayerTimes(
    location.latitude,
    location.longitude,
    new Date(),
  );

  const fajr = prayerData?.prayerTimings?.Fajr;
  if (!fajr) {
    return dayjs().hour() < 6;
  }

  const today = dayjs().format("YYYY-MM-DD");
  const fajrTime = dayjs(`${today} ${fajr.split(" ")[0]}`);

  return dayjs().isBefore(fajrTime);
};

export const createPrayerLogIfNeeded = async (
  uid: string,
  userLocation: Location.LocationObjectCoords | null,
) => {
  const now = dayjs();
  const today = now.format("YYYY-MM-DD");
  const yesterday = now.subtract(1, "day").format("YYYY-MM-DD");
  const tomorrow = now.add(1, "day").format("YYYY-MM-DD");

  const [todayLogSnap, tomorrowLogSnap] = await Promise.all([
    getPrayerLogDoc(uid, today),
    getPrayerLogDoc(uid, tomorrow),
  ]);

  if (todayLogSnap.exists() && tomorrowLogSnap.exists()) {
    return true;
  }

  const userSnap = await getUserDoc(uid);
  if (!userSnap.exists()) {
    throw new Error("User document not found");
  }

  const location = await resolveLocation(userLocation);
  const needYesterday = await shouldCreateYesterdayLog(location);
  const datesToCheck = [...(needYesterday ? [yesterday] : []), today, tomorrow];

  const snapshotMap = new Map<
    string,
    Awaited<ReturnType<typeof getPrayerLogDoc>>
  >([
    [today, todayLogSnap],
    [tomorrow, tomorrowLogSnap],
  ]);

  const remainingDates = datesToCheck.filter((date) => !snapshotMap.has(date));

  if (remainingDates.length > 0) {
    const remainingSnapshots = await Promise.all(
      remainingDates.map((date) => getPrayerLogDoc(uid, date)),
    );

    remainingDates.forEach((date, index) => {
      snapshotMap.set(date, remainingSnapshots[index]);
    });
  }

  const createJobs = datesToCheck
    .filter((date) => !snapshotMap.get(date)?.exists())
    .map((date) => createPrayerLog(uid, date, location));

  if (createJobs.length > 0) {
    await Promise.all(createJobs);
  }

  await updateUser(uid, {
    location,
    lastPrayerRefreshDate: today,
    updatedAt: serverTimestamp(),
  });

  return true;
};
