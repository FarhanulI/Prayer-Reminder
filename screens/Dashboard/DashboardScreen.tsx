import { useAuthContext } from "@/context/AuthProvider";
import { refreshApplicationData } from "@/features/device.service";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePrayerLock } from "@/hooks/usePrayerLock";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import PrayerOverlayScreen from "../PrayerOverlayScreen";
import DailyVerseCard from "./Components/DailyVerseCard";
import ForbiddenTimesSection from "./Components/ForbiddenTimesSection";
import Header from "./Components/Header";
import UpcomingPrayerCard from "./Components/UpcomingPrayerCard";

dayjs.extend(isBetween);

const { width } = Dimensions.get("window");

// --- SMALL COMPONENTS ---

/**
 * Individual prayer time card in the horizontal row.
 */
const PrayerTimeItem = ({ name, time, isActive }: { name: string; time: string; isActive?: boolean }) => (
  <View className={`items-center justify-center p-3 rounded-2xl border ${isActive ? 'bg-[#dbb142]/10 border-[#dbb142]' : 'bg-[#141d17] border-white/5'} mr-3 w-[72px]`}>
    <Text className={`text-[10px] uppercase font-bold mb-1 ${isActive ? 'text-[#dbb142]' : 'text-white/40'}`}>{name}</Text>
    <Text className={`text-[13px] font-semibold ${isActive ? 'text-white' : 'text-white/70'}`}>{time}</Text>
  </View>
);

/**
 * Stat card for Salat progress or Qibla.
 */
const QuickActionCard = ({ title, value, subtext, icon, type, buttonText, onPress }: any) => (
  <View className="bg-[#141d17] border border-white/5 rounded-[28px] p-5 flex-1 mr-3 h-[160px]">
    <View className="flex-row items-center mb-3">
      {icon && <Ionicons name={icon} size={16} color="#dbb142" />}
      <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest ml-1.5">{title}</Text>
    </View>

    {type === 'progress' ? (
      <View className="items-center justify-center flex-1">
        <View className="w-16 h-16 rounded-full border-4 border-white/5 items-center justify-center">
          <View className="absolute w-16 h-16 rounded-full border-4 border-[#dbb142] border-t-transparent" />
          <Text className="text-white text-lg font-bold">{value}</Text>
        </View>
        <Text className="text-white/40 text-[10px] mt-2 font-bold uppercase tracking-widest">{subtext}</Text>
      </View>
    ) : (
      <View className="flex-1">
        <Text className="text-white text-lg font-semibold mb-1">{value}</Text>
        <Text className="text-white/40 text-[11px] mb-4">{subtext}</Text>
        <TouchableOpacity onPress={onPress} className="bg-[#141d17] border border-[#dbb142]/30 py-2 rounded-lg items-center">
          <Text className="text-[#dbb142] text-[10px] font-bold uppercase tracking-widest">{buttonText}</Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
);

/**
 * Adhkar item component.
 */
const AdhkarItem = ({ name, status, icon, isCompleted }: any) => (
  <TouchableOpacity className="bg-[#141d17] border border-white/5 p-5 rounded-2xl mb-3 flex-row items-center justify-between">
    <View className="flex-row items-center">
      <View className="bg-white/5 p-3 rounded-xl mr-4">
        <Feather name={icon} size={18} color="#dbb142" />
      </View>
      <View>
        <Text className="text-white font-semibold">{name}</Text>
        <Text className="text-white/40 text-[11px] mt-0.5">{status}</Text>
      </View>
    </View>
    <Ionicons
      name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
      size={22}
      color={isCompleted ? "#dbb142" : "rgba(255,255,255,0.1)"}
    />
  </TouchableOpacity>
);

// --- MAIN SCREEN ---

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthContext();
  const { data, isLoading: loading, refetch } = useDashboardData(user?.uid);


  const profile = data?.profile;
  const userData = data?.userData;
  const yesterdayData = data?.yesterdayData;

  const [refreshing, setRefreshing] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayPrayerName, setOverlayPrayerName] = useState("");
  const [overlayEndTime, setOverlayEndTime] = useState("");
  const [compassVisible, setCompassVisible] = useState(false);

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

  // Calculate prayer list
  const prayerList = useMemo(() => {
    if (!userData) return [];
    return [
      { name: "Fajr", time: userData.fajr?.time, end: userData.fajr?.end, isPrayed: userData.fajr?.isPrayed, skipped: userData.fajr?.skipped },
      { name: "Dhuhr", time: userData.dhuhr?.time, end: userData.dhuhr?.end, isPrayed: userData.dhuhr?.isPrayed, skipped: userData.dhuhr?.skipped },
      { name: "Asr", time: userData.asr?.time, end: userData.asr?.end, isPrayed: userData.asr?.isPrayed, skipped: userData.asr?.skipped },
      { name: "Maghrib", time: userData.maghrib?.time, end: userData.maghrib?.end, isPrayed: userData.maghrib?.isPrayed, skipped: userData.maghrib?.skipped },
      { name: "Isha", time: userData.isha?.time, end: userData.isha?.end, isPrayed: userData.isha?.isPrayed, skipped: userData.isha?.skipped },
    ];
  }, [userData]);

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
        dateTime: dayjs(`${yesterday} ${yesterdayData.isha.time}`),
        isYesterday: true,
      });
    }

    // Convert today's prayer times to dayjs objects
    prayerList.forEach(p => {
      times.push({
        ...p,
        dateTime: dayjs(`${today} ${p.time}`),
        isYesterday: false,
      });
    });

    // Find the one that is currently active (last one that passed)
    // We reverse the list and find the first one that is before or same as now
    const active = [...times].reverse().find(p => p.dateTime.isBefore(now) || p.dateTime.isSame(now));

    // Find the upcoming one
    let upcoming = times.find(p => p.dateTime.isAfter(now));

    // Handle wrap around (if all prayers for today passed, next is tomorrow's first prayer)
    const nextDayFirst = times[0].dateTime.add(1, 'day');
    const targetTime = upcoming ? upcoming.dateTime : nextDayFirst;

    // The user wants to see the active prayer until it ends, even if completed/skipped.
    if (active) {
      // For current prayer, countdown to its END time
      // If it's yesterday's Isha, its end time (e.g. Midnight or later) falls on 'today'.
      let endDayStr = today;

      // If it's today's Isha, its end time is tomorrow.
      if (active.name === "Isha" && !active.isYesterday) {
        endDayStr = now.add(1, 'day').format("YYYY-MM-DD");
      }

      // If the user's config says Isha ends at Fajr, we could use Fajr time.
      // But we will use the `active.end` value provided by the API.
      let endTime = dayjs(`${endDayStr} ${active.end}`);

      // Just in case end time parsed to something before the start time, bump it a day.
      const adjustedEnd = endTime.isBefore(active.dateTime) ? endTime.add(1, 'day') : endTime;

      // If the prayer time has completely ended, skip showing it as current
      if (!now.isAfter(adjustedEnd)) {
        return {
          title: "Current Prayer",
          name: active.name,
          time: active.time,
          countdownTarget: adjustedEnd.toISOString(),
          isYesterday: active.isYesterday,
          isPrayed: !!active.isPrayed,
          isSkipped: !!active.skipped,
        };
      }
    }

    // Find the upcoming one
    const displayUpcoming = upcoming || { ...times[0], dateTime: nextDayFirst };
    return {
      title: "Upcoming Prayer",
      name: displayUpcoming.name,
      time: displayUpcoming.time,
      countdownTarget: displayUpcoming.dateTime.toISOString(),
      isYesterday: false,
      isPrayed: false,
      isSkipped: false,
    };
  }, [prayerList]);

  const completedCount = prayerList.filter(p => p.isPrayed).length;

  // --- Prayer Lock ---
  const { markPrayerComplete, markPrayerSkipped, snoozeFor2Minutes } = usePrayerLock({
    uid: user?.uid ?? null,
    prayers: prayerList,
    onShowOverlay: (prayerName, prayerEnd) => {
      console.log(`[Dashboard] Triggering overlay for: ${prayerName} until ${prayerEnd}`);
      setOverlayPrayerName(prayerName);
      setOverlayEndTime(prayerEnd);
      setOverlayVisible(true);
    },
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
        <View className="mb-8">
          <Text className="text-white text-lg font-semibold mb-4" style={{ fontFamily: 'serif' }}>Today's Prayer Times</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {prayerList.map((p, i) => (
              <PrayerTimeItem
                key={i}
                name={p.name}
                time={p.time}
                isActive={currentInfo?.name === p.name}
              />
            ))}
          </ScrollView>
        </View>

        {/* Quick Stats Row */}
        <View className="flex-row mb-10">
          <QuickActionCard
            title="Daily Salat"
            value={`${completedCount}/5`}
            subtext="DAILY SALAT"
            type="progress"
          />
          <QuickActionCard
            title="Qibla"
            icon="compass-outline"
            value="Qibla"
            subtext="Facing Makkah"
            buttonText="LOCATE"
            onPress={() => setCompassVisible(true)}
          />
        </View>

        {/* Verse Card */}
        <View className="mb-10">
          <Text className="text-white text-lg font-semibold mb-4" style={{ fontFamily: 'serif' }}>Daily Verse</Text>
          <DailyVerseCard />
        </View>

        {/* Forbidden Times Section */}
        <View className="mb-10">
          <Text className="text-white text-lg font-semibold mb-4" style={{ fontFamily: 'serif' }}>Forbidden Times</Text>
          <ForbiddenTimesSection
            sunTimings={profile?.sunTimings}
            prayerTimes={userData}
          />
        </View>

        {/* Adhkar Section */}
        {/* <View className="mb-10">
          <View className="flex-row justify-between items-end mb-4">
            <Text className="text-white text-lg font-semibold" style={{ fontFamily: 'serif' }}>Daily Adhkar</Text>
            <TouchableOpacity>
              <Text className="text-[#dbb142] text-[11px] font-bold uppercase tracking-widest">View All</Text>
            </TouchableOpacity>
          </View>

          <AdhkarItem
            name="Morning Adhkar"
            status="Completed 06:15 AM"
            icon="sun"
            isCompleted={true}
          />
          <AdhkarItem
            name="Evening Adhkar"
            status="12 items remaining"
            icon="moon"
            isCompleted={false}
          />
        </View> */}

      </ScrollView>

      {/* Floating Action Button for Streaks */}
      <TouchableOpacity
        style={{ position: 'absolute', right: 24, bottom: 24 }}
        className="bg-[#dbb142] w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => navigation.navigate("Streaks")}
      >
        <Ionicons name="bar-chart" size={24} color="#101a15" />
      </TouchableOpacity>

      {/* Qibla Compass Modal */}
      {/* <QiblaCompassModal
        visible={compassVisible}
        onClose={() => setCompassVisible(false)}
        latitude={profile?.location?.latitude}
        longitude={profile?.location?.longitude}
      /> */}
    </View>
  );
}