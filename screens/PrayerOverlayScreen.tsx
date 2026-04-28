import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
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
  onPray: () => void;
  onSnooze: () => void;
  onSkip: () => void;
};

export default function PrayerOverlayScreen({
  visible,
  prayerName,
  prayerTime,
  onPray,
  onSnooze,
  onSkip,
}: Props) {
  const [hadith] = useState(HADITHS[Math.floor(Math.random() * HADITHS.length)]);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      // Pulse animation for swipe indicator
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
          setSwipeProgress(Math.min(gestureState.dx / SWIPE_THRESHOLD, 1));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= SWIPE_THRESHOLD) {
          Vibration.vibrate(60);
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(onPray);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          setSwipeProgress(0);
        }
      },
    })
  ).current;

  if (!visible) return null;

  const progressColor = swipeProgress > 0.8 ? "#4ade80" : "#dbb142";

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#080d0a",
        zIndex: 9999,
        opacity,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 60,
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#080d0a" />

      <View style={{ flex: 1, justifyContent: "space-between", paddingHorizontal: 28, paddingBottom: 48, paddingTop: 24 }}>

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
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 32 }}>
            <Ionicons name="time-outline" size={14} color="#dbb142" />
            <Text style={{ color: "#dbb142", marginLeft: 6, fontWeight: "600" }}>{prayerTime}</Text>
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
            <View style={{
              backgroundColor: "#141d17",
              borderWidth: 2,
              borderColor: progressColor,
              borderRadius: 64,
              height: 70,
              justifyContent: "center",
              overflow: "hidden",
              position: "relative",
            }}>
              {/* Progress Fill */}
              <View style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${swipeProgress * 100}%`,
                backgroundColor: progressColor,
                opacity: 0.15,
              }} />

              {/* Draggable Thumb */}
              <Animated.View
                {...panResponder.panHandlers}
                style={{
                  position: "absolute",
                  left: 6,
                  transform: [{ translateX }],
                }}
              >
                <View style={{
                  width: 58,
                  height: 58,
                  borderRadius: 999,
                  backgroundColor: progressColor,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="arrow-forward" size={26} color="#080d0a" />
                </View>
              </Animated.View>

              <Text style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", fontSize: 13, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>
                Swipe to Pray
              </Text>
            </View>
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
  );
}
