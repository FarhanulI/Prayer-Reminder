import { DropdownOption } from "@/components/Dropdown";
import { useQuery } from "@tanstack/react-query";
import { QuranApiResponse } from "./types";

export const useSurahsLists = ({ lang = 'en', enabled = true }: { lang?: string, enabled?: boolean }) => {
    return useQuery<DropdownOption[]>({
        queryKey: ['surah-lists', lang],
        enabled,
        queryFn: async () => {
            const response = await fetch(`https://alquran-api.pages.dev/api/quran?lang=${lang}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data: QuranApiResponse = await response.json();

            return data.surahs.map(surah => ({
                id: surah.id,
                name: `${surah.transliteration} (${surah.translation})`,
                key: surah.id.toString()
            }));
        },
    });
};