import colors from "@/constants/colors.json";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ImageBackground, Text, TouchableOpacity, View } from "react-native";
import { PrayerItem } from "./PrayerItem";

interface PrayerGridProps {
  prayerList?: { name: string; time: string }[];
  activeName: string;
  onForbiddenTimesPress: () => void;
}

export const PrayerGrid: React.FC<PrayerGridProps> = React.memo(
  ({ prayerList, activeName, onForbiddenTimesPress }) => {
    return (
      <ImageBackground
        source={require("@/assets/images/bgOverlay2.png")}
        className="flex-row flex-wrap justify-between items-center"
      >
        {prayerList?.map((p) => (
          <PrayerItem
            key={p.name}
            name={p.name}
            time={p.time}
            isActive={activeName === p.name}
          />
        ))}

        <TouchableOpacity onPress={onForbiddenTimesPress}>
          <View className="flex-row items-center border bg-red-accent/70  px-3 py-2 rounded-md ">
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={colors.white}
            />
            <Text className="text-white text-[7px] font-bold ml-1.5 tracking-widest uppercase">
              Forbidden Times
            </Text>
          </View>
        </TouchableOpacity>
      </ImageBackground>
    );
  },
);

PrayerGrid.displayName = "PrayerGrid";
