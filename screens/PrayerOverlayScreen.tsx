import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.5;

const HADITHS = [
  {
    text: "Whoever guards the prayer, Allah honors him.",
    source: "Ahmad",
  },
  {
    text: "The first matter that the servant will be brought to account for on the Day of Judgment is the prayer.",
    source: "Abu Dawud",
  },
  {
    text: "Prayer is the pillar of religion.",
    source: "Al-Bayhaqi",
  },
];

type Props = {
  visible: boolean;
  prayerName: string;
  prayerTime: string;
  endTime: string;
  onPray: (name: string) => void;
  onSnooze: () => void;
  onSkip: () => void;
};

export default function PrayerOverlayScreen({
  visible,
  prayerName,
  prayerTime,
  endTime,
  onPray,
  onSnooze,
  onSkip,
}: Props) {
  const [hadith] = useState(HADITHS[Math.floor(Math.random() * HADITHS.length)]);
  const translateX = useRef(new Animated.Value(0)).current;
  const [remainingTime, setRemainingTime] = useState("");
  const opacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Use refs to avoid stale closures in PanResponder
  const prayerNameRef = useRef(prayerName);
  const onPrayRef = useRef(onPray);

  useEffect(() => {
    prayerNameRef.current = prayerName;
    onPrayRef.current = onPray;
  }, [prayerName, onPray]);

  // Derive swipe progress for UI elements without using React state
  const swipeProgress = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const progressColor = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD * 0.8, SWIPE_THRESHOLD],
    outputRange: ["#dbb142", "#dbb142", "#4ade80"],
    extrapolate: "clamp",
  });

  // Scale the fill from 0 to 1 instead of changing width
  const progressScaleX = translateX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [0.0001, 1], // Avoid 0 to prevent some scaling glitches
    extrapolate: "clamp",
  });

  useEffect(() => {
    if (!visible || !endTime) return;

    const calculateRemaining = () => {
      const now = dayjs();
      const today = now.format("YYYY-MM-DD");
      let end = dayjs(`${today} ${endTime}`);

      // Handle overnight Isha
      if (end.isBefore(now)) {
        end = end.add(1, "day");
      }

      const diff = end.diff(now);
      if (diff <= 0) {
        setRemainingTime("Ended");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const hDisplay = hours > 0 ? `${hours}h ` : "";
      const mDisplay = `${minutes}m `;
      const sDisplay = `${seconds}s`;
      setRemainingTime(`${hDisplay}${mDisplay}${sDisplay}`);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [visible, endTime]);

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentName = prayerNameRef.current;
        console.log(`[PrayerOverlay] Released at dx: ${gestureState.dx.toFixed(1)} (Threshold: ${SWIPE_THRESHOLD.toFixed(1)})`);
        if (gestureState.dx >= SWIPE_THRESHOLD) {
          Vibration.vibrate(60);
          console.log(`[PrayerOverlay] Swipe success for "${currentName}", calling onPray`);
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            onPrayRef.current(currentName);
            // Reset for next time
            translateX.setValue(0);
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            bounciness: 8,
            speed: 12,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "#080d0a",
          opacity,
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 60,
        }}
      >
        <StatusBar barStyle="light-content" backgroundColor="#080d0a" />

        <View style={{ flex: 1, justifyContent: "space-between", paddingHorizontal: 28, paddingBottom: 60 }}>

          {/* Top Section */}
          <View style={{ alignItems: "center" }}>
            {/* Mosque Icon */}
            <View style={{
              backgroundColor: "rgba(219,177,66,0.1)",
              borderWidth: 1,
              borderColor: "rgba(219,177,66,0.2)",
              borderRadius: 999,
              padding: 24,
              marginBottom: 20,
            }}>
              <Ionicons name="moon" size={48} color="#dbb142" />
            </View>

            {/* Prayer Name */}
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "700", letterSpacing: 4, textTransform: "uppercase", marginBottom: 6 }}>
              Prayer Time
            </Text>
            <Text style={{ color: "#fff", fontSize: 48, fontWeight: "600", fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", marginBottom: 4 }}>
              {prayerName}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="time-outline" size={14} color="#dbb142" />
              <Text style={{ color: "#dbb142", marginLeft: 6, fontWeight: "600" }}>{prayerTime}</Text>
            </View>
            <View style={{
              backgroundColor: "rgba(219,177,66,0.1)",
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 8,
              marginBottom: 32
            }}>
              <Text style={{ color: "#dbb142", fontSize: 12, fontWeight: "700" }}>
                Ends in: {remainingTime}
              </Text>
            </View>

            {/* Hadith */}
            <View style={{
              backgroundColor: "#141d17",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.06)",
              borderRadius: 24,
              padding: 24,
            }}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="rgba(255,255,255,0.15)" style={{ marginBottom: 12 }} />
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 16, lineHeight: 26, fontStyle: "italic", marginBottom: 12 }}>
                "{hadith.text}"
              </Text>
              <Text style={{ color: "#dbb142", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 2 }}>
                — {hadith.source}
              </Text>
            </View>
          </View>

          {/* Bottom Actions */}
          <View style={{ alignItems: "center" }}>
            {/* Swipe to Pray */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }], width: "100%", marginBottom: 16 }}>
              <Animated.View 
                {...panResponder.panHandlers}
                style={{
                  backgroundColor: "#141d17",
                  borderWidth: 2,
                  borderColor: "rgba(219,177,66,0.3)", // Fixed color for native driver compatibility
                  borderRadius: 64,
                  height: 70,
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {/* Progress Fill - Using ScaleX for Native Driver support */}
                <Animated.View style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "100%",
                  backgroundColor: "#dbb142", // Keep base color gold
                  opacity: 0.15,
                  transform: [
                    { translateX: -SCREEN_WIDTH / 2 }, // Center for scale
                    { scaleX: progressScaleX },
                    { translateX: SCREEN_WIDTH / 2 }   // Move back
                  ],
                }} />

                {/* Draggable Thumb */}
                <Animated.View
                  style={{
                    position: "absolute",
                    left: 6,
                    transform: [{ translateX }],
                    zIndex: 10,
                  }}
                >
                  <Animated.View style={{
                    width: 58,
                    height: 58,
                    borderRadius: 999,
                    backgroundColor: "#dbb142", // Use fixed color for native driver compatibility
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Ionicons name="arrow-forward" size={26} color="#080d0a" />
                  </Animated.View>
                </Animated.View>

                <Animated.Text style={{ 
                  color: "rgba(255,255,255,0.5)", 
                  textAlign: "center", 
                  fontSize: 13, 
                  fontWeight: "700", 
                  letterSpacing: 2, 
                  textTransform: "uppercase",
                  opacity: translateX.interpolate({
                    inputRange: [0, SWIPE_THRESHOLD],
                    outputRange: [1, 0],
                    extrapolate: 'clamp'
                  })
                }}>
                  Swipe to Pray
                </Animated.Text>
              </Animated.View>
            </Animated.View>

            {/* Snooze */}
            <TouchableOpacity
              onPress={onSnooze}
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 32,
                marginBottom: 20,
                width: "100%",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "rgba(255,255,255,0.6)", fontWeight: "700", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>
                ⏰  Remind me in 2 mins
              </Text>
            </TouchableOpacity>

            {/* Skip — hidden below fold visually via low opacity */}
            <TouchableOpacity onPress={onSkip} hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}>
              <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, textDecorationLine: "underline" }}>
                Skip for now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
