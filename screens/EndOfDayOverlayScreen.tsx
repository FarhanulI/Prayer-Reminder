import colors from "@/constants/colors.json";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  ImageBackground,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type EndOfDayOverlayScreenProps = {
  visible: boolean;
  missedPrayers: any[];
  currentPrayer?: any;
  onClose: () => void;
  onLogPrayer: (name: string, date?: string) => void;
};

export default function EndOfDayOverlayScreen({
  visible,
  missedPrayers,
  onClose,
  onLogPrayer,
}: EndOfDayOverlayScreenProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(slideUp, {
          toValue: 0,
          speed: 12,
          bounciness: 6,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        slideUp.setValue(50);
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      statusBarTranslucent
    >
      <Animated.View
        className="flex-1 bg-emerald-darkest"
        style={{
          opacity,
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 50,
        }}
      >
        <StatusBar barStyle="light-content" backgroundColor={colors['emerald-darkest']} />

        {/* Top bar with close button */}
        <View className="flex-row justify-end px-5 pt-2.5">
          <TouchableOpacity onPress={onClose} className="p-2.5">
            <Ionicons name="close" size={28} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ transform: [{ translateY: slideUp }] }}>
            {/* Header */}
            <View className="items-center mb-8 mt-2.5">
              <Text
                className="text-gold text-3xl font-bold mb-2"
                style={{ fontFamily: Platform.OS === "ios" ? "Georgia" : "serif" }}
              >
                Renew Your Intent
              </Text>
              <Text className="text-white/60 text-sm">
                Pray your Qada for missed Salat.
              </Text>
            </View>

            {/* Quote Card */}
            <ImageBackground
              source={require("@/assets/images/bgOverlay.png")}
              className="bg-emerald-dark border border-white/5 rounded-2xl mb-8 overflow-hidden"
              imageStyle={{ opacity: 0.30 }}
            >
              <View className="p-6 items-center">
                <MaterialCommunityIcons name="format-quote-open" size={32} color={`${colors.gold}99`} style={{ marginBottom: 12 }} />
                <Text
                  className="text-white text-[22px] italic text-center leading-8 mb-4"
                  style={{ fontFamily: Platform.OS === "ios" ? "Georgia" : "serif" }}
                >
                  “There is no negligence while one is asleep, but forgetfulness occurs when one is awake. If one of you forgets the prayer or sleeps through its time, then he should perform the salah when he recalls it."
                </Text>
                <Text className="text-gold text-xs font-bold uppercase tracking-widest">
                  — Sahih al-Bukhari
                </Text>
              </View>
            </ImageBackground>

            {/* Remaining Today */}
            {missedPrayers.length > 0 && (
              <View className="mb-8">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-white text-lg font-semibold">Missing Today</Text>
                  <View className="bg-gold/10 px-3 py-1 rounded-xl">
                    <Text className="text-gold text-xs font-bold">
                      {missedPrayers.length} Pending
                    </Text>
                  </View>
                </View>

                {missedPrayers.map((prayer, index) => (
                  <View
                    key={index}
                    className="bg-emerald-dark border border-white/5 rounded-2xl p-4 flex-row items-center mb-3"
                  >
                    {/* Icon */}
                    <View className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 items-center justify-center mr-4">
                      <Ionicons
                        name={prayer.name === 'Fajr' ? "partly-sunny-outline" : prayer.name === 'Maghrib' || prayer.name === 'Isha' ? "moon-outline" : "sunny-outline"}
                        size={24}
                        color={colors.gold}
                      />
                    </View>

                    {/* Prayer Info */}
                    <View className="flex-1">
                      <Text
                        className="text-white text-base font-semibold mb-1"
                        style={{ fontFamily: Platform.OS === "ios" ? "Georgia" : "serif" }}
                      >
                        {prayer.name}
                      </Text>
                    </View>

                    {/* Log Now Button */}
                    <TouchableOpacity onPress={() => onLogPrayer(prayer.name, prayer.date)}>
                      <Text className="text-gold text-[13px] font-bold uppercase tracking-widest">
                        LOG NOW
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

          </Animated.View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
