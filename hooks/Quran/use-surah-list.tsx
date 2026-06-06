import { DropdownOption } from "@/components/Dropdown";
import { useQuery } from "@tanstack/react-query";

export type SurahListType = {
    number: number,
    englishName: string,
    englishNameTranslation: string,
    name: string,
    numberOfAyahs: number,
    revelationType: string
}

export const useSurahsLists = ({ lang = 'en', enabled = true }: { lang?: string, enabled?: boolean }) => {
    return useQuery<DropdownOption[]>({
        queryKey: ['surah-lists', lang],
        enabled,
        queryFn: async () => {
            const response = await fetch(`https://api.alquran.cloud/v1/meta`);
            if (!response.ok) throw new Error('Network response was not ok');
            const { data } = await response.json();

            return data?.surahs?.references?.map((surah: SurahListType) => ({
                id: surah.number,
                name: `${surah.number}. ${surah.englishName} (${surah.englishNameTranslation})`,
                key: surah.number.toString()
            }));
        },
    });
};