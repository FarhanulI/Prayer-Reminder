import { db } from "@/lib/firebase";
import { PrayerCollection } from "@/types";
import dayjs from "dayjs";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface StreakInfo {
    current: number;
    max: number;
    lastDate: string;
}

export interface UserStreaks {
    perfect: StreakInfo;
    strong: StreakInfo;
    growth: StreakInfo;
}

const DEFAULT_STREAK: StreakInfo = { current: 0, max: 0, lastDate: "" };

/**
 * Updates the user's streaks based on today's prayer performance.
 * @param uid User ID
 * @param date Today's date (YYYY-MM-DD)
 */
export const updateUserStreaks = async (uid: string, date: string) => {
    try {
        const userRef = doc(db, "users", uid);
        const logRef = doc(db, "users", uid, "prayer_logs", date);

        const [userSnap, logSnap] = await Promise.all([
            getDoc(userRef),
            getDoc(logRef)
        ]);

        if (!logSnap.exists()) return;

        const logData = logSnap.data() as PrayerCollection;
        const userData = userSnap.data();
        const currentStreaks: UserStreaks = userData?.streaks || {
            perfect: { ...DEFAULT_STREAK },
            strong: { ...DEFAULT_STREAK },
            growth: { ...DEFAULT_STREAK }
        };

        // Count today's completed prayers
        const completedCount = Object.values(logData).filter(p => p.isPrayed).length;

        const yesterday = dayjs(date).subtract(1, 'day').format("YYYY-MM-DD");
        const updatedStreaks = { ...currentStreaks };

        const categories: { key: keyof UserStreaks; min: number }[] = [
            { key: "perfect", min: 5 },
            { key: "strong", min: 4 },
            { key: "growth", min: 3 }
        ];

        let changed = false;

        categories.forEach(({ key, min }) => {
            const streak = updatedStreaks[key];
            
            if (completedCount >= min) {
                if (streak.lastDate === date) {
                    // Already counted for today, do nothing
                    return;
                }

                if (streak.lastDate === yesterday) {
                    // Continued from yesterday
                    streak.current += 1;
                } else {
                    // Streak broken or just starting
                    streak.current = 1;
                }

                if (streak.current > streak.max) {
                    streak.max = streak.current;
                }
                streak.lastDate = date;
                changed = true;
            } else {
                // Today doesn't meet the requirement. 
                // If the last active date was yesterday, the streak is NOT YET broken (today is still ongoing).
                // However, if lastDate is before yesterday, it is definitely broken.
                if (streak.lastDate && streak.lastDate !== yesterday && streak.lastDate !== date) {
                    streak.current = 0;
                    changed = true;
                }
            }
        });

        if (changed) {
            await setDoc(userRef, { streaks: updatedStreaks }, { merge: true });
            console.log(`[Streaks] Updated streaks for ${uid} at ${date}:`, updatedStreaks);
        }

    } catch (error) {
        console.error("Error updating user streaks:", error);
    }
};
