import { useAuthContext } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import { createPrayerLogIfNeeded } from "@/services/device";
import { NotificationSchedulerService } from "@/services/notifications";
import { PrayerLogDocument } from "@/types";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { doc, getDoc } from "firebase/firestore";

import {
  BootstrapTaskState,
  isRecoverableInitializationError,
  toError,
} from "../services/bootstrap.service";

const LOG_STALE_TIME_MS = 1000 * 60 * 10;
const LOG_GC_TIME_MS = 1000 * 60 * 30;
const NOTIFICATION_STALE_TIME_MS = 1000 * 60 * 5;
const NOTIFICATION_GC_TIME_MS = 1000 * 60 * 15;

/**
 * Merged bootstrap hook: creates today's prayer log then schedules notifications.
 * Sequential: notifications query is gated behind log creation success.
 */
export const usePrayerBootstrap = (): BootstrapTaskState => {
  const { user } = useAuthContext();
  const uid = user?.profile?.uid ?? null;
  const enabled = !!uid;
  const location = user?.location;
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  const currentDate = dayjs().format("YYYY-MM-DD");
  const tomorrowDate = dayjs().add(1, "day").format("YYYY-MM-DD");

  // Step 1: Create prayer log if it doesn't exist for today
  const logQuery = useQuery({
    queryKey: ["bootstrap", "prayer-log", uid, currentDate],
    enabled,
    queryFn: async () => {
      if (!uid) return null;
      await createPrayerLogIfNeeded(uid, user?.location ?? null);
      return { success: true };
    },
    // staleTime: LOG_STALE_TIME_MS,
    // gcTime: LOG_GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      if (failureCount >= 2) return false;
      return isRecoverableInitializationError(error);
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Only proceed once log creation has settled without error
  const logReady = !logQuery.isPending && !logQuery.error;

  // Step 2: Fetch prayer data and schedule notifications
  const notificationQuery = useQuery({
    queryKey: [
      "bootstrap",
      "prayer-notifications-rolling",
      uid,
      currentDate,
      tomorrowDate,
      latitude,
      longitude,
    ],
    enabled: enabled && logReady,
    queryFn: async () => {
      if (!uid) return null;

      const [todaySnap, tomorrowSnap] = await Promise.all([
        getDoc(doc(db, "users", uid, "prayer_logs", currentDate)),
        getDoc(doc(db, "users", uid, "prayer_logs", tomorrowDate)),
      ]);

      const todayData = todaySnap.exists()
        ? (todaySnap.data() as PrayerLogDocument)
        : null;
      const tomorrowData = tomorrowSnap.exists()
        ? (tomorrowSnap.data() as PrayerLogDocument)
        : null;

      const result = await NotificationSchedulerService.scheduleRollingPrayers({
        todayData,
        tomorrowData,
        currentDate,
        tomorrowDate,
        location:
          typeof latitude === "number" && typeof longitude === "number"
            ? { latitude, longitude }
            : null,
      });

      if (!result.success && result.error !== "Already scheduled") {
        throw new Error(result.error || "Failed to schedule notifications");
      }

      return result;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 0,
  });

  const error = logQuery.error
    ? toError(logQuery.error)
    : notificationQuery.error
      ? toError(notificationQuery.error)
      : null;

  return {
    name: "prayer-notifications",
    enabled,
    isLoading: logQuery.isPending || notificationQuery.isPending,
    error,
    retry: async () => {
      if (logQuery.error) {
        await logQuery.refetch();
      } else {
        await notificationQuery.refetch();
      }
    },
  };
};
