import { useAuthContext } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import { PrayerCollection } from "@/types";
import { Feather, FontAwesome5, Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, Text, TouchableOpacity, View } from "react-native";

dayjs.extend(isBetween);

const { width } = Dimensions.get("window");

// --- SMALL COMPONENTS ---

/**
 * Card for the upcoming prayer with a countdown and progress bar.
 */
const UpcomingPrayerCard = ({ name, time, nextTime }: { name: string; time: string; nextTime?: string }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculate = () => {
      const now = dayjs();
      const prayerTime = dayjs(`${now.format("YYYY-MM-DD")} ${time}`);

      // If prayer has passed, it might be for tomorrow (not handled here for simplicity)
      const diffMin = prayerTime.diff(now, "minute");

      if (diffMin > 0) {
        setTimeLeft(`IN ${diffMin} MIN`);
        // Mock progress for visual appeal
        setProgress(Math.max(0, 100 - (diffMin / 60) * 100));
      } else {
        setTimeLeft("NOW");
        setProgress(100);
      }
    };

    calculate();
    const interval = setInterval(calculate, 60000);
    return () => clearInterval(interval);
  }, [time]);

  return (
    <View className="bg-[#141d17] border border-[#dbb142]/20 rounded-[32px] p-6 mb-8 shadow-2xl">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Upcoming Prayer</Text>
        <View className="bg-[#dbb142]/10 px-3 py-1 rounded-full border border-[#dbb142]/20">
          <Text className="text-[#dbb142] text-[10px] font-bold">{timeLeft}</Text>
        </View>
      </View>

      <Text className="text-white text-4xl font-semibold mb-2" style={{ fontFamily: 'serif' }}>{name}</Text>

      <View className="flex-row items-center mb-6">
        <Ionicons name="time-outline" size={16} color="#dbb142" />
        <Text className="text-[#dbb142] ml-2 font-medium">{time}</Text>
      </View>

      {/* Progress Bar */}
      <View className="h-[2px] bg-white/5 rounded-full overflow-hidden">
        <View
          className="h-full bg-[#dbb142]"
          style={{ width: `${progress}%` }}
        />
      </View>
    </View>
  );
};

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
 * Daily Verse card.
 */
const DailyVerseCard = () => (
  <View className="bg-[#1a231d] border border-white/5 rounded-[32px] p-6 mb-8 relative overflow-hidden">
    <FontAwesome5 name="quote-right" size={40} color="rgba(255,255,255,0.03)" className="absolute right-6 top-6" />
    <Text className="text-white/80 text-[15px] leading-7 italic mb-6">
      "And seek help through patience and prayer, and indeed, it is difficult except for the humbly submissive [to Allah]."
    </Text>
    <View className="flex-row justify-between items-center">
      <Text className="text-[#dbb142] text-[11px] font-bold uppercase tracking-widest">Surah Al-Baqarah 2:45</Text>
      <View className="flex-row">
        <TouchableOpacity className="mr-4">
          <Feather name="share-2" size={16} color="white" className="opacity-40" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Feather name="bookmark" size={16} color="#dbb142" />
        </TouchableOpacity>
      </View>
    </View>
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
  const { user } = useAuthContext();
  const [userData, setUserData] = useState<PrayerCollection | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    const now = dayjs();
    const next = prayerList.find(p => dayjs(`${now.format("YYYY-MM-DD")} ${p.time}`).isAfter(now));
    const last = [...prayerList].reverse().find(p => dayjs(`${now.format("YYYY-MM-DD")} ${p.time}`).isBefore(now));

    return {
      upcoming: next || prayerList[0], // Fallback to first prayer if all passed
      active: last || prayerList[0]
    };
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
      >
        {/* Header Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-white/40 text-[11px] font-bold uppercase tracking-widest">Assalamu Alaikum</Text>
            <Text className="text-white text-xl font-bold">{profile?.name || "User"}</Text>
          </View>
          <TouchableOpacity className="bg-white/5 p-2 rounded-full">
            <Ionicons name="notifications-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Upcoming Card */}
        <UpcomingPrayerCard
          name={currentInfo.upcoming?.name || "Fajr"}
          time={currentInfo.upcoming?.time || "--:--"}
        />

        {/* Today's Times Row */}
        <View className="mb-8">
          <Text className="text-white text-lg font-semibold mb-4" style={{ fontFamily: 'serif' }}>Today's Prayer Times</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {prayerList.map((p, i) => (
              <PrayerTimeItem
                key={i}
                name={p.name}
                time={p.time}
                isActive={currentInfo.upcoming?.name === p.name}
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