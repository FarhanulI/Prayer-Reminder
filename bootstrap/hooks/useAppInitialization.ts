import {
  AppInitializationState,
  combineBootstrapStates,
  retryFailedBootstrapTasks,
} from "../services/bootstrap.service";
import { usePrayerLockBootstrap } from "./usePrayerLockBootstrap";
import { usePrayerLogBootstrap } from "./usePrayerLogBootstrap";
import { usePrayerNotifications } from "./usePrayerNotifications";
import { useRemoteConfigBootstrap } from "./useRemoteConfigBootstrap";
import { useSubscriptionBootstrap } from "./useSubscriptionBootstrap";

export const useAppInitialization = (): AppInitializationState => {
  const prayerLog = usePrayerLogBootstrap();
  const prayerLock = usePrayerLockBootstrap();
  const prayerNotifications = usePrayerNotifications();
  const remoteConfig = useRemoteConfigBootstrap();
  const subscriptionSync = useSubscriptionBootstrap();

  const tasks = [
    prayerLog,
    prayerLock,
    prayerNotifications,
    remoteConfig,
    subscriptionSync,
  ];

  const { isLoading, error } = combineBootstrapStates(tasks);

  return {
    isLoading,
    error,
    tasks,
    retry: async () => {
      await retryFailedBootstrapTasks(tasks);
    },
  };
};
