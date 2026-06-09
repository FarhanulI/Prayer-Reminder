import { db } from "@/lib/firebase";
import { DateInfo, OnboardingData, PrayerTimesMethodResponse, Timings } from "@/types";
import dayjs from "dayjs";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";


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
    targetDate: Date = new Date()
): Promise<PrayerTimesMethodResponse | null> => {
    if (!latitude || !longitude) return null;
    try {
        // 2. Format target date (DD-MM-YYYY)
        const date = targetDate;
        const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

        // 3. Call AlAdhan API
        // Method 3 = Muslim World League (common standard)
        const response = await fetch(
            `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${latitude}&longitude=${longitude}&method=3`
        );

        const json = await response.json();

        if (json.code === 200) {
            return { prayerTimings: json.data?.timings, date: json.data?.date };
        }

        throw Error('Failed to fetch prayer times');
    } catch (error) {
        console.error("Error fetching prayer times:", error);
        return null;
    }
};

export const getLocation = async (): Promise<Location.LocationObject | null> => {
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
        location: Location.LocationObjectCoords | null
        date?: DateInfo | null,
        sunTimings?: {
            sunrise: string | null
            sunset: string | null
        }
    }
) => {
    await setDoc(
        doc(db, "users", uid),
        {
            deviceToken: data.deviceToken ?? null,
            location: data.location ?? null,
            updatedAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            date: data.date ?? null,
            sunTimings: data.sunTimings ?? null
        },
        { merge: true }
    );
};

export const saveDailyPrayerTimes = async (uid: string, timings: Timings) => {
    try {
        const today = dayjs().format("YYYY-MM-DD");
        // Using 'prayer_logs' as the single source of truth
        const prayerLogsRef = doc(db, "users", uid, "prayer_logs", today);

        const docSnap = await getDoc(prayerLogsRef);
        if (docSnap.exists()) {
            return;
        }

        await setDoc(
            prayerLogsRef,
            {
                prayers: {
                    fajr: { isPrayed: false, time: timings.Fajr, end: timings.Sunrise, status: null, completedAt: null, skippedAt: null },
                    dhuhr: { isPrayed: false, time: timings.Dhuhr, end: timings.Asr, status: null, completedAt: null, skippedAt: null },
                    asr: { isPrayed: false, time: timings.Asr, end: timings.Sunset, status: null, completedAt: null, skippedAt: null },
                    maghrib: { isPrayed: false, time: timings.Maghrib, end: timings.Isha, status: null, completedAt: null, skippedAt: null },
                    isha: { isPrayed: false, time: timings.Isha, end: timings.Fajr, status: null, completedAt: null, skippedAt: null },
                },
                prayerCount: 0,
            },
            { merge: true }
        );
        console.log("Daily prayer logs initialized for:", today);
    } catch (error) {
        console.error("Error saving daily prayer logs:", error);
    }
};

export const createTomorrowPrayerLog = async (uid: string) => {
    try {
        const tomorrow = dayjs().add(1, 'day');
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

        const prayerTimes = await fetchPrayerTimes(location.latitude, location.longitude, tomorrow.toDate());
        
        if (!prayerTimes?.prayerTimings) {
            return;
        }

        const timings = prayerTimes.prayerTimings;

        await setDoc(
            prayerLogsRef,
            {
                prayers: {
                    fajr: { isPrayed: false, time: timings.Fajr, end: timings.Sunrise, status: null, completedAt: null, skippedAt: null },
                    dhuhr: { isPrayed: false, time: timings.Dhuhr, end: timings.Asr, status: null, completedAt: null, skippedAt: null },
                    asr: { isPrayed: false, time: timings.Asr, end: timings.Sunset, status: null, completedAt: null, skippedAt: null },
                    maghrib: { isPrayed: false, time: timings.Maghrib, end: timings.Isha, status: null, completedAt: null, skippedAt: null },
                    isha: { isPrayed: false, time: timings.Isha, end: timings.Fajr, status: null, completedAt: null, skippedAt: null },
                },
                prayerCount: 0,
            },
            { merge: true }
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

/**
 * Refreshes the full application state for a user by:
 * 1. Updating the device token
 * 2. Getting the current location
 * 3. Fetching fresh prayer times from the API
 * 4. Saving everything back to Firestore
 */
export const refreshApplicationData = async (uid: string) => {
    try {
        const [deviceToken, location] = await Promise.all([
            getDeviceToken(),
            getLocation(),
        ]);

        const prayerTimes = await fetchPrayerTimes(location?.coords.latitude, location?.coords.longitude);

        await saveUserDeviceInfo(uid, {
            deviceToken,
            location: location?.coords || null,
            date: prayerTimes?.date || null,
            sunTimings: {
                sunrise: prayerTimes?.prayerTimings.Sunrise || null,
                sunset: prayerTimes?.prayerTimings.Sunset || null,
            }
        });

        if (prayerTimes?.prayerTimings) {
            await saveDailyPrayerTimes(uid, prayerTimes.prayerTimings);
        }

        return true;
    } catch (error) {
        console.error("Failed to refresh application data:", error);
        throw error;
    }
};
