export type BootstrapTaskName =
  | "prayer-log"
  | "prayer-lock"
  | "prayer-notifications"
  | "remote-config"
  | "subscription-sync";

export interface BootstrapTaskState {
  name: BootstrapTaskName;
  isLoading: boolean;
  error: Error | null;
  retry: () => Promise<unknown>;
  enabled: boolean;
}

export interface AppInitializationState {
  isLoading: boolean;
  error: Error | null;
  retry: () => Promise<void>;
  tasks: BootstrapTaskState[];
}

export interface Logger {
  debug: (message: string, metadata?: unknown) => void;
  info: (message: string, metadata?: unknown) => void;
  warn: (message: string, metadata?: unknown) => void;
  error: (message: string, metadata?: unknown) => void;
}

const buildLogPayload = (
  level: string,
  message: string,
  metadata?: unknown,
): Record<string, unknown> => ({
  level,
  message,
  metadata,
  scope: "bootstrap",
  timestamp: new Date().toISOString(),
});

// Centralized logger abstraction so we can swap console transport with
// Crashlytics/Sentry later without touching bootstrap hooks/components.
export const bootstrapLogger: Logger = {
  debug: (message, metadata) => {
    console.debug(buildLogPayload("debug", message, metadata));
  },
  info: (message, metadata) => {
    console.info(buildLogPayload("info", message, metadata));
  },
  warn: (message, metadata) => {
    console.warn(buildLogPayload("warn", message, metadata));
  },
  error: (message, metadata) => {
    console.error(buildLogPayload("error", message, metadata));
  },
};

export const toError = (
  value: unknown,
  fallbackMessage = "Unexpected bootstrap error",
): Error => {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === "string") {
    return new Error(value);
  }

  return new Error(fallbackMessage);
};

export const isRecoverableInitializationError = (error: unknown): boolean => {
  const message = toError(error).message.toLowerCase();

  const recoverablePatterns = [
    "network",
    "timeout",
    "temporar",
    "unavailable",
    "fetch",
    "503",
    "502",
    "429",
    "resource-exhausted",
  ];

  return recoverablePatterns.some((pattern) => message.includes(pattern));
};

export const combineBootstrapStates = (
  tasks: BootstrapTaskState[],
): Pick<AppInitializationState, "isLoading" | "error"> => {
  const activeTasks = tasks.filter((task) => task.enabled);

  const isLoading = activeTasks.some((task) => task.isLoading);
  const error = activeTasks.find((task) => task.error)?.error ?? null;

  return {
    isLoading,
    error,
  };
};

export const retryFailedBootstrapTasks = async (
  tasks: BootstrapTaskState[],
): Promise<void> => {
  const failedTasks = tasks.filter((task) => task.enabled && task.error);

  await Promise.all(failedTasks.map((task) => task.retry()));
};
