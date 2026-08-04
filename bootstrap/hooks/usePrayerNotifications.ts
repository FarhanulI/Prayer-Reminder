import { useAuthContext } from "@/context/AuthProvider";
import { NotificationSchedulerService } from "@/services/notifications";
import { useQuery } from "@tanstack/react-query";

import { BootstrapTaskState, toError } from "../services/bootstrap.service";
import { useTodayAndTomorrowPrayerData } from "./useTodayAndTomorrowPrayerData";

const STALE_TIME_MS = 1000 * 60 * 5;
const GC_TIME_MS = 1000 * 60 * 15;

export const usePrayerNotifications = (): BootstrapTaskState => {
  const { user } = useAuthContext();
  const uid = user?.profile?.uid ?? null;
  const enabled = !!uid;

  // Fetch today's and tomorrow's prayer data
  // This hook automatically includes date and location in query key
  const {
    data: prayerData,
    isLoading: dataLoading,
    location,
  } = useTodayAndTomorrowPrayerData();

  // Schedule rolling notifications whenever dependencies change
  const query = useQuery({
    queryKey: [
      "bootstrap",
      "prayer-notifications-rolling",
      uid,
      prayerData?.currentDate,
      prayerData?.today,
      prayerData?.tomorrow,
      location.latitude,
      location.longitude,
    ],
    enabled: enabled && !dataLoading && !!prayerData,
    queryFn: async () => {
      if (!prayerData) {
        console.warn("[usePrayerNotifications] No prayer data available");
        return null;
      }

      console.info(
        `[usePrayerNotifications] Scheduling rolling prayers for ${prayerData.currentDate} and ${prayerData.tomorrowDate}`,
      );

      // Schedule both today and tomorrow's prayers
      const result = await NotificationSchedulerService.scheduleRollingPrayers({
        todayData: prayerData.today,
        tomorrowData: prayerData.tomorrow,
        currentDate: prayerData.currentDate,
        tomorrowDate: prayerData.tomorrowDate,
        location:
          typeof location.latitude === "number" &&
          typeof location.longitude === "number"
            ? { latitude: location.latitude, longitude: location.longitude }
            : null,
      });

      if (!result.success && result.error !== "Already scheduled") {
        throw new Error(result.error || "Failed to schedule notifications");
      }

      return result;
    },
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 0,
  });

  return {
    name: "prayer-notifications",
    enabled,
    isLoading: dataLoading || query.isPending,
    error: query.error ? toError(query.error) : null,
    retry: async () => {
      await query.refetch();
    },
  };
};
