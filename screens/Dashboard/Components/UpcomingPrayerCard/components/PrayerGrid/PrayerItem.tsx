import React from "react";
import { View, Text } from "react-native";

interface PrayerItemProps {
  name: string;
  time: string;
  isActive: boolean;
}

export const PrayerItem: React.FC<PrayerItemProps> = React.memo(({ name, time, isActive }) => {
  return (
    <View
      className={`w-[48%] p-4 rounded-2xl mb-3 items-center justify-center ${
        isActive ? "bg-gold shadow-lg" : "bg-transparent"
      }`}
    >
      <Text
        className={`text-[11px] uppercase font-bold mb-1 tracking-wider ${
          isActive ? "text-emerald-dark" : "text-white/40"
        }`}
      >
        {name}
      </Text>
      <Text
        className={`text-lg font-bold ${
          isActive ? "text-emerald-dark" : "text-white/80"
        }`}
      >
        {time}
      </Text>
    </View>
  );
});

PrayerItem.displayName = "PrayerItem";
