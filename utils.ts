import { ForbiddenWindow, PrayerCollection } from "./types";

export const getForbiddenTimes = (sunTimings: { sunrise: string | null, sunset: string | null }, prayerTimes: PrayerCollection): ForbiddenWindow[] | null => {
    console.log({ prayerTimes });

    // if (!sunTimings) return null

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