import { useIsFocused } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";

import {
  buildMilestoneAchievements,
  MilestoneAchievement,
} from "@/constants/milestones";
import { computeStreaksFromPrayerLogs, UserStreaks } from "@/features/streaks.service";
import { db } from "@/lib/firebase";
import { PrayerLogDocument } from "@/types";

export type MilestonesQueryData = {
  streaks: UserStreaks;
  milestones: MilestoneAchievement[];
  logCount: number;
};

/**
 * Loads `prayer_logs` when the Milestones screen is focused and derives streaks +
 * milestone unlocks. Streak lengths are **consecutive calendar days** only (see
 * {@link computeStreaksFromPrayerLogs}).
 */
export function useMilestones(uid: string | null | undefined) {
  const isFocused = useIsFocused();

  return useQuery({
    queryKey: ["milestones", uid],
    queryFn: async (): Promise<MilestonesQueryData | null> => {
      if (!uid) return null;

      const snap = await getDocs(collection(db, "users", uid, "prayer_logs"));
      const logs: { date: string; data: PrayerLogDocument }[] = [];
      snap.forEach((docSnap) => {
        logs.push({
          date: docSnap.id,
          data: docSnap.data() as PrayerLogDocument,
        });
      });

      const streaks = computeStreaksFromPrayerLogs(logs);
      const milestones = buildMilestoneAchievements(streaks);

      return { streaks, milestones, logCount: logs.length };
    },
    enabled: !!uid && isFocused,
    staleTime: 0,
  });
}
