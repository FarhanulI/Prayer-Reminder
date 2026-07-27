import { useAuthContext } from "@/context/AuthProvider";
import React from "react";

import { InitializationError } from "./components/InitializationError";
import { InitializationLoading } from "./components/InitializationLoading";
import { useAppInitialization } from "./hooks/useAppInitialization";

export const AppBootstrap = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthContext();
  const { isLoading, error, retry } = useAppInitialization();
  const [hasCompletedInitialBootstrap, setHasCompletedInitialBootstrap] =
    React.useState(false);

  React.useEffect(() => {
    if (!user?.profile.uid) {
      setHasCompletedInitialBootstrap(false);
      return;
    }

    if (!isLoading && !error) {
      setHasCompletedInitialBootstrap(true);
    }
  }, [error, isLoading, user?.profile.uid]);

  if (!user?.profile.uid) {
    return <InitializationLoading />;
  }

  if (!hasCompletedInitialBootstrap) {
    if (error) {
      return <InitializationError error={error} onRetry={() => void retry()} />;
    }

    return <InitializationLoading />;
  }

  if (error && isLoading) {
    return <InitializationError error={error} onRetry={() => void retry()} />;
  }

  return <>{children}</>;
};
