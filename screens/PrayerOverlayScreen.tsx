import colors from "@/constants/colors.json";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ImageBackground,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  UIManager,
  Vibration,
  View,
  ActivityIndicator,
} from "react-native";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  onRemindAt: (targetTime: string, prayerEndTime: string) => void;
  isSkipReminder?: boolean;
};

export default function PrayerOverlayScreen({
  visible,
  prayerName,
  prayerTime,
  endTime,
  onPray,
  onRemindAt,
  isSkipReminder,
}: Props) {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hadith] = useState(
    HADITHS[Math.floor(Math.random() * HADITHS.length)],
  );
  const translateX = useRef(new Animated.Value(0)).current;
  const [remainingTime, setRemainingTime] = useState("");
  const [currentTime, setCurrentTime] = useState(dayjs().format("h:mm A"));
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const toggleTimePicker = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowTimePicker(!showTimePicker);
  };

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
    outputRange: [colors.gold, colors.gold, colors.success],
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
      setCurrentTime(now.format("h:mm A"));
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
    if (!visible) {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isProcessingRef.current,
      onMoveShouldSetPanResponder: () => !isProcessingRef.current,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentName = prayerNameRef.current;
        console.log(
          `[PrayerOverlay] Released at dx: ${gestureState.dx.toFixed(1)} (Threshold: ${SWIPE_THRESHOLD.toFixed(1)})`,
        );
        if (gestureState.dx >= SWIPE_THRESHOLD) {
          Vibration.vibrate(60);
          setIsProcessing(true);
          isProcessingRef.current = true;
          console.log(
            `[PrayerOverlay] Swipe success for "${currentName}", calling onPray`,
          );
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: true,
          }).start(async () => {
            try {
              await onPrayRef.current(currentName);
            } finally {
              // Reset for next time
              translateX.setValue(0);
              setIsProcessing(false);
              isProcessingRef.current = false;
            }
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
    }),
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
          backgroundColor: colors['emerald-login-bg-end'],
          opacity,
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 60,
        }}
      >
        <StatusBar barStyle="light-content" backgroundColor={colors['emerald-login-bg-end']} />

        <View
          style={{
            flex: 1,
            justifyContent: "space-between",
            paddingHorizontal: 28,
            paddingBottom: 60,
          }}
        >
          {/* Top Section */}
          <View style={{ alignItems: "center" }}>
            {/* Mosque Icon */}
            <View
              style={{
                backgroundColor: `${colors.gold}1a`,
                borderWidth: 1,
                borderColor: `${colors.gold}33`,
                borderRadius: 999,
                padding: 24,
                marginBottom: 20,
              }}
            >
              <Ionicons name="moon" size={48} color={colors.gold} />
            </View>

            {/* Prayer Name */}
            <Text
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 4,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {isSkipReminder ? "30-Min Reminder" : "Prayer Time"}
            </Text>
            <Text
              style={{
                color: "#fff",
                fontSize: 48,
                fontWeight: "600",
                fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
                marginBottom: 4,
              }}
            >
              {prayerName}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Ionicons name="time-outline" size={14} color={colors.gold} />
              <Text
                style={{ color: colors.gold, marginLeft: 6, fontWeight: "600" }}
              >
                {currentTime}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: `${colors.gold}1a`,
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 8,
                marginBottom: 32,
              }}
            >
              <Text
                style={{ color: colors.gold, fontSize: 12, fontWeight: "700" }}
              >
                Ends in: {remainingTime}
              </Text>
            </View>

            {/* Hadith */}
            <ImageBackground
              className="p-10"
              source={require("@/assets/images/bgOverlay.png")}
              style={{
                backgroundColor: colors['emerald-dark'],
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.06)",
                borderRadius: 24,

                overflow: 'hidden',
              }}
              imageStyle={{
                borderRadius: 24,
                opacity: 0.3,
                resizeMode: 'cover',
              }}
            >

              <Text
                style={{
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 16,
                  lineHeight: 26,
                  fontStyle: "italic",
                  marginBottom: 12,
                }}
              >
                "{hadith.text}"
              </Text>
              <Text
                style={{
                  color: colors.gold,
                  fontSize: 11,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                — {hadith.source}
              </Text>
            </ImageBackground>
          </View>

          {/* Bottom Actions */}
          <View style={{ alignItems: "center" }}>
            {/* Swipe to Pray */}
            <Animated.View
              style={{
                transform: [{ scale: pulseAnim }],
                width: "100%",
                marginBottom: 16,
              }}
            >
              <Animated.View
                {...panResponder.panHandlers}
                style={{
                  backgroundColor: colors['emerald-dark'],
                  borderWidth: 2,
                  borderColor: `${colors.gold}4d`, // Fixed color for native driver compatibility
                  borderRadius: 64,
                  height: 70,
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {/* Progress Fill - Using ScaleX for Native Driver support */}
                <Animated.View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "100%",
                    backgroundColor: colors.gold, // Keep base color gold
                    opacity: 0.15,
                    transform: [
                      { translateX: -SCREEN_WIDTH / 2 }, // Center for scale
                      { scaleX: progressScaleX },
                      { translateX: SCREEN_WIDTH / 2 }, // Move back
                    ],
                  }}
                />

                {isProcessing ? (
                  <View style={{ position: "absolute", width: "100%", height: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
                    <ActivityIndicator size="small" color={colors.gold} style={{ marginRight: 8 }} />
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: 13,
                        fontWeight: "700",
                        letterSpacing: 2,
                        textTransform: "uppercase",
                      }}
                    >
                      Wait until finish
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Draggable Thumb */}
                    <Animated.View
                      style={{
                        position: "absolute",
                        left: 6,
                        transform: [{ translateX }],
                        zIndex: 10,
                      }}
                    >
                      <Animated.View
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: 999,
                          backgroundColor: colors.gold, // Use fixed color for native driver compatibility
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="arrow-forward" size={26} color={colors['emerald-login-bg-end']} />
                      </Animated.View>
                    </Animated.View>

                    <Animated.Text
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: "700",
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        opacity: translateX.interpolate({
                          inputRange: [0, SWIPE_THRESHOLD],
                          outputRange: [1, 0],
                          extrapolate: "clamp",
                        }),
                      }}
                    >
                      Swipe to Pray
                    </Animated.Text>
                  </>
                )}
              </Animated.View>
            </Animated.View>

            {/* Remind Me — Accordion */}
            <View
              style={{
                backgroundColor: showTimePicker ? colors['emerald-dark'] : "rgba(255,255,255,0.05)",
                borderWidth: 1,
                borderColor: showTimePicker ? `${colors.gold}33` : "rgba(255,255,255,0.1)",
                borderRadius: showTimePicker ? 20 : 16,
                padding: showTimePicker ? 16 : 0,
                marginBottom: 16,
                width: "100%",
                overflow: 'hidden',
              }}
            >
              <TouchableOpacity
                onPress={toggleTimePicker}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: showTimePicker ? "flex-start" : "center",
                  paddingVertical: showTimePicker ? 0 : 14,
                  paddingHorizontal: showTimePicker ? 0 : 32,
                  marginBottom: showTimePicker ? 12 : 0,
                }}
              >
                <Ionicons name="alarm-outline" size={16} color={showTimePicker ? colors.gold : `${colors.gold}cc`} style={{ marginRight: 8 }} />
                <Text
                  style={{
                    color: showTimePicker ? colors.gold : "rgba(255,255,255,0.6)",
                    fontWeight: "700",
                    fontSize: showTimePicker ? 12 : 13,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {showTimePicker ? "Remind me at..." : "Remind me later"}
                </Text>

                {showTimePicker && endTime ? (
                  <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginLeft: "auto", marginRight: 8 }}>
                    ends {endTime}
                  </Text>
                ) : null}

                <Ionicons
                  name={showTimePicker ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={showTimePicker ? colors.gold : "rgba(255,255,255,0.4)"}
                  style={{ position: showTimePicker ? "relative" : "absolute", right: showTimePicker ? 0 : 16 }}
                />
              </TouchableOpacity>

              {showTimePicker && (
                <View className="flex-row flex-wrap justify-center gap-3">
                  {[5, 10, 15, 20, 30, 60].map((mins) => {
                    const targetTime = dayjs().add(mins, "minute");
                    // Cap display if beyond prayer end
                    let endDayjs = endTime ? dayjs(`${dayjs().format("YYYY-MM-DD")} ${endTime}`) : null;
                    if (endDayjs && endDayjs.isBefore(dayjs())) {
                      endDayjs = endDayjs.add(1, "day");
                    }
                    const isBeyondEnd = endDayjs && targetTime.isAfter(endDayjs);

                    if (isBeyondEnd) return null;

                    return (
                      <TouchableOpacity
                        key={mins}
                        onPress={() => {
                          onRemindAt(targetTime.format("HH:mm"), endTime);
                          setShowTimePicker(false);
                        }}
                        style={{
                          backgroundColor: `${colors.gold}1f`,
                          borderWidth: 1,
                          borderColor: `${colors.gold}4d`,
                          borderRadius: 12,
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: colors.gold, fontWeight: "700", fontSize: 13 }}>
                          {mins}m
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 2 }}>
                          {targetTime.format("h:mm A")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
