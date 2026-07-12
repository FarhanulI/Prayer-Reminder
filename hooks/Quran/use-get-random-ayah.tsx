import { useQuery } from "@tanstack/react-query";
import { AudioElement, VerseList } from "./types";

export interface Edition {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
  format: string;
  type: string;
  direction: 'ltr' | 'rtl'; // Enforces standard text directions
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Medinan' | 'Meccan'; // Matches the two types of Quranic revelation
}

export interface AyahData {
  surah: Surah;
  audio: AudioElement[];
  total_verses: number;
  verse: VerseList;
}

export interface RandomAyahApiResponse {
  data: AyahData;
}

export const useGetRandomAyah = () => {
  const dateString = new Date().toISOString().split('T')[0];
  return useQuery<AyahData>({
    queryKey: ['random-ayah', dateString],
    queryFn: async () => {
      // The Quran has exactly 6236 ayahs
      const response = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/api/quran/random`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const { data }: RandomAyahApiResponse = await response.json();
      return data;
    },
    refetchOnWindowFocus: false,
  });
};
