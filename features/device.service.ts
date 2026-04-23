import { db } from "@/lib/firebase";
import { DateInfo, OnboardingData, PrayerTimesMethodResponse, Timings } from "@/types";
import dayjs from "dayjs";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";


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


export const fetchPrayerTimes = async (latitude: number | undefined, longitude: number | undefined): Promise<PrayerTimesMethodResponse | null> => {
    if (!latitude || !longitude) return null;
    try {
        // 2. Format today's date (DD-MM-YYYY)
        const date = new Date();
        const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

        // 3. Call AlAdhan API
        // Method 3 = Muslim World League (common standard)
        const response = await fetch(
            `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${latitude}&longitude=${longitude}&method=3`
        );

        const json = await response.json();

        if (json.code === 200) {
            console.log("Prayer Timings:", json.data.timings);
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
        const prayerTimesRef = doc(db, "users", uid, "prayerTimes", today);

        await setDoc(
            prayerTimesRef,
            {
                fajr: { done: false, time: timings.Fajr },
                dhuhr: { done: false, time: timings.Dhuhr },
                asr: { done: false, time: timings.Asr },
                maghrib: { done: false, time: timings.Maghrib },
                isha: { done: false, time: timings.Isha },
            },
            { merge: true }
        );
        console.log("Daily prayer times initialized for:", today);
    } catch (error) {
        console.error("Error saving daily prayer times:", error);
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