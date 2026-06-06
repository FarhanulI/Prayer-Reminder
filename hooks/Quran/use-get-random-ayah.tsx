import { useQuery } from "@tanstack/react-query";

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
  number: number;
  text: string;
  edition: Edition;
  surah: Surah;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean | object; // Handled as boolean based on payload, but can be an object in some Quran APIs
}

export interface RandomAyahApiResponse {
  code: number;
  status: string;
  data: AyahData[];
}

export const useGetRandomAyah = () => {
  const dateString = new Date().toISOString().split('T')[0];
  return useQuery<AyahData>({
    queryKey: ['random-ayah', dateString],
    queryFn: async () => {
      // Create a daily seed from the date string
      let hash = 0;
      for (let i = 0; i < dateString.length; i++) {
        const char = dateString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      // The Quran has exactly 6236 ayahs
      const randomAyahNumber = (Math.abs(hash) % 6236) + 1;
      const response = await fetch(`https://api.alquran.cloud/v1/ayah/${randomAyahNumber}/editions/en.asad`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result: RandomAyahApiResponse = await response.json();
      return result.data?.[0];
    },
    refetchOnWindowFocus: false,
  });
};
