import { useAuthContext } from "@/context/AuthProvider";
import { useQuery } from "@tanstack/react-query";

import { BootstrapTaskState, toError } from "../services/bootstrap.service";

export const useSubscriptionBootstrap = (): BootstrapTaskState => {
  const { user } = useAuthContext();

  const uid = user?.profile?.uid ?? null;
  const enabled = !!uid;

  const query = useQuery({
    queryKey: ["bootstrap", "subscription-sync", uid],
    enabled,
    queryFn: async () => {
      // Placeholder for future subscription reconciliation with backend/store.
      return { success: true };
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 0,
  });

  return {
    name: "subscription-sync",
    enabled,
    isLoading: query.isPending,
    error: query.error ? toError(query.error) : null,
    retry: async () => {
      await query.refetch();
    },
  };
};
