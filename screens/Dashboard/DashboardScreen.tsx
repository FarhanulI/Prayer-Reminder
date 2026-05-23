import { Card } from "@/components/ui/card";
import colors from "@/constants/colors.json";
import { useAuthContext } from "@/context/AuthProvider";
import { refreshApplicationData } from "@/features/device.service";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePrayerLock } from "@/hooks/usePrayerLock";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import PrayerOverlayScreen from "../PrayerOverlayScreen";
import Header from "./Components/Header";
import UpcomingPrayerCard from "./Components/UpcomingPrayerCard";

dayjs.extend(isBetween);

/**
 * Stat card for Salat progress.
 */
const QuickActionCard = ({ title, value, subtext, remainingCount, completedCount }: any) => (
  <Card variant="large" className="flex-row justify-between items-center mb-8">
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
          className="absolute w-[84px] h-[84px] rounded-full border-[6px] border-gold"
          style={{ borderTopColor: 'transparent', borderLeftColor: 'transparent', transform: [{ rotate: '-15deg' }] }}
        />
        <Text className="text-white text-xl font-bold">{value}</Text>
      </View>
    </View>
  </Card>
);

// --- MAIN SCREEN ---

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthContext();
  const { data, isLoading: loading, refetch, isFetching } = useDashboardData(user?.uid);



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
  const [overlayPrayerDate, setOverlayPrayerDate] = useState("");
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
    if (!userData || !userData.prayers) return [];

    const formatTime = (t: string) => {
      if (!t) return "--:--";
      // Ensure we only take the HH:mm part (AlAdhan sometimes adds (UTC) etc.)
      const cleanTime = t.split(' ')[0];
      return dayjs(`2000-01-01 ${cleanTime}`).format("h:mm A");
    };

    return [
      { name: "Fajr", time: formatTime(userData.prayers.fajr?.time), rawTime: userData.prayers.fajr?.time, end: userData.prayers.fajr?.end, isPrayed: userData.prayers.fajr?.isPrayed, skipped: userData.prayers.fajr?.skipped },
      { name: "Dhuhr", time: formatTime(userData.prayers.dhuhr?.time), rawTime: userData.prayers.dhuhr?.time, end: userData.prayers.dhuhr?.end, isPrayed: userData.prayers.dhuhr?.isPrayed, skipped: userData.prayers.dhuhr?.skipped },
      { name: "Asr", time: formatTime(userData.prayers.asr?.time), rawTime: userData.prayers.asr?.time, end: userData.prayers.asr?.end, isPrayed: userData.prayers.asr?.isPrayed, skipped: userData.prayers.asr?.skipped },
      { name: "Maghrib", time: formatTime(userData.prayers.maghrib?.time), rawTime: userData.prayers.maghrib?.time, end: userData.prayers.maghrib?.end, isPrayed: userData.prayers.maghrib?.isPrayed, skipped: userData.prayers.maghrib?.skipped },
      { name: "Isha", time: formatTime(userData.prayers.isha?.time), rawTime: userData.prayers.isha?.time, end: userData.prayers.isha?.end, isPrayed: userData.prayers.isha?.isPrayed, skipped: userData.prayers.isha?.skipped },
    ];
  }, [userData]);

  // Calculate prayer list for locking (uses raw times for robust comparison)
  const lockPrayers = useMemo(() => {
    const list: any[] = [];
    const today = dayjs().format("YYYY-MM-DD");
    const yesterday = dayjs().subtract(1, 'day').format("YYYY-MM-DD");

    if (yesterdayData?.prayers?.isha) {
      list.push({
        name: "Isha",
        time: yesterdayData.prayers.isha.time,
        end: yesterdayData.prayers.isha.end,
        isPrayed: yesterdayData.prayers.isha.isPrayed,
        skipped: yesterdayData.prayers.isha.skipped,
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
    if (yesterdayData?.prayers?.isha) {
      times.push({
        name: "Isha",
        time: yesterdayData.prayers.isha.time,
        end: yesterdayData.prayers.isha.end,
        isPrayed: yesterdayData.prayers.isha.isPrayed,
        skipped: yesterdayData.prayers.isha.skipped,
        date: yesterday,
        dateTime: dayjs(`${yesterday} ${yesterdayData.prayers.isha.time}`),
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

  const onShowOverlay = useCallback(
    (prayerName: string, prayerEnd: string, prayerDate: string) => {
      console.log(`[Dashboard] Triggering overlay for: ${prayerName} until ${prayerEnd} (${prayerDate})`);
      setOverlayPrayerName(prayerName);
      setOverlayEndTime(prayerEnd);
      setOverlayPrayerDate(prayerDate);

      const prayer = lockPrayers.find(
        (p) => p.name === prayerName && p.date === prayerDate,
      );

      setIsSkipReminder(!!prayer?.skipped);
      setOverlayVisible(true);
    },
    [lockPrayers],
  );

  // --- Prayer Lock Hook ---
  const { markPrayerComplete, snoozeUntilTime } = usePrayerLock({
    uid: user?.uid ?? null,
    prayers: lockPrayers,
    onShowOverlay,
  });

  const handlePray = async (name: string) => {
    const finalName = name || overlayPrayerName;
    const logDate = overlayPrayerDate || dayjs().format("YYYY-MM-DD");
    console.log(`[Dashboard] Finalizing prayer completion for: ${finalName} (${logDate})`);
    // Sync completion to native storage before hiding overlay so blocked apps
    // cannot relaunch this app while Firestore/dashboard data is still stale.
    await markPrayerComplete(finalName, logDate);
    setOverlayVisible(false);
  };

  const handleRemindAt = async (targetTime: string, prayerEndTime: string) => {
    setOverlayVisible(false);
    await snoozeUntilTime(targetTime, prayerEndTime);
  };

  if (loading || isFetching) {
    return (
      <View className="flex-1 bg-emerald-darkest items-center justify-center">
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-emerald-darkest">
      {/* Prayer Lock Overlay */}
      <PrayerOverlayScreen
        visible={overlayVisible}
        prayerName={overlayPrayerName}
        prayerTime={prayerList.find(p => p.name === overlayPrayerName)?.time ?? ""}
        endTime={overlayEndTime}
        onPray={handlePray}
        onRemindAt={handleRemindAt}
        isSkipReminder={isSkipReminder}
      />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 60, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
        }
      >
        {/* Header Header */}
        <Header profile={profile} />

        {/* Upcoming Card (Unified with Prayer Times) */}
        {currentInfo && (
          <UpcomingPrayerCard
            title={currentInfo.title}
            name={currentInfo.name}
            time={currentInfo.time}
            countdownTarget={currentInfo.countdownTarget}
            isPrayed={currentInfo.isPrayed}
            isSkipped={currentInfo.isSkipped}
            prayerList={prayerList}
            profile={profile}
            prayerTimings={userData?.prayers}
          />
        )}

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

        {/* Feature Cards Row */}
        <View className="flex-row justify-between mb-8">
          <TouchableOpacity
            className="w-[48%] bg-emerald-dark rounded-[24px] p-4 border border-white/5 justify-center shadow-lg"
            onPress={() => navigation.navigate("Quran")}
            style={{ minHeight: 110 }}
          >
            <View className="flex-row items-center">
              <View className="w-[44px] h-[54px] rounded-2xl bg-gold/10 items-center justify-center mr-3">
                <Ionicons name="book" size={22} color={colors.gold} />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-[12px] tracking-widest leading-tight mb-1.5">READ{"\n"}QURAN</Text>
                <Text className="text-white/60 text-[10px] mb-0.5">Resume Surah</Text>
                <Text className="text-gold text-[11px] font-semibold">Al-Fatiha</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* <QiblaCard /> */}
        </View>

        {/* Verse Card */}
        {/* <View className="mb-10">
          <Text className="text-white text-lg font-semibold mb-4" style={{ fontFamily: 'serif' }}>Daily Verse</Text>
          <DailyVerseCard />
        </View> */}


      </ScrollView>

      {/* Floating Action Button for Streaks */}
      <TouchableOpacity
        style={{ position: 'absolute', right: 24, bottom: 24 }}
        className="bg-gold w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => navigation.navigate("Streaks")}
      >
        <Ionicons name="bar-chart" size={24} color={colors['emerald-login-bg']} />
      </TouchableOpacity>
    </View>
  );
}