import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./lib/firebase";
import { ForbiddenWindow, PrayerCollection, UserDocument } from "./types";

export const getForbiddenTimes = (sunTimings: { sunrise: string | null, sunset: string | null }, prayerTimes: PrayerCollection): ForbiddenWindow[] | null => {
    const addMinutes = (time: string, mins: number) => {
        const [hr, mm] = time?.split(':').map(Number);
        const date = new Date();
        date.setHours(hr, mm + mins);
        return date.toTimeString().slice(0, 5);
    };

    return [
        {
            label: "Sunrise (Shuruq)",
            start: sunTimings.sunrise || '', // 05:36
            end: addMinutes(sunTimings.sunrise || '', 15) // ~05:51
        },
        {
            label: "Zenith (Zawal)",
            start: addMinutes(prayerTimes?.dhuhr?.time || '', -10), // ~11:48
            end: prayerTimes?.dhuhr?.time // 11:58
        },
        {
            label: "Sunset (Ghurub)",
            start: addMinutes(prayerTimes?.maghrib?.time || '', -15), // ~18:06
            end: prayerTimes?.maghrib?.time // 18:21
        }
    ];
};

export const getUserInfo = async (uid: string): Promise<UserDocument> => {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.data() as UserDocument;
}

export const saveUserInfo = async (uid: string, info: UserDocument): Promise<void> => {
    await setDoc(
        doc(db, "users", uid),
        info,
        { merge: true }
    );
}


// eas build --platform android --profile development
