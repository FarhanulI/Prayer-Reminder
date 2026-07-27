import { useAuthContext } from "@/context/AuthProvider";
import { loadPrayerLock } from "@/hooks/use-prayer-lock/prayer-lock.loader";
import { useQuery } from "@tanstack/react-query";
import { Platform } from "react-native";

import {
  BootstrapTaskState,
  bootstrapLogger,
  isRecoverableInitializationError,
  toError,
} from "../services/bootstrap.service";

const STALE_TIME_MS = 1000 * 60 * 5;
const GC_TIME_MS = 1000 * 60 * 15;

export const usePrayerLockBootstrap = (): BootstrapTaskState => {
  const { user } = useAuthContext();

  const uid = user?.profile?.uid ?? null;
  const isAuthenticated = !!uid;
  const enabled = Platform.OS === "android";

  const query = useQuery({
    queryKey: ["bootstrap", "prayer-lock", uid],
    enabled,
    queryFn: async () => {
      const prayerLock = await loadPrayerLock();

      if (isAuthenticated) {
        prayerLock.startService();
        return { success: true, action: 'started' };
      }

      prayerLock.stopService();
      return { success: true, action: 'stopped' };
    },
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      if (failureCount >= 1) {
        return false;
      }

      return isRecoverableInitializationError(error);
    },
    retryDelay: () => 1000,
  });

  if (query.error) {
    bootstrapLogger.warn("Prayer lock bootstrap failed", {
      error: toError(query.error),
      uid,
      platform: Platform.OS,
    });
  }

  return {
    name: "prayer-lock",
    enabled,
    isLoading: query.isPending,
    error: query.error ? toError(query.error) : null,
    retry: async () => {
      await query.refetch();
    },
  };
};
