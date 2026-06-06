import { LocationObjectCoords } from "expo-location";
import { FieldValue } from "firebase/firestore";

export type UserProfileInfoType = {
    age?: number;
    dailyPhoneUsage?: number;
    email: string | null;
    name: string | null;
    photoURL: string | null;
    subscription: 'free' | 'premium' | string; // Assuming 'free' is a subscription tier
    uid?: string;
}

export interface UserDocument {
    createdAt: Date | FieldValue;
    date?: DateInfo; // represented as null in your snippet, typed flexibly
    deviceToken?: string;
    goal?: {
        targetDaily: number;
        type: string; // 'improve' seems to be a specific status/mode
    };
    insights?: {
        estimatedLifetimeMissed: number;
        estimatedLifetimePrayed: number;
    };
    lastLogin?: FieldValue;
    location: LocationObjectCoords | null,
    onboardingCompleted: boolean;
    prayerHabit?: {
        averageDaily: number;
        estimatedMissedPerDay: number;
    };
    profile: UserProfileInfoType;
    sunTimings?: null | any; // marked as null in your document
    updatedAt?: FieldValue;
}

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
    isPrayed: boolean;
    time: string;
    end: string;
    skipped?: boolean;
    status?: "completed" | "skipped" | null;
    completedAt?: any;
    skippedAt?: any;
}

export interface PrayerLogDocument {
    prayers: {
        fajr: PrayerStatus;
        dhuhr: PrayerStatus;
        asr: PrayerStatus;
        maghrib: PrayerStatus;
        isha: PrayerStatus;
    };
    prayerCount: number;
}

// Keeping PrayerCollection for compatibility or as a sub-type
export interface PrayerCollection {
    fajr: PrayerStatus;
    dhuhr: PrayerStatus;
    asr: PrayerStatus;
    maghrib: PrayerStatus;
    isha: PrayerStatus;
}

// If you are wrapping this in a parent object as shown in your JSON snippet:
export interface PrayerTimesData {
    prayerTimes: PrayerLogDocument;
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

