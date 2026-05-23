import { Card } from "@/components/ui/card";
import colors from "@/constants/colors.json";
import { PrayerCollection } from "@/types";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import * as Location from "expo-location";
import { DocumentData } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface UpcomingPrayerCardProps {
  title: string;
  name: string;
  time: string;
  countdownTarget: string;
  isPrayed?: boolean;
  isSkipped?: boolean;
  prayerList?: Array<{ name: string; time: string }>;
  profile?: DocumentData | null;
  prayerTimings?: PrayerCollection
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
  prayerTimings
}) => {
  const navigation = useNavigation<any>();
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

      if (isPrayed && title.toLowerCase().includes("current")) {
        setTimeLeft(now.format("h:mm A"));
        return;
      }

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
  }, [countdownTarget, isPrayed, title]);

  return (
    <Card variant="large" className="mb-8 shadow-2xl relative overflow-hidden">
      {/* Background Decorative Circle */}
      <View className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/[0.02]" />

      {/* Top Badge */}
      <View className="flex-row items-center mb-4">
        <Card variant="default" className="bg-gold/10 px-3 py-1.5 rounded-full border border-gold/20">
          <Text className="text-gold text-[10px] font-bold uppercase tracking-widest">
            {title}
          </Text>
        </Card>

        {/* Status Badges */}
        <View className="flex-row items-center ml-2">
          {isPrayed && (
            <Card variant="default" className="bg-green-500/20 px-2 py-1 rounded-full flex-row items-center">
              <Ionicons name="checkmark-circle" size={10} color={colors.success} />
              <Text className="text-success text-[9px] font-bold ml-1">DONE</Text>
            </Card>
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
      <View className="flex-row items-center mb-4">
        <Ionicons name="location" size={14} color="rgba(255,255,255,0.4)" />
        <Text className="text-white/40 ml-1.5 text-sm">{locationName}</Text>
      </View>
      <Text className="text-white text-4xl font-semibold mb-2" style={{ fontFamily: "serif" }}>
        {name}
      </Text>


      {/* Big Time / Countdown */}
      {isPrayed ? (() => {
        const currentIndex = prayerList?.findIndex(p => p.name === name) ?? -1;
        const nextPrayer = currentIndex !== -1 && prayerList ? prayerList[(currentIndex + 1) % prayerList.length] : null;

        return (
          <View className="flex-row items-center mt-2">
            <Card className="bg-gold px-3 py-1 rounded-full border borderf-white/5 flex-row items-center">
              <Text className="text-emerald-dark text-[12px]  font-medium">Next Prayer : </Text>
              <Text className="text-emerald-dark text-[12px]  font-bold">{nextPrayer?.name} at {nextPrayer?.time}</Text>
            </Card>
          </View>
        );
      })() : (
        <Text className="text-white/50 text-sm mt-6">
          {name} {title.toLowerCase().includes("current") ? "began" : "begins"} at {time}
        </Text>
      )}
      <Text className="text-white text-[56px] font-medium leading-tight tracking-tight mb-1" style={{ fontFamily: "serif" }}>
        {timeLeft}
      </Text>


      {/* Sunrise & Sunset Row */}
      <View className="flex-row items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 ">
        <View className="flex-row items-center flex-1 justify-center">
          <Feather name="sunrise" size={16} color={colors.gold} />
          <View className="ml-3">
            <Text className="text-white/30 text-[9px] uppercase font-bold tracking-wider">Sunrise</Text>
            <Text className="text-white/80 text-sm font-semibold mt-0.5">
              {profile?.sunTimings?.sunrise ? dayjs(`2000-01-01 ${profile.sunTimings.sunrise.split(' ')[0]}`).format("h:mm A") : "--:--"}
            </Text>
          </View>
        </View>

        <View className="w-[1px] h-6 bg-white/10" />

        <View className="flex-row items-center flex-1 justify-center">
          <Feather name="sunset" size={16} color={colors.gold} />
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
      <View className="flex-row flex-wrap justify-between items-center">
        {prayerList?.map((p, index) => {
          const isActive = name === p.name;
          return (
            <View
              key={index}
              className={`w-[48%] p-4 rounded-2xl mb-3 items-center justify-center ${isActive ? "bg-gold shadow-lg" : "bg-transparent"
                }`}
            >
              <Text
                className={`text-[11px] uppercase font-bold mb-1 tracking-wider ${isActive ? "text-emerald-dark" : "text-white/40"
                  }`}
              >
                {p.name}
              </Text>
              <Text
                className={`text-lg font-bold ${isActive ? "text-emerald-dark" : "text-white/80"
                  }`}
              >
                {p.time}
              </Text>
            </View>
          );
        })}

        <TouchableOpacity
          onPress={() => navigation.navigate("Forbidden-times", { sunTimings: profile?.sunTimings, prayerTimes: prayerTimings })}
        >
          <View className="flex-row items-center border border-red-accent bg-gold/10 px-3 py-2 rounded-xl"
          >
            <Ionicons name="information-circle-outline" size={14} color={colors["red-accent"]} />
            <Text className="text-red-accent text-[10px] font-bold ml-1.5 tracking-widest uppercase">Forbidden Times</Text>
          </View>

        </TouchableOpacity>
      </View>
    </Card>
  );
};

export default UpcomingPrayerCard;