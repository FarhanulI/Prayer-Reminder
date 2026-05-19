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


export interface Verse {
    id: number;
    text: string;
    translation: string;
    ayah: number
}

export interface SurahDetail {
    language: string;
    id: number;
    name: string;
    transliteration: string;
    translation: string;
    type: 'meccan' | 'medinan';
    total_verses: number;
    verses: Verse[];
}