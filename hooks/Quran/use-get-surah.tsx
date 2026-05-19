import { useQuery } from "@tanstack/react-query";
import { SurahDetail } from "./types";

export const useGetSurah = ({ id, }: { id?: string | number }) => {
    return useQuery<SurahDetail>({
        queryKey: ['surah', id],
        enabled: !!id,
        queryFn: async () => {
            const response = await fetch(`https://api.alquran.cloud/v1/surah/${id}/editions/quran-uthmani,en.sahih`);
            if (!response.ok) throw new Error('Network response was not ok');
            const result = await response.json();

            const arabicData = result.data[0];
            const englishData = result.data[1];

            const verses = arabicData.ayahs.map((ayah: any, index: number) => ({
                id: ayah.numberInSurah,
                text: ayah.text,
                translation: englishData.ayahs[index].text,
                ayah: ayah?.number
            }));

            return {
                language: 'en',
                id: arabicData.number,
                name: arabicData.name,
                transliteration: arabicData.englishName,
                translation: arabicData.englishNameTranslation,
                type: arabicData.revelationType.toLowerCase() as any,
                total_verses: arabicData.numberOfAyahs,
                verses: verses
            };
        },
    });
};