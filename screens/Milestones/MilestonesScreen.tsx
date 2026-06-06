import { Card } from "@/components/ui/card";
import colors from "@/constants/colors.json";
import {
  STREAK_MILESTONES,
  StreakCategory,
  getMilestoneForStreak,
  getNextMilestone,
} from "@/constants/milestones";
import { useAuthContext } from "@/context/AuthProvider";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useMilestones } from "@/hooks/useMilestones";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import DailyPerformance from "./components/dailyPerformance";

/**
 * Card for each streak track (Perfect, Strong, Growth).
 */
const StreakTrackCard = ({
  category,
  count,
  currentTitle,
  nextTitle,
  nextMilestoneDays,
  progress,
  icon,
  color,
}: {
  category: string;
  count: number;
  currentTitle: string;
  nextTitle: string;
  nextMilestoneDays: number;
  progress: number;
  icon: string;
  color: string;
}) => {
  return (
    <Card className="mb-4">
      <View className="flex-row items-center mb-4">
        <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: `${color}15` }}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>

        <View className="flex-1">
          <View className="flex-row justify-between items-center mb-0.5">
            <Text className="text-white text-[16px] font-semibold">{category}</Text>
            <Text className="font-bold text-[16px]" style={{ color }}>{count} Days</Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-white/40 text-[10px] uppercase font-bold tracking-widest">{currentTitle}</Text>
            <Text className="text-white/30 text-[10px] font-bold uppercase">Current</Text>
          </View>
        </View>
      </View>

      {/* Progress Info */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-white/60 text-[10px] font-bold uppercase">Next: {nextTitle}</Text>
        <Text className="text-white/40 text-[10px] font-bold">{nextMilestoneDays} Days</Text>
      </View>

      {/* Progress Bar */}
      <View className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
        <View
          className="h-full rounded-full"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </View>
    </Card>
  );
};

// --- MAIN SCREEN ---

function streakTrackProps(category: StreakCategory, count: number, label: string) {
  const achieved = getMilestoneForStreak(category, count);
  const next = getNextMilestone(category, count);
  const list = STREAK_MILESTONES[category];
  const first = list[0];
  const last = list[list.length - 1];
  const nextTier = next ?? first;
  const displayIcon = achieved?.icon ?? nextTier.icon;
  const color = achieved?.color ?? nextTier.color;

  const nextTitle = next ? next.title : "Top tier";
  const nextMilestoneDays = next ? next.days : last.days;
  const progress = !next ? 100 : Math.min((count / next.days) * 100, 100);

  return {
    category: label,
    count,
    currentTitle: achieved?.title ?? "—",
    nextTitle,
    nextMilestoneDays,
    progress,
    icon: displayIcon,
    color,
  };
}

export default function MilestonesScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthContext();
  const { data, isLoading: dashPending } = useDashboardData(user?.profile?.uid);
  const { data: milestonesData, isPending: milestonesPending } = useMilestones(user?.profile?.uid);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);

  const { profile, userData } = useMemo(() => {
    return {
      profile: data?.profile,
      userData: data?.prayerData,
    };
  }, [data]);

  const streaks = milestonesData?.streaks;

  const completedCount = useMemo(() => {
    if (!userData || !userData.prayers) return 0;
    return Object.values(userData.prayers).filter((p: any) => typeof p === 'object' && p?.isPrayed).length;
  }, [userData]);

  const perfectTrack = useMemo(
    () => streakTrackProps("perfect", streaks?.perfect?.current ?? 0, "Perfect Streak"),
    [streaks?.perfect?.current]
  );
  const strongTrack = useMemo(
    () => streakTrackProps("strong", streaks?.strong?.current ?? 0, "Strong Streak"),
    [streaks?.strong?.current]
  );
  const growthTrack = useMemo(
    () => streakTrackProps("growth", streaks?.growth?.current ?? 0, "Growth Streak"),
    [streaks?.growth?.current]
  );

  if (dashPending || milestonesPending) {
    return (
      <View className="flex-1 bg-emerald-darkest items-center justify-center">
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-emerald-darkest">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-16 pb-4">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-emerald-soft items-center justify-center border border-gold/20 overflow-hidden mr-3">
            {profile?.profile?.photoURL ? (
              <Image source={{ uri: profile.profile.photoURL }} className="w-full h-full" />
            ) : (
              <Text className="text-gold font-bold">{profile?.profile?.name?.charAt(0) || "U"}</Text>
            )}
          </View>
          <Text className="text-gold text-2xl font-bold" style={{ fontFamily: 'serif' }}>Milestones</Text>
        </View>
        <TouchableOpacity className="bg-white/5 p-2 rounded-xl border border-gold/40" onPress={() => navigation.navigate("History")}>
          <Ionicons name="settings-outline" size={20} color={colors.gold} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Daily Performance Section */}
        <DailyPerformance completedCount={completedCount} />

        {/* Streak Tracks Section */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white text-xl font-bold" style={{ fontFamily: 'serif' }}>Streak Tracks</Text>
          </View>

          <StreakTrackCard {...perfectTrack} />

          <StreakTrackCard {...strongTrack} />

          <StreakTrackCard {...growthTrack} />
        </View>

        {/* Your Path to Nearness Section */}
        <View className="mb-10">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-white text-xl font-bold" style={{ fontFamily: 'serif' }}>Your Path to Nearness</Text>
          </View>
          <Text className="text-white/40 text-xs leading-relaxed mb-8">
            Every prayer is a step closer to Allah. Keep your heart firm on this path.
          </Text>

          <View className="flex-row flex-wrap justify-between">
            {(milestonesData?.milestones ?? []).map((m) => (
              <MilestoneItem
                key={`${m.category}-${m.days}`}
                title={m.title}
                unlocked={m.unlocked}
                color={m.color}
                icon={m.icon}
                description={m.description}
                onPress={() => {
                  console.log({ m });

                  if (!m.unlocked) {
                    setSelectedMilestone(m);
                  }
                }}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Milestone Details Modal */}
      <Modal
        visible={!!selectedMilestone}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMilestone(null)}
      >
        <Pressable
          className="flex-1 bg-black/80 justify-center items-center px-6"
          onPress={() => setSelectedMilestone(null)}
        >
          <Pressable
            className="w-full bg-[#1A1A1A] rounded-3xl p-6 items-center border border-white/10"
            onPress={(e) => e.stopPropagation()}
          >
            <View
              className="w-16 h-16 rounded-full items-center justify-center border mb-4"
              style={{
                borderColor: selectedMilestone?.color,
                backgroundColor: `${selectedMilestone?.color}18`,
              }}
            >
              <Ionicons
                name={selectedMilestone?.icon as any}
                size={28}
                color={selectedMilestone?.color}
              />
            </View>
            <Text className="text-white text-xl font-bold text-center mb-2" style={{ fontFamily: 'serif' }}>
              {selectedMilestone?.title}
            </Text>
            <Text className="text-white/60 text-center text-sm leading-relaxed mb-6">
              {selectedMilestone?.description || "You have reached this milestone. Keep up the great work!"}
            </Text>

            <TouchableOpacity
              className="w-full py-3 rounded-xl items-center"
              style={{ backgroundColor: selectedMilestone?.color }}
              onPress={() => setSelectedMilestone(null)}
            >
              <Text className="text-white font-bold text-base">Got it.!</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const MilestoneItem = ({
  title,
  unlocked,
  color,
  icon,
  description,
  onPress,
}: {
  title: string;
  unlocked?: boolean;
  color: string;
  icon: string;
  description?: string;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    className="items-center w-[30%] mb-8"
    onPress={onPress}
    activeOpacity={unlocked ? 0.7 : 1}
  >
    <View
      className={`w-16 h-16 rounded-full items-center justify-center border ${unlocked ? "bg-white/5" : "border-white/10 bg-white/5"}`}
      style={
        unlocked
          ? { borderColor: color, backgroundColor: `${color}18` }
          : undefined
      }
    >
      <Ionicons
        name={(unlocked ? icon : "lock-closed-outline") as any}
        size={24}
        color={unlocked ? color : "rgba(255,255,255,0.1)"}
      />
    </View>
    <Text
      className={`text-center text-[10px] mt-2 font-bold px-1 ${unlocked ? "" : "text-white/20"}`}
      style={unlocked ? { color } : undefined}
    >
      {title}
    </Text>
  </TouchableOpacity>
);
