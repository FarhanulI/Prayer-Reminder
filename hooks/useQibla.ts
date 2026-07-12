import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { QiblaResponse } from '@/types';

const fetchQibla = async (latitude: number, longitude: number): Promise<QiblaResponse> => {
  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL;
  const response = await fetch(`${baseUrl}/api/qibla?lat=${latitude}&lng=${longitude}`);

  if (!response.ok) {
    throw new Error('Failed to fetch Qibla direction');
  }

  const data: QiblaResponse = await response.json();
  return data;
};

export const useQibla = () => {
  return useQuery<QiblaResponse>({
    queryKey: ['qibla'],
    queryFn: async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        throw new Error('Permission to access location was denied');
      }

      const location = await Location.getCurrentPositionAsync({});
      return fetchQibla(location.coords.latitude, location.coords.longitude);
    },
    staleTime: 1000 * 60 * 60 * 2, // 24 hours
  });
};
