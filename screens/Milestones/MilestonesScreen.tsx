import {
  STREAK_MILESTONES,
  StreakCategory,
  getMilestoneForStreak,
  getNextMilestone,
} from "@/constants/milestones";
import { useAuthContext } from "@/context/AuthProvider";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useMilestones } from "@/hooks/useMilestones";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo } from "react";
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

// --- COMPONENTS ---

/**
 * Circular progress indicator for daily performance.
 */
const CircularProgress = ({ value, total, size = 180 }: { value: number; total: number; size?: number }) => {
  const percentage = (value / total) * 100;

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      {/* Background Track */}
      <View
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="border-[6px] border-white/5 absolute"
      />

      {/* Progress Track (Approximate with CSS-only for simplicity, would use SVG for perfect arc) */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 6,
          borderColor: '#dbb142',
          borderTopColor: 'transparent',
          borderLeftColor: 'transparent',
          transform: [{ rotate: `${(percentage / 100) * 360 - 45}deg` }]
        }}
        className="absolute"
      />

      <View className="items-center">
        <Text className="text-white text-5xl font-bold">{value}/{total}</Text>
        <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[4px] mt-1">Prayers Today</Text>
      </View>
    </View>
  );
};

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
    <View className="bg-[#141d17] border border-white/5 rounded-[24px] p-5 mb-4">
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

      <Text className="text-white/40 text-[10px] font-medium text-center italic">
        "Keep the flame alive!"
      </Text>
    </View>
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
  const uid = user?.uid;
  const { data, isPending: dashPending } = useDashboardData(uid);
  const { data: milestonesData, isPending: milestonesPending } = useMilestones(uid);

  const { profile, userData } = useMemo(() => {
    return {
      profile: data?.profile,
      userData: data?.userData,
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

  const loading = dashPending || milestonesPending;

  if (loading) {
    return (
      <View className="flex-1 bg-[#0d1410] items-center justify-center">
        <ActivityIndicator color="#dbb142" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0d1410]">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-16 pb-4">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-[#182a1d] items-center justify-center border border-[#dbb142]/20 overflow-hidden mr-3">
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} className="w-full h-full" />
            ) : (
              <Text className="text-[#dbb142] font-bold">{profile?.name?.charAt(0) || "U"}</Text>
            )}
          </View>
          <Text className="text-[#dbb142] text-2xl font-bold" style={{ fontFamily: 'serif' }}>Milestones</Text>
        </View>
        <TouchableOpacity className="bg-white/5 p-2 rounded-xl" onPress={() => navigation.navigate("History")}>
          <Ionicons name="settings-outline" size={20} color="white/60" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Daily Performance Section */}
        <View className="items-center my-8">
          <Text className="text-white/60 text-lg font-medium mb-8" style={{ fontFamily: 'serif' }}>Daily Performance</Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("History")}
          >
            <CircularProgress value={completedCount} total={5} />
          </TouchableOpacity>

          <View className="mt-8 bg-[#dbb142]/10 px-6 py-2.5 rounded-full border border-[#dbb142]/20 flex-row items-center">
            <MaterialCommunityIcons name="medal-outline" size={18} color="#dbb142" />
            <Text className="text-[#dbb142] text-[11px] font-bold uppercase tracking-widest ml-2">Strong Day</Text>
          </View>

          <Text className="text-white/30 text-xs font-medium italic mt-6 text-center px-10">
            "Building solid habits, one prayer at a time."
          </Text>
        </View>

        {/* Streak Tracks Section */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white text-xl font-bold" style={{ fontFamily: 'serif' }}>Streak Tracks</Text>
            <TouchableOpacity
              className="flex-row items-center border border-[#dbb142]/40 bg-[#dbb142]/10 px-3 py-1.5 rounded-full"
              onPress={() => navigation.navigate("MilestoneDetails")}
            >
              <Ionicons name="information-circle-outline" size={14} color="#dbb142" />
              <Text className="text-[#dbb142] text-[10px] font-bold ml-1.5 tracking-widest uppercase">How it works</Text>
            </TouchableOpacity>
          </View>

          <StreakTrackCard {...perfectTrack} />

          <StreakTrackCard {...strongTrack} />

          <StreakTrackCard {...growthTrack} />
        </View>

        {/* Your Path to Nearness Section */}
        <View className="mb-10">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-white text-xl font-bold" style={{ fontFamily: 'serif' }}>Your Path to Nearness</Text>
            <TouchableOpacity onPress={() => navigation.navigate("MilestoneDetails")}>
              <Text className="text-[#dbb142] text-xs font-bold uppercase tracking-wider">Details</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-white/40 text-xs leading-relaxed mb-8">
            Every prayer is a step closer to the Divine. Keep your heart firm on this path.
          </Text>

          <View className="flex-row flex-wrap justify-between">
            {(milestonesData?.milestones ?? []).map((m) => (
              <MilestoneItem
                key={`${m.category}-${m.days}`}
                title={m.title}
                unlocked={m.unlocked}
                color={m.color}
                icon={m.icon}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const MilestoneItem = ({
  title,
  unlocked,
  color,
  icon,
}: {
  title: string;
  unlocked?: boolean;
  color: string;
  icon: string;
}) => (
  <View className="items-center w-[30%] mb-8">
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
  </View>
);
