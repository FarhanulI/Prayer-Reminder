import { DropdownOption } from "@/components/Dropdown";
import { useQuery } from "@tanstack/react-query";

export type SurahListType = {
    number: number,
    "name_arabic": string,
    "name_english": string,
    "name_complex": string,
    "name_translation": string,
    "revelation_place": string,
    "revelation_order": number,
    "bismillah_pre": boolean,
    "verses_count": number,
    "pages": number[],
    "audio": {
        "reciters_available": number,
        "example_audio": string
    }
}

export const useSurahsLists = ({ lang = 'en', enabled = true }: { lang?: string, enabled?: boolean }) => {
    return useQuery<DropdownOption[]>({
        queryKey: ['surah-lists', lang],
        enabled,
        queryFn: async () => {
            const response = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/api/quran/surahs`);
            if (!response.ok) throw new Error('Network response was not ok');
            const { data } = await response.json();

            return data?.surahs?.map((surah: SurahListType) => ({
                id: surah.number,
                name: `${surah.number}. ${surah.name_english} (${surah.name_translation})`,
                key: surah.number.toString()
            }));
        },
    });
};