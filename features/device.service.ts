import { db } from "@/lib/firebase";
import {
  OnboardingData,
  PrayerTimesMethodResponse,
  Timings
} from "@/types";
import dayjs from "dayjs";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export const getDeviceToken = async () => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return null;

    // Since you added google-services.json, we can fetch the native Firebase
    // Cloud Messaging (FCM) token directly without needing an Expo Project ID!
    const token = await Notifications.getDevicePushTokenAsync();
    return token.data;
  } catch (error) {
    console.log("Failed to get native push token:", error);
    return null;
  }
};

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
      const date = targetDate;
      const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

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

// export const fetchQibla = async (
//   latitude: number | undefined | null,
//   longitude: number | undefined | null,
//   retries = 3,
//   delayMs = 1000,
// ): Promise<QiblaResponse | null> => {
//   if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
//     return null;
//   }
//   const delay = (ms: number) =>
//     new Promise((resolve) => setTimeout(resolve, ms));

//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       const response = await fetch(
//         `https://www.ummahapi.com/api/qibla?lat=${latitude}&lng=${longitude}`,
//       );

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const json = await response.json();

//       if (json.success) {
//         return json;
//       }

//       throw new Error(json.message || "Failed to fetch Qibla direction");
//     } catch (error) {
//       console.warn(`Attempt ${attempt} to fetch Qibla direction failed:`, error);
//       if (attempt === retries) {
//         console.error("All attempts to fetch Qibla direction failed:", error);
//         return null;
//       }
//       await delay(delayMs * Math.pow(2, attempt - 1));
//     }
//   }
//   return null;
// };

export const getLocation =
  async (): Promise<Location.LocationObject | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!location) return null;

      return location;
    } catch (error) {
      console.log("Failed to get location:", error);
      return null;
    }
  };

export const saveUserDeviceInfo = async (
  uid: string,
  data: {
    deviceToken?: string | null;
    location: Location.LocationObjectCoords | null;
  },
) => {
  await setDoc(
    doc(db, "users", uid),
    {
      deviceToken: data.deviceToken ?? null,
      location: data.location ?? null,
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    },
    { merge: true },
  );
};

export const saveDailyPrayerTimes = async (uid: string, timings: Timings) => {
  try {
    const today = dayjs().format("YYYY-MM-DD");
    // Using 'prayer_logs' as the single source of truth
    const prayerLogsRef = doc(db, "users", uid, "prayer_logs", today);

    const docSnap = await getDoc(prayerLogsRef);
    if (docSnap.exists()) {
      const currentData = docSnap.data();
      const currentPrayers = currentData.prayers || {};

      const updatedPrayers = {
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
      };

      await setDoc(prayerLogsRef, { prayers: updatedPrayers }, { merge: true });
      console.log("Updated daily prayer logs timings for:", today);
      return;
    }

    await setDoc(
      prayerLogsRef,
      {
        prayers: {
          fajr: {
            isPrayed: false,
            time: timings.Fajr,
            end: timings.Sunrise,
            status: null,
            completedAt: null,
            skippedAt: null,
          },
          dhuhr: {
            isPrayed: false,
            time: timings.Dhuhr,
            end: timings.Asr,
            status: null,
            completedAt: null,
            skippedAt: null,
          },
          asr: {
            isPrayed: false,
            time: timings.Asr,
            end: timings.Sunset,
            status: null,
            completedAt: null,
            skippedAt: null,
          },
          maghrib: {
            isPrayed: false,
            time: timings.Maghrib,
            end: timings.Isha,
            status: null,
            completedAt: null,
            skippedAt: null,
          },
          isha: {
            isPrayed: false,
            time: timings.Isha,
            end: timings.Fajr,
            status: null,
            completedAt: null,
            skippedAt: null,
          },
        },
        prayerCount: 0,
      },
      { merge: true },
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
    const prayerLogsRef = doc(db, "users", uid, "prayer_logs", tomorrowStr);

    const docSnap = await getDoc(prayerLogsRef);
    if (docSnap.exists()) {
      return;
    }

    const userDoc = await getDoc(doc(db, "users", uid));
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

    const timings = prayerTimes.prayerTimings;

    await setDoc(
      prayerLogsRef,
      {
        prayers: {
          fajr: {
            isPrayed: false,
            time: timings.Fajr,
            end: timings.Sunrise,
            status: null,
            completedAt: null,
            skippedAt: null,
          },
          dhuhr: {
            isPrayed: false,
            time: timings.Dhuhr,
            end: timings.Asr,
            status: null,
            completedAt: null,
            skippedAt: null,
          },
          asr: {
            isPrayed: false,
            time: timings.Asr,
            end: timings.Sunset,
            status: null,
            completedAt: null,
            skippedAt: null,
          },
          maghrib: {
            isPrayed: false,
            time: timings.Maghrib,
            end: timings.Isha,
            status: null,
            completedAt: null,
            skippedAt: null,
          },
          isha: {
            isPrayed: false,
            time: timings.Isha,
            end: timings.Fajr,
            status: null,
            completedAt: null,
            skippedAt: null,
          },
        },
        prayerCount: 0,
      },
      { merge: true },
    );
    console.log("Tomorrow's prayer logs initialized for:", tomorrowStr);
  } catch (error) {
    console.error("Error creating tomorrow's prayer logs:", error);
  }
};

export const saveOnboardingData = async (uid: string, data: OnboardingData) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    console.log("Onboarding data saved for:", uid);
  } catch (error) {
    console.error("Error saving onboarding data:", error);
    throw error;
  }
};

const getPrayerLogRef = (uid: string, date: string) =>
  doc(db, "users", uid, "prayer_logs", date);

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

const createPrayerLog = async (
  uid: string,
  date: string,
  location: Location.LocationObjectCoords,
) => {
  const prayerLogRef = getPrayerLogRef(uid, date);

  const prayerData = await fetchPrayerTimes(
    location.latitude,
    location.longitude,
    dayjs(date).toDate(),
  );

  if (!prayerData?.prayerTimings) {
    throw new Error(`Unable to fetch prayer times for ${date}`);
  }

  const timings = prayerData.prayerTimings;

  await setDoc(
    prayerLogRef,
    {
      date,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),

      prayers: {
        fajr: {
          time: timings.Fajr,
          end: timings.Sunrise,
          isPrayed: false,
          skipped: false,
        },

        dhuhr: {
          time: timings.Dhuhr,
          end: timings.Asr,
          isPrayed: false,
          skipped: false,
        },

        asr: {
          time: timings.Asr,
          end: timings.Maghrib,
          isPrayed: false,
          skipped: false,
        },

        maghrib: {
          time: timings.Maghrib,
          end: timings.Isha,
          isPrayed: false,
          skipped: false,
        },

        isha: {
          time: timings.Isha,
          end: timings.Fajr,
          isPrayed: false,
          skipped: false,
        },
      },
    },
    {
      merge: false,
    },
  );
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

  const userRef = doc(db, "users", uid);

  // Validate user
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("User document not found");
  }

  // Resolve location
  const location = await resolveLocation(userLocation);

  // Determine required dates
  const requiredDates = [today];

  const needYesterday = await shouldCreateYesterdayLog(location);

  if (needYesterday) {
    requiredDates.push(yesterday);
  }

  // Check all required logs in parallel
  const logSnapshots = await Promise.all(
    requiredDates.map((date) => getDoc(getPrayerLogRef(uid, date))),
  );

  // Create missing logs
  const createJobs = requiredDates
    .filter((_, index) => !logSnapshots[index].exists())
    .map((date) => createPrayerLog(uid, date, location));

  if (createJobs.length) {
    await Promise.all(createJobs);
  }

  // Update user metadata
  await updateDoc(userRef, {
    location,
    lastPrayerRefreshDate: today,
    updatedAt: serverTimestamp(),
  });

  return true;
};

const isLocationChangedSignificantly = (
  loc1: Location.LocationObjectCoords | null | undefined,
  loc2: Location.LocationObjectCoords | null | undefined,
) => {
  if (!loc1 || !loc2) return true;
  const threshold = 0.1; // roughly ~11km
  const latDiff = Math.abs(loc1.latitude - loc2.latitude);
  const lngDiff = Math.abs(loc1.longitude - loc2.longitude);
  return latDiff > threshold || lngDiff > threshold;
};

/**
 * Refreshes the full application state for a user by:
 * 1. Updating the device token
 * 2. Getting the current location
 * 3. Checking if we need to refresh prayer times (if today !== lastPrayerRefreshDate or location changed significantly)
 * 4. Fetching fresh prayer times from the API if needed
 * 5. Saving everything back to Firestore
 */
export const refreshApplicationData = async (uid: string) => {
  try {
    const [deviceToken, location] = await Promise.all([
      getDeviceToken(),
      getLocation(),
    ]);

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
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

    // Update basic user info (non-blocking, merge: true)
    await saveUserDeviceInfo(uid, {
      deviceToken,
      location: location?.coords || storedLocation || null,
    });

    // Only fetch prayer times if today is a new day or the location changed significantly
    if (needsPrayerTimesRefresh) {
      const lat = location?.coords?.latitude || storedLocation?.latitude;
      const lng = location?.coords?.longitude || storedLocation?.longitude;

      if (lat && lng) {
        const prayerTimes = await fetchPrayerTimes(lat, lng);
        if (prayerTimes?.prayerTimings) {
          await saveDailyPrayerTimes(uid, prayerTimes.prayerTimings);
          await updateDoc(userRef, {
            lastPrayerRefreshDate: today,
          });
        }
      }
    } else {
      console.log(
        "Skipping prayer times API refresh: location and date are unchanged.",
      );
    }

    return true;
  } catch (error) {
    console.error("Failed to refresh application data:", error);
    throw error;
  }
};
