import { useQuery } from "@tanstack/react-query";
import { SurahDetail } from "./types";

export const useGetSurah = ({ id, }: { id?: string | number }) => {
    return useQuery<SurahDetail>({
        queryKey: ['surah', id],
        enabled: !!id,
        queryFn: async () => {
            const response = await fetch(`https://alquran-api.pages.dev/api/quran/surah/${id}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        },
    });
};