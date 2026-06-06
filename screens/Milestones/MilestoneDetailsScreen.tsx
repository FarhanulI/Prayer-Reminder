import colors from "@/constants/colors.json";
import { STREAK_MILESTONES } from "@/constants/milestones";
import { useAuthContext } from "@/context/AuthProvider";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useMilestones } from "@/hooks/useMilestones";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo } from "react";
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function MilestoneDetailsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthContext();
  const { data, isLoading: dashPending } = useDashboardData(user?.profile?.uid);
  const { data: milestonesData, isPending: milestonesPending } = useMilestones(user?.profile?.uid);

  const { profile } = useMemo(() => {
    return {
      profile: data?.profile,
    };
  }, [data]);

  const streaks = milestonesData?.streaks;
  const perfectStreak = streaks?.perfect?.current ?? 0;

  if (dashPending || milestonesPending) {
    return (
      <View className="flex-1 bg-emerald-dark items-center justify-center">
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-emerald-dark">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-16 pb-4 bg-emerald-dark">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            className="mr-3 p-2 -ml-2"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors['emerald-sage']} />
          </TouchableOpacity>
          <Text className="text-emerald-sage text-lg font-bold flex-1" style={{ fontFamily: 'serif' }}>
            Understanding Your Path
          </Text>
        </View>

        <View className="w-10 h-10 rounded-full bg-emerald-soft items-center justify-center overflow-hidden border border-white/10">
          {profile?.photoURL ? (
            <Image source={{ uri: profile.photoURL }} className="w-full h-full" />
          ) : (
            <Text className="text-gold font-bold">{profile?.name?.charAt(0) || "U"}</Text>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 bg-emerald-dark"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
      >
        {/* Journey of the Soul Card */}
        <View className="bg-emerald-medium-dark border-l-4 border-l-gold rounded-xl p-5 mb-8 border border-white/5">
          <Text className="text-gold text-lg font-bold mb-3" style={{ fontFamily: 'serif' }}>
            Narrated Abu Huraira:
          </Text>
          <Text className="text-white/70 text-xs leading-relaxed">
            I heard Allah's Messenger (ﷺ) saying, "If there was a river at the door of anyone of you and he took a bath in it five times a day would you notice any dirt on him?"
            They said, "Not a trace of dirt would be left." The Prophet (ﷺ) added, "That is the example of the five prayers with which Allah blots out (annuls) evil deeds."
          </Text>
          <Text className="text-gold text-xs leading-relaxed mt-2">
            Sahih al-Bukhari 528, Book 9, Hadith 7
          </Text>
        </View>

        {/* The Perfect Track Heading */}
        <View className="flex-row items-center mb-6">
          <Ionicons name="star" size={18} color={colors.gold} />
          <Text className="text-white text-lg font-bold ml-2" style={{ fontFamily: 'serif' }}>
            The 'Perfect' Track
          </Text>
        </View>

        {/* Timeline */}
        <View className="mb-8 pl-4">
          {/* Vertical Line Background */}
          <View className="absolute left-[39px] top-4 bottom-8 w-[1px] bg-white/10" />

          {STREAK_MILESTONES.perfect.map((milestone: any, index: number) => {
            const isUnlocked = perfectStreak >= milestone.days;
            const isNext = !isUnlocked && (index === 0 || perfectStreak >= STREAK_MILESTONES.perfect[index - 1].days);

            // Icon color logic
            let iconColor = "rgba(255,255,255,0.3)";
            let borderColor = "border-white/10";
            let bgColor = "bg-emerald-soft";

            if (isUnlocked) {
              iconColor = milestone.color;
              borderColor = "border-gold";
              bgColor = "bg-gold/10";
            } else if (isNext) {
              borderColor = "border-white/30";
            }

            return (
              <View key={milestone.days} className="flex-row mb-6 relative">
                {/* Timeline Icon */}
                <View className="z-10 mr-4 mt-1">
                  <View className={`w-12 h-12 rounded-full items-center justify-center border-2 ${borderColor} ${bgColor}`}>
                    <Ionicons
                      name={milestone.icon as any}
                      size={20}
                      color={iconColor}
                    />
                  </View>
                </View>

                {/* Content Card */}
                <View className="flex-1 bg-emerald-medium-dark rounded-xl p-4 border border-white/5">
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className={`font-bold flex-1 mr-2 ${isUnlocked ? 'text-white' : 'text-white/60'}`} style={{ fontFamily: 'serif' }}>
                      {milestone.title}
                    </Text>
                    <View className="bg-white/5 px-2 py-1 rounded">
                      <Text className={`text-[10px] font-bold ${isUnlocked ? 'text-gold' : 'text-white/40'}`}>
                        {milestone.days} Days
                      </Text>
                    </View>
                  </View>
                  <Text className="text-white/50 text-[11px] leading-relaxed">
                    {milestone.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Flexible Growth Card */}
        <View className="bg-emerald-soft rounded-xl p-5 mb-8 border border-white/5">
          <View className="flex-row items-center mb-3">
            <Ionicons name="git-branch-outline" size={20} color={colors['emerald-sage']} className="mr-2" />
            <Text className="text-emerald-sage text-lg font-bold ml-2" style={{ fontFamily: 'serif' }}>
              Flexible Growth
            </Text>
          </View>
          <Text className="text-white/70 text-[11px] leading-relaxed mb-6">
            Every effort is seen by Allah. If you miss a step, do not lose hope. These paths are here to support your climb back to the full five daily prayers, ensuring you never stop moving toward Him.
          </Text>

          <View className="flex-row justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-white/40 text-[10px] font-bold tracking-widest mb-2">
                STRONG TRACK
              </Text>
              <Text className="text-white/60 text-[10px] leading-relaxed">
                For those maintaining 4/5 daily prayers. Focuses on bridging the gap to full consistency.
              </Text>
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-white/40 text-[10px] font-bold tracking-widest mb-2">
                GROWTH TRACK
              </Text>
              <Text className="text-white/60 text-[10px] leading-relaxed">
                A supportive path for beginners or those restarting their journey. Every prayer counts.
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Quote / Image Placeholder */}
        <View className="rounded-xl overflow-hidden h-40 border border-white/10 mb-8 relative bg-black items-center justify-center">
          {/* Dark overlay */}
          <View className="absolute inset-0 bg-gold/10" />

          <View className="absolute bottom-4 px-4 items-center w-full">
            <Text className="text-gold text-sm font-bold text-center italic" style={{ fontFamily: 'serif' }}>
              "Verily in the remembrance of Allah do hearts find rest."
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
