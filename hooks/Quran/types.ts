export interface Language {
    code: string;
    name: string;
    nativeName: string;
    direction: 'rtl' | 'ltr';
}

export interface SurahSummary {
    id: number;
    name: string;
    transliteration: string;
    translation: string;
    type: 'meccan' | 'medinan';
    total_verses: number;
}

export interface QuranApiResponse {
    language: string;
    available_languages: Language[];
    surahs: SurahSummary[];
}

export interface AudioElement {
    reciter_id: number;
    reciter: string;
    style: "Murattal" | "Mujawwad" | string;
    surah_audio: string;
}


export interface Verse {
    id: number;
    text: string;
    translation: string;
    ayah: string;
    audio?: string;
}

export interface ApiInfo {
    sadaqah_jariah: string;
}

export interface ISurahList {
    surah: Surah;
    audio: AudioElement[];
    total_verses: number;
    verses: VerseList[];
}



export interface Surah {
    number: number;
    name_arabic: string;
    name_english: string;
    name_translation: string;
    revelation_place: "makkah" | "madinah";
    revelation_order: number;
    verses_count: number;
    bismillah_pre: boolean;
}

export interface VerseAudio {
    ayah_audio: string;
    all_reciters: string;
}

export interface VerseList {
    verse_key: string;
    ayah: number;
    arabic: string;
    transliteration: string;
    translations: Translations;
    audio: VerseAudio;
}



export interface Translations {
    sahih_international: string;
    pickthall: string;
    yusuf_ali: string;
    urdu: string;
    turkish: string;
    indonesian: string;
    french: string;
    german: string;
    bengali: string;
    spanish: string;
    malay: string;
    bosnian: string;
}

export interface SurahDetail {
    language: string;
    id: number;
    name: string;
    name_arabic?: string;
    transliteration: string;
    translation: string;
    revelation_place: 'makkah' | 'madinah';
    total_verses: number;
    verses: Verse[];
    fullAdio: AudioElement
}
