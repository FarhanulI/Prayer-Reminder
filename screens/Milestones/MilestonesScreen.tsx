import { useAuthContext } from "@/context/AuthProvider";
import { STREAK_MILESTONES, StreakCategory, getMilestoneForStreak } from "@/constants/milestones";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
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
  title,
  icon,
  color,
  nextMilestoneDays
}: {
  category: string;
  count: number;
  title: string;
  icon: string;
  color: string;
  nextMilestoneDays: number;
}) => {
  const progress = Math.min((count / nextMilestoneDays) * 100, 100);

  return (
    <View className="bg-[#141d17] border border-white/5 rounded-[24px] p-5 mb-4">
      <View className="flex-row items-center mb-4">
        <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: `${color}15` }}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>

        <View className="flex-1">
          <View className="flex-row justify-between items-center mb-0.5">
            <Text className="text-white text-[16px] font-semibold">{category}</Text>
            <Text className="text-[#dbb142] font-bold text-[16px]">{count} Days</Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-white/40 text-[10px] uppercase font-bold tracking-widest">{title}</Text>
            <Text className="text-white/30 text-[10px] font-bold uppercase">Current</Text>
          </View>
        </View>
      </View>

      {/* Progress Info */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-white/60 text-[10px] font-bold uppercase">Next: {title}</Text>
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

export default function MilestonesScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthContext();
  const { data, isLoading: loading } = useDashboardData(user?.uid);

  const { profile, userData, streaks } = useMemo(() => {
    return {
      profile: data?.profile,
      userData: data?.userData,
      streaks: data?.streaks,
    };
  }, [data]);

  const completedCount = useMemo(() => {
    if (!userData) return 0;
    return Object.values(userData).filter((p: any) => p.isPrayed).length;
  }, [userData]);

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
          <Text className="text-white text-xl font-bold mb-6" style={{ fontFamily: 'serif' }}>Streak Tracks</Text>

          <StreakTrackCard
            category="Perfect Streak"
            count={streaks?.perfect?.current || 0}
            title="Consistent"
            icon="flame"
            color="#dbb142"
            nextMilestoneDays={7}
          />

          <StreakTrackCard
            category="Strong Streak"
            count={streaks?.strong?.current || 0}
            title="Dedicated"
            icon="fitness"
            color="#4ade80"
            nextMilestoneDays={14}
          />

          <StreakTrackCard
            category="Growth Streak"
            count={streaks?.growth?.current || 0}
            title="Momentum"
            icon="leaf"
            color="#60a5fa"
            nextMilestoneDays={30}
          />
        </View>

        {/* Your Path to Nearness Section */}
        <View className="mb-10">
          <Text className="text-white text-xl font-bold mb-2" style={{ fontFamily: 'serif' }}>Your Path to Nearness</Text>
          <Text className="text-white/40 text-xs leading-relaxed mb-8">
            Every prayer is a step closer to the Divine. Keep your heart firm on this path.
          </Text>

          <View className="flex-row flex-wrap justify-between">
            <MilestoneItem title="First Steps to Him" unlocked />
            <MilestoneItem title="Finding Steadfastness" unlocked />
            <MilestoneItem title="A Heart Devoted" unlocked />
            <MilestoneItem title="Disciplined" />
            <MilestoneItem title="Unstoppable" />
            <MilestoneItem title="Elite" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const MilestoneItem = ({ title, unlocked }: { title: string; unlocked?: boolean }) => (
  <View className="items-center w-[30%] mb-8">
    <View className={`w-16 h-16 rounded-full items-center justify-center border ${unlocked ? 'border-[#dbb142] bg-[#dbb142]/10' : 'border-white/10 bg-white/5'}`}>
      <Ionicons
        name={unlocked ? (title.includes('Finding') ? 'trophy-outline' : title.includes('Heart') ? 'shield-checkmark-outline' : 'star-outline') : 'lock-closed-outline'}
        size={24}
        color={unlocked ? "#dbb142" : "rgba(255,255,255,0.1)"}
      />
    </View>
    <Text className={`text-center text-[10px] mt-2 font-bold px-1 ${unlocked ? 'text-[#dbb142]' : 'text-white/20'}`}>
      {title}
    </Text>
  </View>
);
