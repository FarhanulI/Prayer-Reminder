import { useAuthContext } from "@/context/AuthProvider";
import { useQuery } from "@tanstack/react-query";

import { BootstrapTaskState, toError } from "../services/bootstrap.service";

export const useRemoteConfigBootstrap = (): BootstrapTaskState => {
  const { user } = useAuthContext();

  const uid = user?.profile?.uid ?? null;
  const enabled = !!uid;

  const query = useQuery({
    queryKey: ["bootstrap", "remote-config", uid],
    enabled,
    queryFn: async () => {
      // Placeholder for future remote config fetch/activate flow.
      return { success: true };
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 0,
  });

  return {
    name: "remote-config",
    enabled,
    isLoading: query.isPending,
    error: query.error ? toError(query.error) : null,
    retry: async () => {
      await query.refetch();
    },
  };
};
