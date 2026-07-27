import colors from "@/constants/colors.json";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type InitializationErrorProps = {
  error: Error | null;
  onRetry: () => void;
  title?: string;
};

export const InitializationError = ({
  error,
  onRetry,
  title = "Initialization Failed",
}: InitializationErrorProps) => {
  return (
    <View className="flex-1 bg-emerald-darkest items-center justify-center px-6">
      <Text className="text-gold text-xl font-semibold mb-2">{title}</Text>

      <Text className="text-white/60 text-center mb-6">
        {error?.message ?? "Unknown error"}
      </Text>

      <TouchableOpacity
        onPress={onRetry}
        style={{
          backgroundColor: colors.gold,
        }}
        className="px-6 py-3 rounded-full"
      >
        <Text className="text-black font-semibold">Retry</Text>
      </TouchableOpacity>
    </View>
  );
};
