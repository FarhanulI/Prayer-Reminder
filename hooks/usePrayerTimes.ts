import { fetchPrayerTimes } from '@/features/device.service';
import { PrayerTimesMethodResponse } from '@/types';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
// Import your fetch function and response type here
// import { fetchPrayerTimes, PrayerTimesMethodResponse } from './path-to-your-api';

interface UsePrayerTimesProps {
  latitude: number | undefined;
  longitude: number | undefined;
}

export const usePrayerTimes = ({
  latitude,
  longitude,
}: UsePrayerTimesProps): UseQueryResult<PrayerTimesMethodResponse | null, Error> => {
  return useQuery({
    // 1. The queryKey uniquely identifies this request based on the coordinates
    queryKey: ['prayerTimes', latitude, longitude],

    // 2. The queryFn executes your API call
    queryFn: () => fetchPrayerTimes(latitude, longitude),

    // 3. Critically important: Only run the query if coordinates actually exist
    enabled: latitude !== undefined && longitude !== undefined,

    // Optional configuration tweaks for location-based data:
    staleTime: 1000 * 60 * 60, // Consider data fresh for 1 hour (prayer times don't change rapidly)
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  });
};