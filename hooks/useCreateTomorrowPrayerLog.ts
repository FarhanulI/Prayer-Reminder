import { createTomorrowPrayerLog } from "@/services/device";
import { useMutation } from "@tanstack/react-query";

export function useCreateTomorrowPrayerLog() {
  return useMutation({
    mutationFn: async (uid: string) => {
      if (!uid) throw new Error("No UID provided");
      await createTomorrowPrayerLog(uid);
    },
    onError: (error) => {
      console.error("Failed to create tomorrow's prayer log:", error);
    },
  });
}
