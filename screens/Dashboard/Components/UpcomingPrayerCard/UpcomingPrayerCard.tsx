import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Animated, Text, View } from "react-native";

import Skeleton from "@/components/Skeleton"; // Adjust this import path if needed
import { Card } from "@/components/ui/card";
import colors from "@/constants/colors.json";
import { PrayerCollection, PrayerLogDocument, UserDocument } from "@/types";

import Qibla from "../Qibla";
import { useCountdown } from "./hook/useCountdown";
import { useDateSwitcher } from "./hook/useDateSwitcher";
import { NextPrayerBadge } from "./NextPrayerBadge";
import { PrayerGrid } from "./PrayerGrid/PrayerGrid";
import SunTimings from "./SunTimings";
import {
  createPrayerList,
  formatLocationName,
  handleCheckYesterdaysLastPendingPrayer,
  handleCurrentInfo,
} from "./utils";

export type TPrayerList = {
  name: string;
  time: string;
  rawTime: string;
  end: string;
  isPrayed: boolean;
  skipped: boolean;
  date: string;
};
interface UpcomingPrayerCardProps {
  prayerList: TPrayerList[];
  yesterdayData: PrayerLogDocument;
  profile?: UserDocument | null | undefined;
  prayerTimings?: PrayerCollection;
  onCountdownComplete?: () => void;
}

const UpcomingPrayerCard: React.FC<UpcomingPrayerCardProps> = ({
  prayerList,
  yesterdayData,
  profile,
}) => {
  const navigation = useNavigation<any>();
  const [locationName, setLocationName] = useState<string>("Locating...");

  // ---------------------------------------------------------------------------
  // Internal Current/Upcoming Prayer Calculation
  // ---------------------------------------------------------------------------
  const currentInfo = useMemo(
    () => handleCurrentInfo(prayerList, yesterdayData),
    [prayerList, yesterdayData],
  );

  // Destructure computed variables safely
  const { title, name, time, countdownTarget, isPrayed, isSkipped } =
    currentInfo ?? {};

  // Hook for handling prayer countdown and current time live updates
  const { timeLeft, currentTime } = useCountdown(
    countdownTarget ?? "",
    !!isPrayed,
  );

  const isYesterdayLastPrayerMissed = useMemo(
    () => handleCheckYesterdaysLastPendingPrayer(yesterdayData),
    [yesterdayData],
  );

  // Hook for managing date switcher alternating animations
  const { currentDateIndex, fadeAnim, translateYAnim, englishDate, hijriDate } =
    useDateSwitcher(profile);

  // Fetch location reverse-geocoded name
  useEffect(() => {
    let isMounted = true;
    const fetchLocationName = async () => {
      if (profile?.location) {
        try {
          const { latitude, longitude } = profile.location;
          const [result] = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          if (isMounted) {
            setLocationName(formatLocationName(result));
          }
        } catch (error) {
          if (isMounted) {
            setLocationName("Unknown Location");
          }
        }
      }
    };
    fetchLocationName();
    return () => {
      isMounted = false;
    };
  }, [profile?.location]);

  // Memoize next prayer calculation
  const nextPrayer = useMemo(() => {
    if (!prayerList || !name) return null;
    const currentIndex = prayerList.findIndex((p) => p.name === name);
    if (currentIndex === -1) return null;
    return prayerList[(currentIndex + 1) % prayerList.length];
  }, [prayerList, name]);

  // Handle navigation to Forbidden Times
  const handleForbiddenTimesPress = useCallback(() => {
    navigation.navigate("Forbidden-times", {
      sunTimings: profile?.sunTimings,
      prayerTimes: prayerList,
    });
  }, [navigation, profile?.sunTimings, prayerList]);

  // Render Skeleton placeholder if data is not yet parsed
  if (!currentInfo) {
    return <Skeleton height={230} className="w-full mb-8" borderRadius={24} />;
  }

  return (
    <Card variant="large" className="mb-8 shadow-2xl relative overflow-hidden">
      {/* Background Decorative Circle */}
      <View className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/[0.02]" />

      <View className="flex-row justify-between">
        <View className="flex-col gap-3">
          <Card
            variant="default"
            className="bg-gold/10 px-3 py-1.5 rounded-md border border-gold/20"
          >
            <Text className="text-gold text-[10px] font-bold uppercase tracking-widest">
              {title}
            </Text>
          </Card>

          <View className="flex-row flex-wrap items-center gap-2">
            {/* Prayer Name */}
            <Text
              className="text-white text-4xl font-semibold mb-2"
              style={{ fontFamily: "serif" }}
            >
              {name}
            </Text>

            {/* Status Badges */}
            <View className="flex-row items-center ml-2">
              {isPrayed && (
                <Card
                  variant="default"
                  className="bg-green-500/20 px-2 py-1 rounded-full flex-row items-center"
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={8}
                    color={colors.success}
                  />
                  <Text className="text-success text-[6px] font-bold ml-1">
                    PRAYED
                  </Text>
                </Card>
              )}
              {isSkipped && (
                <View className="bg-white/10 px-2 py-1 rounded-full flex-row items-center">
                  <Ionicons
                    name="close-circle"
                    size={10}
                    color="rgba(255,255,255,0.4)"
                  />
                  <Text className="text-white/40 text-[9px] font-bold ml-1">
                    SKIPPED
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View>
          {/* Current Time */}
          <Text
            className="text-white text-center text-[30px] font-medium leading-tight tracking-tight mb-1"
            style={{ fontFamily: "serif" }}
          >
            {currentTime.format("h:mm A")}
          </Text>

          {/* Animated Date */}
          <View className="overflow-hidden justify-center items-center mb-2 h-[16px]">
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: translateYAnim }],
              }}
            >
              <Text className="text-white/60 text-xs font-medium tracking-wide text-center">
                {currentDateIndex === 0 ? englishDate : hijriDate}
              </Text>
            </Animated.View>
          </View>

          {/* Location name */}
          <View className="flex-row items-center mb-4">
            <Ionicons name="location" size={14} color="rgba(255,255,255,0.4)" />
            <Text className="text-white/40 ml-1.5 text-sm">{locationName}</Text>
          </View>
        </View>
      </View>

      <View className="flex-row justify-between items-center">
        <View>
          {/* Big Time / Countdown */}
          {isPrayed ? (
            <NextPrayerBadge nextPrayer={nextPrayer} />
          ) : (
            <Text className="text-white/50 text-sm mt-6">
              {title?.toLowerCase().includes("current") ? "began" : "begins"} at{" "}
              {time}
            </Text>
          )}

          {!isPrayed && (
            <Text
              className="text-gold text-[56px]  font-medium leading-tight tracking-tight mb-1"
              style={{ fontFamily: "serif" }}
            >
              {timeLeft}
            </Text>
          )}
        </View>

        <View>
          <Qibla />
        </View>
      </View>

      {/* Sunrise & Sunset Row */}
      <SunTimings profile={profile!} />

      {/* Divider */}
      <View className="h-[1px] bg-white/10 w-full my-8" />

      {isYesterdayLastPrayerMissed ? (
        <Card className="bg-gold px-3 py-1 rounded-full border border-white/5">
          <Text className="text-emerald-dark text-[12px] font-bold text-center">
            It will be Updated After ISHA prayer is prayer
          </Text>
        </Card>
      ) : (
        <></>
      )}

      {/* Prayer Times Grid */}
      <PrayerGrid
        prayerList={
          isYesterdayLastPrayerMissed
            ? createPrayerList(yesterdayData)
            : prayerList
        }
        activeName={name ?? ""}
        onForbiddenTimesPress={handleForbiddenTimesPress}
      />
    </Card>
  );
};

export default UpcomingPrayerCard;
