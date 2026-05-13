import { useAuthContext } from "@/context/AuthProvider";
import { refreshApplicationData } from "@/features/device.service";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePrayerLock } from "@/hooks/usePrayerLock";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import PrayerOverlayScreen from "../PrayerOverlayScreen";
import ForbiddenTimesSection from "./Components/ForbiddenTimesSection";
import Header from "./Components/Header";
import PrayerTimesRow from "./Components/PrayerTimesRow";
import UpcomingPrayerCard from "./Components/UpcomingPrayerCard";

dayjs.extend(isBetween);

const { width } = Dimensions.get("window");

// --- SMALL COMPONENTS ---



/**
 * Stat card for Salat progress.
 */
const QuickActionCard = ({ title, value, subtext, remainingCount, completedCount }: any) => (
  <View className="bg-[#141d17] flex-row justify-between items-center border border-white/5 rounded-[32px] p-6 mb-8">
    <View className="flex-1 pr-4">
      <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1.5">{title}</Text>
      <Text className="text-white text-[28px] font-semibold leading-tight mb-2" style={{ fontFamily: 'serif' }}>{subtext}</Text>
      <Text className="text-white/30 text-[13px] font-medium">Prayed {" "}
        <Text className="text-white/60 text-[15px] font-semibold">{completedCount}</Text>
        {" "}Times
      </Text>
    </View>

    <View className="items-center justify-center">
      <View className="w-[84px] h-[84px] rounded-full border-[6px] border-white/5 items-center justify-center">
        {/* Simple Progress Track (approximate for UI) */}
        <View
          className="absolute w-[84px] h-[84px] rounded-full border-[6px] border-[#dbb142]"
          style={{ borderTopColor: 'transparent', borderLeftColor: 'transparent', transform: [{ rotate: '-15deg' }] }}
        />
        <Text className="text-white text-xl font-bold">{value}</Text>
      </View>
    </View>
  </View>
);

// --- MAIN SCREEN ---

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthContext();
  const { data, isLoading: loading, refetch } = useDashboardData(user?.uid);



  const { profile, userData, yesterdayData } = useMemo(() => {
    return {
      profile: data?.profile,
      userData: data?.userData,
      yesterdayData: data?.yesterdayData,
    }
  }, [data])

  const [refreshing, setRefreshing] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayPrayerName, setOverlayPrayerName] = useState("");
  const [overlayEndTime, setOverlayEndTime] = useState("");
  const [isSkipReminder, setIsSkipReminder] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    try {
      await refreshApplicationData(user.uid);
      await refetch();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.uid, refetch]);

  // Auto-refresh if no data is present on load
  React.useEffect(() => {
    if (user?.uid && !userData && !loading) {
      onRefresh();
    }
  }, [user?.uid, userData, loading, onRefresh]);

  // Calculate prayer list
  const prayerList = useMemo(() => {
    console.log({ userData });
    if (!userData) return [];

    const formatTime = (t: string) => {
      if (!t) return "--:--";
      // Ensure we only take the HH:mm part (AlAdhan sometimes adds (UTC) etc.)
      const cleanTime = t.split(' ')[0];
      return dayjs(`2000-01-01 ${cleanTime}`).format("h:mm A");
    };

    return [
      { name: "Fajr", time: formatTime(userData.fajr?.time), rawTime: userData.fajr?.time, end: userData.fajr?.end, isPrayed: userData.fajr?.isPrayed, skipped: userData.fajr?.skipped },
      { name: "Dhuhr", time: formatTime(userData.dhuhr?.time), rawTime: userData.dhuhr?.time, end: userData.dhuhr?.end, isPrayed: userData.dhuhr?.isPrayed, skipped: userData.dhuhr?.skipped },
      { name: "Asr", time: formatTime(userData.asr?.time), rawTime: userData.asr?.time, end: userData.asr?.end, isPrayed: userData.asr?.isPrayed, skipped: userData.asr?.skipped },
      { name: "Maghrib", time: formatTime(userData.maghrib?.time), rawTime: userData.maghrib?.time, end: userData.maghrib?.end, isPrayed: userData.maghrib?.isPrayed, skipped: userData.maghrib?.skipped },
      { name: "Isha", time: formatTime(userData.isha?.time), rawTime: userData.isha?.time, end: userData.isha?.end, isPrayed: userData.isha?.isPrayed, skipped: userData.isha?.skipped },
    ];
  }, [userData]);

  // Calculate prayer list for locking (uses raw times for robust comparison)
  const lockPrayers = useMemo(() => {
    const list: any[] = [];
    const today = dayjs().format("YYYY-MM-DD");
    const yesterday = dayjs().subtract(1, 'day').format("YYYY-MM-DD");

    if (yesterdayData?.isha) {
      list.push({
        name: "Isha",
        time: yesterdayData.isha.time,
        end: yesterdayData.isha.end,
        isPrayed: yesterdayData.isha.isPrayed,
        skipped: yesterdayData.isha.skipped,
        date: yesterday,
      });
    }

    prayerList.forEach(p => {
      list.push({
        ...p,
        time: p.rawTime, // Use raw 24h time for internal logic
        date: today
      });
    });

    return list;
  }, [yesterdayData, prayerList]);

  // Find next prayer
  const currentInfo = useMemo(() => {
    if (prayerList.length === 0) return null;

    const now = dayjs();
    const today = now.format("YYYY-MM-DD");
    const yesterday = now.subtract(1, 'day').format("YYYY-MM-DD");

    const times: any[] = [];

    // Prepend yesterday's Isha if we have it
    if (yesterdayData && yesterdayData.isha) {
      times.push({
        name: "Isha",
        time: yesterdayData.isha.time,
        end: yesterdayData.isha.end,
        isPrayed: yesterdayData.isha.isPrayed,
        skipped: yesterdayData.isha.skipped,
        date: yesterday,
        dateTime: dayjs(`${yesterday} ${yesterdayData.isha.time}`),
        isYesterday: true,
      });
    }

    // Convert today's prayer times to dayjs objects
    prayerList.forEach(p => {
      times.push({
        ...p,
        date: today,
        dateTime: dayjs(`${today} ${p.rawTime}`),
        isYesterday: false,
      });
    });

    // Find the one that is currently active (last one that passed)
    const active = [...times].reverse().find(p => p.dateTime.isBefore(now) || p.dateTime.isSame(now));

    // Find the upcoming one
    let upcoming = times.find(p => p.dateTime.isAfter(now));

    // Handle wrap around
    const nextDayFirst = times[0].dateTime.add(1, 'day');

    if (active) {
      let endTime = dayjs(`${active.date} ${active.end}`);
      const adjustedEnd = endTime.isBefore(active.dateTime) ? endTime.add(1, 'day') : endTime;

      if (!now.isAfter(adjustedEnd)) {
        return {
          title: "Current Prayer",
          name: active.name,
          time: active.time,
          date: active.date,
          countdownTarget: adjustedEnd.toISOString(),
          isYesterday: active.isYesterday,
          isPrayed: !!active.isPrayed,
          isSkipped: !!active.skipped,
        };
      }
    }

    const displayUpcoming = upcoming || { ...times[0], dateTime: nextDayFirst, date: dayjs(today).add(1, 'day').format('YYYY-MM-DD') };
    return {
      title: "Upcoming Prayer",
      name: displayUpcoming.name,
      time: displayUpcoming.time,
      date: displayUpcoming.date,
      countdownTarget: displayUpcoming.dateTime.toISOString(),
      isYesterday: false,
      isPrayed: false,
      isSkipped: false,
    };
  }, [prayerList, yesterdayData]);

  const completedCount = prayerList.filter(p => p.isPrayed).length;
  const remainingCount = 5 - completedCount;

  const onShowOverlay = useCallback((prayerName: string, prayerEnd: string) => {
    console.log(`[Dashboard] Triggering overlay for: ${prayerName} until ${prayerEnd}`);
    setOverlayPrayerName(prayerName);
    setOverlayEndTime(prayerEnd);

    // Check if this prayer is already marked as skipped
    const now = dayjs();
    const prayer = lockPrayers.find(p =>
      p.name === prayerName &&
      dayjs(`${p.date} ${p.time}`).isBefore(now.add(1, 'hour'))
    );

    setIsSkipReminder(!!prayer?.skipped);
    setOverlayVisible(true);
  }, [lockPrayers]);

  // --- Prayer Lock Hook ---
  const { markPrayerComplete, markPrayerSkipped, snoozeFor2Minutes } = usePrayerLock({
    uid: user?.uid ?? null,
    prayers: lockPrayers,
    onShowOverlay,
  });

  const handlePray = async (name: string) => {
    const finalName = name || overlayPrayerName;
    console.log(`[Dashboard] Finalizing prayer completion for: ${finalName}`);
    setOverlayVisible(false);
    await markPrayerComplete(finalName);
  };

  const handleSnooze = async () => {
    setOverlayVisible(false);
    await snoozeFor2Minutes();
  };

  const handleSkip = async () => {
    setOverlayVisible(false);
    await markPrayerSkipped(overlayPrayerName);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0d1410] items-center justify-center">
        <ActivityIndicator color="#dbb142" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0d1410]">
      {/* Prayer Lock Overlay */}
      <PrayerOverlayScreen
        visible={overlayVisible}
        prayerName={overlayPrayerName}
        prayerTime={prayerList.find(p => p.name === overlayPrayerName)?.time ?? ""}
        endTime={overlayEndTime}
        onPray={handlePray}
        onSnooze={handleSnooze}
        onSkip={handleSkip}
        isSkipReminder={isSkipReminder}
      />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 60, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#dbb142" />
        }
      >
        {/* Header Header */}
        <Header profile={profile} />

        {/* Quick Stats Row */}
        <View className="">
          <QuickActionCard
            title="Daily Salat"
            value={`${completedCount}/5`}
            subtext="Today's Progress"
            remainingCount={remainingCount}
            completedCount={completedCount}
          />
        </View>

        {/* Upcoming Card */}
        {currentInfo && (
          <UpcomingPrayerCard
            title={currentInfo.title}
            name={currentInfo.name}
            time={currentInfo.time}
            countdownTarget={currentInfo.countdownTarget}
            isPrayed={currentInfo.isPrayed}
            isSkipped={currentInfo.isSkipped}
          />
        )}

        {/* Today's Times Row */}
        <PrayerTimesRow
          prayerList={prayerList}
          currentInfo={currentInfo}
          loading={loading}
        />



        {/* Streaks & Milestones */}


        {/* Verse Card */}
        {/* <View className="mb-10">
          <Text className="text-white text-lg font-semibold mb-4" style={{ fontFamily: 'serif' }}>Daily Verse</Text>
          <DailyVerseCard />
        </View> */}

        {/* Forbidden Times Section */}
        <View className="mb-10">
          <Text className="text-white text-lg font-semibold mb-4" style={{ fontFamily: 'serif' }}>Forbidden Times</Text>
          <ForbiddenTimesSection
            sunTimings={profile?.sunTimings}
            prayerTimes={userData}
          />
        </View>
      </ScrollView>

      {/* Floating Action Button for Streaks */}
      <TouchableOpacity
        style={{ position: 'absolute', right: 24, bottom: 24 }}
        className="bg-[#dbb142] w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => navigation.navigate("Streaks")}
      >
        <Ionicons name="bar-chart" size={24} color="#101a15" />
      </TouchableOpacity>
    </View>
  );
}