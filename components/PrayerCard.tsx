import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

type Props = {
  name: string;
  time: string;
  isNext: boolean;
  done?: boolean;
  onPress?: () => void;
};

export default function PrayerCard({
  name,
  time,
  isNext,
  done,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`p-4 rounded-2xl mb-4 flex-row justify-between items-center ${isNext ? "bg-black" : "bg-white"
        }`}
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      <View>
        <Text
          className={`text-lg font-semibold ${isNext ? "text-white" : "text-black"
            }`}
        >
          {name}
        </Text>
        <Text
          className={`text-sm ${isNext ? "text-gray-300" : "text-gray-500"
            }`}
        >
          {time}
        </Text>
      </View>

      {/* Status */}
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${done ? "bg-green-500" : isNext ? "bg-white/20" : "bg-gray-200"
          }`}
      >
        {done && <Text className="text-white font-bold">✓</Text>}
      </View>
    </TouchableOpacity>
  );
}