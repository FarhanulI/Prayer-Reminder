import CircularProgress from "@/components/CircularProgress";
import Skeleton from "@/components/Skeleton";
import { Card } from "@/components/ui/card";
import colors from "@/constants/colors.json";
import { useAuthContext } from "@/context/AuthProvider";
import { refreshApplicationData } from "@/features/device.service";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useEndOfDayReminder } from "@/hooks/useEndOfDayReminder";
import { usePrayerLock } from "@/hooks/usePrayerLock";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import EndOfDayOverlayScreen from "../EndOfDayOverlayScreen";
import PrayerOverlayScreen from "../PrayerOverlayScreen";
import BookmarksCard from "./Components/BookmarksCard";
import ContinueReadingCard from "./Components/ContinueReadingCard";
import DailyVerseCard from "./Components/DailyVerseCard";
import Header from "./Components/Header";
import UpcomingPrayerCard from "./Components/UpcomingPrayerCard";

dayjs.extend(isBetween);

/**
 * Stat card for Salat progress.
 */
const QuickActionCard = ({ title, value, subtext, remainingCount, completedCount }: any) => {
  const navigation = useNavigation<any>();

  return (
    <Card variant="large" className="flex-row justify-between items-center mb-8">
      <View className="flex-1 pr-4">
        <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1.5">{title}</Text>
        <Text className="text-white text-[28px] font-semibold leading-tight mb-2" style={{ fontFamily: 'serif' }}>{subtext}</Text>
        <Text className="text-white/30 text-[13px] font-medium">Prayed {" "}
          <Text className="text-white/60 text-[15px] font-semibold">{completedCount}</Text>
          {" "}Times
        </Text>

        <TouchableOpacity onPress={() => navigation.navigate("History")}>
          <View className="flex-row items-center border border-gold bg-gold/10 px-3 py-2 rounded-xl mt-2"
          >
            <Ionicons name="stats-chart-outline" size={14} color={colors.gold} />
            <Text className="text-gold text-[7px] font-bold ml-1.5 tracking-widest uppercase">Weekly Progress</Text>
          </View>

        </TouchableOpacity>
      </View>

      <CircularProgress value={completedCount || 0} total={5} />
    </Card>
  )
};

// --- MAIN SCREEN ---

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthContext();
  const { data, isLoading: loading, refetch, isFetching } = useDashboardData(user?.profile?.uid);

  const { profile, prayerData, yesterdayData } = useMemo(() => {
    return {
      profile: data?.profile,
      prayerData: data?.prayerData,
      yesterdayData: data?.yesterdayData,
    }
  }, [data])

  const [refreshing, setRefreshing] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayPrayerName, setOverlayPrayerName] = useState("");
  const [overlayPrayerDate, setOverlayPrayerDate] = useState("");
  const [overlayEndTime, setOverlayEndTime] = useState("");
  const [isSkipReminder, setIsSkipReminder] = useState(false);

  const { visible: eodVisible, dismiss: dismissEod } = useEndOfDayReminder();

  const onRefresh = useCallback(async () => {
    if (!user?.profile?.uid) return;
    setRefreshing(true);
    try {
      await refreshApplicationData(user?.profile?.uid);
      await refetch();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.profile?.uid, refetch]);

  // Auto-refresh if no data is present on load
  // React.useEffect(() => {
  //   if (user?.profile?.uid && !prayerData && !loading) {
  //     onRefresh();
  //   }
  // }, [user?.profile?.uid, prayerData, loading, onRefresh]);

  // Calculate prayer list
  const prayerList = useMemo(() => {
    if (!prayerData || !prayerData.prayers) return [];

    const today = dayjs().format("YYYY-MM-DD");

    const formatTime = (t: string) => {
      if (!t) return "--:--";
      // Ensure we only take the HH:mm part (AlAdhan sometimes adds (UTC) etc.)
      const cleanTime = t.split(' ')[0];
      return dayjs(`2000-01-01 ${cleanTime}`).format("h:mm A");
    };

    return [
      { name: "Fajr", time: formatTime(prayerData.prayers.fajr?.time), rawTime: prayerData.prayers.fajr?.time, end: prayerData.prayers.fajr?.end, isPrayed: prayerData.prayers.fajr?.isPrayed, skipped: prayerData.prayers.fajr?.skipped, date: today },
      { name: "Dhuhr", time: formatTime(prayerData.prayers.dhuhr?.time), rawTime: prayerData.prayers.dhuhr?.time, end: prayerData.prayers.dhuhr?.end, isPrayed: prayerData.prayers.dhuhr?.isPrayed, skipped: prayerData.prayers.dhuhr?.skipped, date: today },
      { name: "Asr", time: formatTime(prayerData.prayers.asr?.time), rawTime: prayerData.prayers.asr?.time, end: prayerData.prayers.asr?.end, isPrayed: prayerData.prayers.asr?.isPrayed, skipped: prayerData.prayers.asr?.skipped, date: today },
      { name: "Maghrib", time: formatTime(prayerData.prayers.maghrib?.time), rawTime: prayerData.prayers.maghrib?.time, end: prayerData.prayers.maghrib?.end, isPrayed: prayerData.prayers.maghrib?.isPrayed, skipped: prayerData.prayers.maghrib?.skipped, date: today },
      { name: "Isha", time: formatTime(prayerData.prayers.isha?.time), rawTime: prayerData.prayers.isha?.time, end: prayerData.prayers.isha?.end, isPrayed: prayerData.prayers.isha?.isPrayed, skipped: prayerData.prayers.isha?.skipped, date: today },
    ];
  }, [prayerData]);

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
    uid: user?.profile?.uid ?? null,
    prayers: lockPrayers,
    onShowOverlay,
  });

  const handlePray = async (name: string) => {
    const finalName = name || overlayPrayerName;
    const logDate = overlayPrayerDate || dayjs().format("YYYY-MM-DD");
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
      <EndOfDayOverlayScreen
        visible={eodVisible}
        missedPrayers={prayerList.filter(p => {
          if (p.isPrayed) return false;
          if (p.skipped) return true;
          if (!p.end || !p.rawTime) return false;
          const cleanEnd = p.end.split(' ')[0];
          const cleanTime = p.rawTime.split(' ')[0];
          let endObj = dayjs(`${p.date} ${cleanEnd}`);
          const startObj = dayjs(`${p.date} ${cleanTime}`);
          if (endObj.isBefore(startObj)) {
            endObj = endObj.add(1, 'day');
          }
          return endObj.isBefore(dayjs());
        })}
        currentPrayer={currentInfo}
        onClose={dismissEod}
        onLogPrayer={async (name, date) => {
          await markPrayerComplete(name, date || dayjs().format("YYYY-MM-DD"));
          // If no more missed prayers, close overlay
          const remaining = prayerList.filter(p => {
            if (p.isPrayed || p.name === name) return false;
            if (p.skipped) return true;
            if (!p.end || !p.rawTime) return false;
            const cleanEnd = p.end.split(' ')[0];
            const cleanTime = p.rawTime.split(' ')[0];
            let endObj = dayjs(`${p.date} ${cleanEnd}`);
            const startObj = dayjs(`${p.date} ${cleanTime}`);
            if (endObj.isBefore(startObj)) {
              endObj = endObj.add(1, 'day');
            }
            return endObj.isBefore(dayjs());
          });
          if (remaining.length === 0) dismissEod();
        }}
      />
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
        {currentInfo ? (
          <UpcomingPrayerCard
            title={currentInfo.title}
            name={currentInfo.name}
            time={currentInfo.time}
            countdownTarget={currentInfo.countdownTarget}
            isPrayed={currentInfo.isPrayed}
            isSkipped={currentInfo.isSkipped}
            prayerList={prayerList}
            profile={profile}
            prayerTimings={prayerData?.prayers}
          />
        ) : (
          <Skeleton height={230} className="w-full mb-8" borderRadius={24} />
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

        {/* Feature Cards Row — Last Read + Bookmarks */}
        <View className="flex-row justify-between mb-8">
          <ContinueReadingCard onPress={(lastRead) => navigation.navigate("Quran", { surahNumber: lastRead?.surahNumber, ayahNumber: lastRead?.ayahNumber })} />
          <BookmarksCard onPress={() => navigation.navigate("Bookmarks")} />
        </View>

        {/* Verse Card */}
        <View className="mb-10">
          {/* <Text className="text-white text-lg font-semibold mb-4" style={{ fontFamily: 'serif' }}>Daily Verse</Text> */}
          <DailyVerseCard />
        </View>
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