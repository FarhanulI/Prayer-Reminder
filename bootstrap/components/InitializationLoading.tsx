import colors from "@/constants/colors.json";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

type InitializationLoadingProps = {
  message?: string;
};

export const InitializationLoading = ({
  message = "Preparing prayer schedule...",
}: InitializationLoadingProps) => {
  return (
    <View className="flex-1 bg-emerald-darkest items-center justify-center">
      <ActivityIndicator size="large" color={colors.gold} />

      <Text className="text-white/60 mt-4">{message}</Text>
    </View>
  );
};
