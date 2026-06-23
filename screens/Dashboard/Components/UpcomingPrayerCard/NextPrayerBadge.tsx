import React from "react";
import { View, Text } from "react-native";
import { Card } from "@/components/ui/card";

interface NextPrayerBadgeProps {
  nextPrayer: { name: string; time: string } | null;
}

export const NextPrayerBadge: React.FC<NextPrayerBadgeProps> = React.memo(({ nextPrayer }) => {
  if (!nextPrayer) return null;

  return (
    <View className="flex-row items-center my-4">
      <Card className="bg-gold px-3 py-1 rounded-full border border-white/5 flex-row items-center">
        <Text className="text-emerald-dark text-[12px] font-medium">Next Prayer : </Text>
        <Text className="text-emerald-dark text-[12px] font-bold">
          {nextPrayer.name} at {nextPrayer.time}
        </Text>
      </Card>
    </View>
  );
});

NextPrayerBadge.displayName = "NextPrayerBadge";
