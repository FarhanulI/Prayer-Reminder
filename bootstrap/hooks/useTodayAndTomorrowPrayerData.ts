import { useAuthContext } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import { PrayerLogDocument } from "@/types";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { doc, getDoc } from "firebase/firestore";

interface TodayAndTomorrowData {
  today: PrayerLogDocument | null;
  tomorrow: PrayerLogDocument | null;
  currentDate: string;
  tomorrowDate: string;
}

/**
 * Hook to fetch prayer data for today and tomorrow
 *
 * React Query Dependencies:
 * - Current date (YYYY-MM-DD): Triggers refetch when day changes
 * - User location (lat/long): Triggers refetch when location changes
 * - User ID: Triggers refetch when user changes
 *
 * This ensures notifications are always scheduled with the latest prayer times
 * for both today and tomorrow.
 */
export const useTodayAndTomorrowPrayerData = (enabled = true) => {
  const { user } = useAuthContext();
  const uid = user?.profile?.uid ?? null;
  const location = user?.location;

  // Current date - changes daily, triggering automatic refetch
  const currentDate = dayjs().format("YYYY-MM-DD");
  const tomorrowDate = dayjs().add(1, "day").format("YYYY-MM-DD");

  // Use stable location values in query key
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  const query = useQuery({
    queryKey: [
      "prayer-data-rolling",
      uid,
      currentDate,
      latitude,
      longitude,
      tomorrowDate,
    ],
    enabled: !!uid && enabled,
    queryFn: async (): Promise<TodayAndTomorrowData> => {
      if (!uid) {
        return {
          today: null,
          tomorrow: null,
          currentDate,
          tomorrowDate,
        };
      }

      // Fetch both today and tomorrow's prayer data in parallel
      const [todaySnap, tomorrowSnap] = await Promise.all([
        getDoc(doc(db, "users", uid, "prayer_logs", currentDate)),
        getDoc(doc(db, "users", uid, "prayer_logs", tomorrowDate)),
      ]);

      return {
        today: todaySnap.exists()
          ? (todaySnap.data() as PrayerLogDocument)
          : null,
        tomorrow: tomorrowSnap.exists()
          ? (tomorrowSnap.data() as PrayerLogDocument)
          : null,
        currentDate,
        tomorrowDate,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    ...query,
    location: {
      latitude,
      longitude,
    },
  };
};
