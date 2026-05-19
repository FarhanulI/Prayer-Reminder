import { db } from "@/lib/firebase";
import { PrayerLogDocument } from "@/types";
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

export function prayerCountFromLog(logData: PrayerLogDocument): number {
    return (
        logData.prayerCount ??
        Object.values(logData.prayers || {}).filter(
            (p) => typeof p === "object" && p && "isPrayed" in p && (p as { isPrayed?: boolean }).isPrayed
        ).length
    );
}

/**
 * Counts **consecutive calendar days** backward from `startDay` (inclusive)
 * where each day has `>= minPrayers` completions. A missing log for a day
 * counts as 0 — any gap breaks the straight-day run.
 */
function countStraightDaysBackwardFrom(
    countByDate: Map<string, number>,
    minPrayers: number,
    startDay: dayjs.Dayjs
): number {
    let streak = 0;
    let d = startDay.startOf("day");
    while ((countByDate.get(d.format("YYYY-MM-DD")) ?? 0) >= minPrayers) {
        streak += 1;
        d = d.subtract(1, "day");
    }
    return streak;
}

/**
 * Current straight-day streak ending today or yesterday (today may still be in progress).
 * Same consecutive-day rule: only back-to-back calendar days with enough prayers count.
 */
function currentStraightDayStreak(
    countByDate: Map<string, number>,
    minPrayers: number,
    today: dayjs.Dayjs = dayjs().startOf("day")
): number {
    const todayStr = today.format("YYYY-MM-DD");
    const yesterday = today.subtract(1, "day");

    const startFromToday = (countByDate.get(todayStr) ?? 0) >= minPrayers;
    const anchor = startFromToday ? today : yesterday;

    if ((countByDate.get(anchor.format("YYYY-MM-DD")) ?? 0) < minPrayers) {
        return 0;
    }

    return countStraightDaysBackwardFrom(countByDate, minPrayers, anchor);
}

/** Longest ever **unbroken** run of calendar days meeting `minPrayers` (sorted logs, day gaps reset the run). */
function longestStraightDayStreakInHistory(
    countByDate: Map<string, number>,
    minPrayers: number
): number {
    const sortedDates = [...countByDate.keys()].sort();
    let maxRun = 0;
    let run = 0;
    let prev: dayjs.Dayjs | null = null;

    for (const ds of sortedDates) {
        const c = countByDate.get(ds) ?? 0;
        if (c < minPrayers) {
            maxRun = Math.max(maxRun, run);
            run = 0;
            prev = null;
            continue;
        }
        const cur = dayjs(ds).startOf("day");
        if (prev && cur.diff(prev, "day") === 1) {
            run += 1;
        } else {
            run = 1;
        }
        maxRun = Math.max(maxRun, run);
        prev = cur;
    }

    return Math.max(maxRun, run);
}

function latestQualifyingDateInCurrentChain(
    countByDate: Map<string, number>,
    minPrayers: number
): string {
    const today = dayjs().startOf("day");
    const todayStr = today.format("YYYY-MM-DD");
    const yesterdayStr = today.subtract(1, "day").format("YYYY-MM-DD");
    if ((countByDate.get(todayStr) ?? 0) >= minPrayers) return todayStr;
    if ((countByDate.get(yesterdayStr) ?? 0) >= minPrayers) return yesterdayStr;
    return "";
}

/**
 * Recomputes streak stats from `prayer_logs`. Every streak value is based on
 * **straight calendar days** only: Perfect = 5/5 each day, Strong ≥4, Growth ≥3;
 * skip a day or fall short → the run resets (tiers like “Consistent” = 7 such days in a row).
 * Aligns with {@link updateUserStreaks} thresholds.
 */
export function computeStreaksFromPrayerLogs(
    logs: { date: string; data: PrayerLogDocument }[]
): UserStreaks {
    const countByDate = new Map<string, number>();
    for (const { date, data } of logs) {
        countByDate.set(date, prayerCountFromLog(data));
    }

    const categories: { key: keyof UserStreaks; min: number }[] = [
        { key: "perfect", min: 5 },
        { key: "strong", min: 4 },
        { key: "growth", min: 3 },
    ];

    const result: UserStreaks = {
        perfect: { ...DEFAULT_STREAK },
        strong: { ...DEFAULT_STREAK },
        growth: { ...DEFAULT_STREAK },
    };

    for (const { key, min } of categories) {
        const current = currentStraightDayStreak(countByDate, min);

        const maxRun = longestStraightDayStreakInHistory(countByDate, min);
        const lastDate =
            current > 0 ? latestQualifyingDateInCurrentChain(countByDate, min) : "";

        result[key] = {
            current,
            max: maxRun,
            lastDate,
        };
    }

    return result;
}

/**
 * Updates persisted streaks from today's log. Each category counts **consecutive**
 * qualifying days only: increment when yesterday was the last qualifying day (or start at 1).
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

        const logData = logSnap.data() as PrayerLogDocument;
        const userData = userSnap.data();
        const currentStreaks: UserStreaks = userData?.streaks || {
            perfect: { ...DEFAULT_STREAK },
            strong: { ...DEFAULT_STREAK },
            growth: { ...DEFAULT_STREAK }
        };

        // Count today's completed prayers
        const completedCount = logData.prayerCount ?? Object.values(logData.prayers || {}).filter(p => typeof p === 'object' && p && 'isPrayed' in p && (p as any).isPrayed).length;

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
                    // Straight-day run: yesterday was the previous qualifying calendar day
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
