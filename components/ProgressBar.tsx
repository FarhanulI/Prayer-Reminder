import React from "react";
import { View, Text } from "react-native";

export default function ProgressBar({ completed }: { completed: number }) {
  const percent = (completed / 5) * 100;

  return (
    <View className="mb-6">
      <Text className="mb-2 text-gray-600">
        Daily Progress: {completed}/5
      </Text>

      <View className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <View
          style={{ width: `${percent}%` }}
          className="h-full bg-black"
        />
      </View>
    </View>
  );
}