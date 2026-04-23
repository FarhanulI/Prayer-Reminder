export interface PrayerTimesResponse {
    code: number;
    status: string;
    data: PrayerData;
}

export type PrayerTimesMethodResponse = {
    prayerTimings: Timings;
    date: DateInfo
}

export interface PrayerData {
    timings: Timings;
    date: DateInfo;
    meta: Meta;
}

export interface Timings {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Sunset: string;
    Maghrib: string;
    Isha: string;
    Imsak: string;
    Midnight: string;
    Firstthird: string;
    Lastthird: string;
}

export interface DateInfo {
    readable: string;
    timestamp: string;
    hijri: HijriDate;
    gregorian: GregorianDate;
}

export interface HijriDate {
    date: string;
    format: string;
    day: string;
    weekday: {
        en: string;
        ar: string;
    };
    month: {
        number: number;
        en: string;
        ar: string;
        days: number;
    };
    year: string;
    designation: Designation;
    holidays: string[];
    adjustedHolidays: string[];
    method: string;
}

export interface GregorianDate {
    date: string;
    format: string;
    day: string;
    weekday: {
        en: string;
    };
    month: {
        number: number;
        en: string;
    };
    year: string;
    designation: Designation;
    lunarSighting: boolean;
}

export interface Designation {
    abbreviated: string;
    expanded: string;
}

export interface Meta {
    latitude: number;
    longitude: number;
    timezone: string;
    method: CalculationMethod;
    latitudeAdjustmentMethod: string;
    midnightMode: string;
    school: string;
    offset: Record<keyof Omit<Timings, 'Firstthird' | 'Lastthird'>, number>;
}

export interface CalculationMethod {
    id: number;
    name: string;
    params: {
        Fajr: number;
        Isha: number;
    };
    location: {
        latitude: number;
        longitude: number;
    };
}

export interface ForbiddenWindow {
    label: string;
    start: string;
    end: string;
}


export interface PrayerStatus {
    done: boolean;
    time: string;
}

export interface PrayerCollection {
    fajr: PrayerStatus;
    dhuhr: PrayerStatus;
    asr: PrayerStatus;
    maghrib: PrayerStatus;
    isha: PrayerStatus;
}

// If you are wrapping this in a parent object as shown in your JSON snippet:
export interface PrayerTimesData {
    prayerTimes: PrayerCollection;
}

export interface OnboardingData {
    onboardingCompleted: boolean;
    profile: {
        age: number;
        dailyPhoneUsage: number;
    };
    prayerHabit: {
        averageDaily: number;
        estimatedMissedPerDay: number;
    };
    insights: {
        estimatedLifetimeMissed: number;
        estimatedLifetimePrayed: number;
    };
    goal: {
        type: "improve" | "maintain";
        targetDaily: number;
    };
}

