import {
  AppInitializationState,
  combineBootstrapStates,
  retryFailedBootstrapTasks,
} from "../services/bootstrap.service";
import { usePrayerBootstrap } from "./usePrayerBootstrap";
import { usePrayerLockBootstrap } from "./usePrayerLockBootstrap";
import { useRemoteConfigBootstrap } from "./useRemoteConfigBootstrap";
// import { useSubscriptionBootstrap } from "./useSubscriptionBootstrap";

export const useAppInitialization = (): AppInitializationState => {
  const prayerBootstrap = usePrayerBootstrap();
  const prayerLock = usePrayerLockBootstrap();
  const remoteConfig = useRemoteConfigBootstrap();
  // const subscriptionSync = useSubscriptionBootstrap();

  const tasks = [
    prayerBootstrap,
    prayerLock,
    remoteConfig,
    // subscriptionSync,
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
