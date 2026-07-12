import colors from "@/constants/colors.json";
import { Ionicons } from "@expo/vector-icons";
import { Magnetometer } from "expo-sensors";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { useQibla } from "@/hooks/useQibla";

const getHeading = (data: any) => {
  let { x, y } = data;
  let angle = Math.atan2(y, x) * (180 / Math.PI);

  if (angle < 0) angle += 360;

  return angle;
};

export default function Qibla() {
  const { data: qiblaData } = useQibla();
  const qiblaDirection = qiblaData?.data?.qibla_direction || 0;

  const [heading, setHeading] = useState(0);

  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Magnetometer.setUpdateInterval(200);

    const subscription = Magnetometer.addListener((data) => {
      const newHeading = getHeading(data);
      setHeading(newHeading);

      Animated.timing(rotateAnim, {
        toValue: newHeading,
        duration: 100,
        useNativeDriver: true,
      }).start();
    });

    return () => subscription.remove();
  }, []);

  const relativeRotation = qiblaDirection - heading;

  return (
    <TouchableOpacity>
      <View className="">
        <Animated.View
          style={{
            transform: [{ rotate: `${relativeRotation}deg` }],
          }}
          className="w-[44px] h-[54px] rounded-2xl  items-center justify-center mr-3 "
        >
          <Ionicons name="navigate" size={24} color={colors.gold} />
        </Animated.View>

        <Text className="text-white font-bold text-[12px] tracking-widest leading-tight mb-1.5">
          QIBLA
        </Text>
        {/* <View className="flex-1">
          <Text className="text-white font-bold text-[12px] tracking-widest leading-tight mb-1.5">
            QIBLA
          </Text>

          <Text className="text-white/60 text-[10px] mb-0.5">Direction:</Text>

          <Text className="text-white text-[11px] font-semibold">
            {qiblaDirection.toFixed(1)}°
          </Text>
        </View> */}
      </View>
    </TouchableOpacity>
  );
}
