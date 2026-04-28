import { useAuthContext } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import { PrayerCollection } from "@/types";
import { Feather, Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import DailyVerseCard from "./Components/DailyVerseCard";
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
const QuickActionCard = ({ title, value, subtext, icon, type, buttonText }: any) => (
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
        <TouchableOpacity className="bg-[#141d17] border border-[#dbb142]/30 py-2 rounded-lg items-center">
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
  const { user, logout } = useAuthContext();
  const [userData, setUserData] = useState<PrayerCollection | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.uid) return;

    // One-time fetch for refresh, though we have onSnapshot
    const today = dayjs().format("YYYY-MM-DD");
    const profileSnap = await getDoc(doc(db, "users", user.uid));
    const prayerSnap = await getDoc(doc(db, "users", user.uid, "prayerTimes", today));

    if (profileSnap.exists()) setProfile(profileSnap.data());
    if (prayerSnap.exists()) setUserData(prayerSnap.data() as PrayerCollection);
  }, [user?.uid]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to User Profile for goal data
    const unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data());
    });

    // Listen to Prayer Times for today
    const today = dayjs().format("YYYY-MM-DD");
    const unsubPrayers = onSnapshot(doc(db, "users", user.uid, "prayerTimes", today), (snap) => {
      if (snap.exists()) {
        setUserData(snap.data() as PrayerCollection);
      }
      setLoading(false);
    });

    return () => {
      unsubProfile();
      unsubPrayers();
    };
  }, [user?.uid]);

  // Calculate prayer list
  const prayerList = useMemo(() => {
    if (!userData) return [];
    return [
      { name: "Fajr", time: userData.fajr?.time, completed: userData.fajr?.done },
      { name: "Dhuhr", time: userData.dhuhr?.time, completed: userData.dhuhr?.done },
      { name: "Asr", time: userData.asr?.time, completed: userData.asr?.done },
      { name: "Maghrib", time: userData.maghrib?.time, completed: userData.maghrib?.done },
      { name: "Isha", time: userData.isha?.time, completed: userData.isha?.done },
    ];
  }, [userData]);

  // Find next prayer
  const currentInfo = useMemo(() => {
    if (prayerList.length === 0) return null;

    const now = dayjs();
    const today = now.format("YYYY-MM-DD");

    // Convert prayer times to dayjs objects
    const times = prayerList.map(p => ({
      ...p,
      dateTime: dayjs(`${today} ${p.time}`)
    }));

    // Find the one that is currently active (last one that passed)
    // We reverse the list and find the first one that is before or same as now
    const active = [...times].reverse().find(p => p.dateTime.isBefore(now) || p.dateTime.isSame(now));

    // Find the upcoming one
    let upcoming = times.find(p => p.dateTime.isAfter(now));

    // Handle wrap around (if all prayers for today passed, next is tomorrow's first prayer)
    const nextDayFirst = times[0].dateTime.add(1, 'day');
    const targetTime = upcoming ? upcoming.dateTime : nextDayFirst;

    // Logic: If active exists and it's within 20 minutes, show it as current
    const BUFFER_MINS = 20;
    const isWithinBuffer = active && now.diff(active.dateTime, 'minute') < BUFFER_MINS;

    if (isWithinBuffer && active) {
      return {
        title: "Current Prayer",
        name: active.name,
        time: active.time,
        countdownTarget: targetTime.toISOString(),
      };
    } else {
      const displayUpcoming = upcoming || times[0];
      return {
        title: "Upcoming Prayer",
        name: displayUpcoming.name,
        time: displayUpcoming.time,
        countdownTarget: targetTime.toISOString(),
      };
    }
  }, [prayerList]);

  const completedCount = prayerList.filter(p => p.completed).length;

  if (loading) {
    return (
      <View className="flex-1 bg-[#0d1410] items-center justify-center">
        <ActivityIndicator color="#dbb142" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0d1410]">
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 60, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#dbb142" />
        }
      >
        {/* Header Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-white/40 text-[11px] font-bold uppercase tracking-widest">Assalamu Alaikum</Text>
            <Text className="text-white text-xl font-bold">{profile?.name || "User"}</Text>
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity className="bg-white/5 p-2 rounded-full mr-3">
              <Ionicons name="notifications-outline" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} className="bg-white/5 p-2 rounded-full">
              <Ionicons name="log-out-outline" size={20} color="#ff4d4d" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Card */}
        {currentInfo && (
          <UpcomingPrayerCard
            title={currentInfo.title}
            name={currentInfo.name}
            time={currentInfo.time}
            countdownTarget={currentInfo.countdownTarget}
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
          />
        </View>

        {/* Verse Card */}
        <View className="mb-10">
          <Text className="text-white text-lg font-semibold mb-4" style={{ fontFamily: 'serif' }}>Daily Verse</Text>
          <DailyVerseCard />
        </View>

        {/* Adhkar Section */}
        <View className="mb-10">
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
        </View>

      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={{ position: 'absolute', right: 24, bottom: 24 }}
        className="bg-[#dbb142] w-14 h-14 rounded-full items-center justify-center shadow-lg"
      >
        <Ionicons name="add" size={30} color="#101a15" />
      </TouchableOpacity>
    </View>
  );
}