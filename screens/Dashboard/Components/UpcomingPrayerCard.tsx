import { Feather, Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import * as Location from "expo-location";
import { DocumentData } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";

interface UpcomingPrayerCardProps {
  title: string;
  name: string;
  time: string;
  countdownTarget: string;
  isPrayed?: boolean;
  isSkipped?: boolean;
  prayerList?: Array<{ name: string; time: string }>;
  profile?: DocumentData | null;
}

const UpcomingPrayerCard: React.FC<UpcomingPrayerCardProps> = ({
  title,
  name,
  time,
  countdownTarget,
  isPrayed,
  isSkipped,
  prayerList,
  profile,
}) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [locationName, setLocationName] = useState<string>("Locating...");

  useEffect(() => {
    const fetchLocationName = async () => {
      if (profile?.location) {
        try {
          const { latitude, longitude } = profile.location;
          const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (result) {
            const loc = [result.city || result.subregion || result.region, result.country]
              .filter(Boolean)
              .join(", ");
            setLocationName(loc || "Unknown Location");
          }
        } catch (error) {
          setLocationName("Unknown Location");
        }
      }
    };
    fetchLocationName();
  }, [profile?.location]);

  useEffect(() => {
    const calculate = () => {
      const now = dayjs();
      const target = dayjs(countdownTarget);
      const diffSec = target.diff(now, "second");

      if (diffSec > 0) {
        const h = String(Math.floor(diffSec / 3600)).padStart(2, "0");
        const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
        const s = String(diffSec % 60).padStart(2, "0");

        // If hours is 00, just show mm:ss like the image (which showed 18:42)
        if (h === "00") {
          setTimeLeft(`${m}:${s}`);
        } else {
          setTimeLeft(`${h}:${m}:${s}`);
        }
      } else {
        setTimeLeft("00:00");
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [countdownTarget]);

  return (
    <View className="bg-[#141d17] border border-white/5 rounded-[32px] p-6 mb-8 shadow-2xl relative overflow-hidden">
      {/* Background Decorative Circle */}
      <View className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/[0.02]" />

      {/* Top Badge */}
      <View className="flex-row items-center mb-4">
        <View className="bg-[#dbb142]/10 px-3 py-1.5 rounded-full border border-[#dbb142]/20">
          <Text className="text-[#dbb142] text-[10px] font-bold uppercase tracking-widest">
            {title}
          </Text>
        </View>

        {/* Status Badges */}
        <View className="flex-row items-center ml-2">
          {isPrayed && (
            <View className="bg-green-500/20 px-2 py-1 rounded-full flex-row items-center">
              <Ionicons name="checkmark-circle" size={10} color="#4ade80" />
              <Text className="text-[#4ade80] text-[9px] font-bold ml-1">DONE</Text>
            </View>
          )}
          {isSkipped && (
            <View className="bg-white/10 px-2 py-1 rounded-full flex-row items-center">
              <Ionicons name="close-circle" size={10} color="rgba(255,255,255,0.4)" />
              <Text className="text-white/40 text-[9px] font-bold ml-1">SKIPPED</Text>
            </View>
          )}
        </View>
      </View>

      {/* Prayer Name & Location */}
      <Text className="text-white text-4xl font-semibold mb-2" style={{ fontFamily: "serif" }}>
        {name}
      </Text>
      <View className="flex-row items-center mb-4">
        <Ionicons name="location" size={14} color="rgba(255,255,255,0.4)" />
        <Text className="text-white/40 ml-1.5 text-sm">{locationName}</Text>
      </View>

      {/* Big Time / Countdown */}
      <Text className="text-white text-[56px] font-medium leading-tight tracking-tight mb-1" style={{ fontFamily: "serif" }}>
        {timeLeft}
      </Text>
      <Text className="text-white/50 text-sm mb-6">
        {name} {title.toLowerCase().includes("current") ? "began" : "begins"} at {time}
      </Text>

      {/* Sunrise & Sunset Row */}
      <View className="flex-row items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 ">
        <View className="flex-row items-center flex-1 justify-center">
          <Feather name="sunrise" size={16} color="#dbb142" />
          <View className="ml-3">
            <Text className="text-white/30 text-[9px] uppercase font-bold tracking-wider">Sunrise</Text>
            <Text className="text-white/80 text-sm font-semibold mt-0.5">
              {profile?.sunTimings?.sunrise ? dayjs(`2000-01-01 ${profile.sunTimings.sunrise.split(' ')[0]}`).format("h:mm A") : "--:--"}
            </Text>
          </View>
        </View>

        <View className="w-[1px] h-6 bg-white/10" />

        <View className="flex-row items-center flex-1 justify-center">
          <Feather name="sunset" size={16} color="#dbb142" />
          <View className="ml-3">
            <Text className="text-white/30 text-[9px] uppercase font-bold tracking-wider">Sunset</Text>
            <Text className="text-white/80 text-sm font-semibold mt-0.5">
              {profile?.sunTimings?.sunset ? dayjs(`2000-01-01 ${profile.sunTimings.sunset.split(' ')[0]}`).format("h:mm A") : "--:--"}
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View className="h-[1px] bg-white/10 w-full my-8" />

      {/* Prayer Times Grid */}
      <View className="flex-row flex-wrap justify-between">
        {prayerList?.map((p, index) => {
          const isActive = name === p.name;
          return (
            <View
              key={index}
              className={`w-[48%] p-4 rounded-2xl mb-3 items-center justify-center ${isActive ? "bg-[#dbb142] shadow-lg" : "bg-transparent"
                }`}
            >
              <Text
                className={`text-[11px] uppercase font-bold mb-1 tracking-wider ${isActive ? "text-[#141d17]" : "text-white/40"
                  }`}
              >
                {p.name}
              </Text>
              <Text
                className={`text-lg font-bold ${isActive ? "text-[#141d17]" : "text-white/80"
                  }`}
              >
                {p.time}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default UpcomingPrayerCard;