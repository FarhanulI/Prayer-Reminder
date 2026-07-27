import { useAuthContext } from "@/context/AuthProvider";
import { createPrayerLogIfNeeded } from "@/features/device.service";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
  BootstrapTaskState,
  isRecoverableInitializationError,
  toError,
} from "../services/bootstrap.service";

const STALE_TIME_MS = 1000 * 60 * 10;
const GC_TIME_MS = 1000 * 60 * 30;

export const usePrayerLogBootstrap = (): BootstrapTaskState => {
  const { user } = useAuthContext();

  const uid = user?.profile?.uid ?? null;
  const todayKey = dayjs().format("YYYY-MM-DD");

  const enabled = !!uid;

  const query = useQuery({
    queryKey: ["bootstrap", "prayer-log", uid, todayKey],
    enabled,
    queryFn: async () => {
      if (!uid) {
        return null;
      }

      await createPrayerLogIfNeeded(uid, user?.location ?? null);
      return { success: true };
    },
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      if (failureCount >= 2) {
        return false;
      }

      return isRecoverableInitializationError(error);
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  return {
    name: "prayer-log",
    enabled,
    isLoading: query.isPending,
    error: query.error ? toError(query.error) : null,
    retry: async () => {
      await query.refetch();
    },
  };
};
