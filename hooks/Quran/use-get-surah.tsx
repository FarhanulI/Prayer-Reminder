import { useQuery } from "@tanstack/react-query";
import { ApiInfo, ISurahList, SurahDetail, VerseList } from "./types";

export interface QuranSurahResponse {
    success: boolean;
    service?: string;
    data: ISurahList;
    timestamp?: string;
    api_info?: ApiInfo;
}



export const useGetSurah = ({ id, }: { id?: string | number }) => {
    return useQuery<SurahDetail>({
        queryKey: ['surah', id],
        enabled: !!id,
        queryFn: async () => {
            const response = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/api/quran/surah/${id}`);

            if (!response.ok) throw new Error('Network response was not ok');
            const { data }: QuranSurahResponse = await response.json();

            const verses = data?.verses.map((ayah: VerseList, index: number) => ({
                id: ayah?.ayah,
                text: ayah?.arabic,
                translation: ayah?.translations?.sahih_international,
                ayah: ayah.verse_key,
                audio: ayah?.audio?.ayah_audio
            }));

            return {
                language: 'en',
                id: data.surah.number,
                name: data?.surah?.name_english,
                name_arabic: data?.surah?.name_arabic,
                fullAdio: data?.audio[0],
                transliteration: data?.surah?.name_translation,
                translation: data?.surah?.name_translation,
                revelation_place: data?.surah?.revelation_place,
                total_verses: data?.surah.verses_count,
                verses: verses
            };
        },
    });
};