import dayjs from "dayjs";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  UIManager,
  Vibration,
  View,
} from "react-native";
import HadithCard from "./components/HadithCard";
import PrayerHeader from "./components/PrayerHeader";
import ReminderAccordion from "./components/ReminderAccordion";
import SwipeToPrayAction from "./components/SwipeToPrayAction";
import {
  EMPTY_HADITH,
  HADITHS,
  OVERLAY_BACKGROUND,
  SCREEN_WIDTH,
  SWIPE_THRESHOLD,
} from "./constants";
import { styles } from "./styles";
import { Props } from "./types";
import { formatRemainingTime, getPrayerKey } from "./utils";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PrayerOverlayScreen({
  visible,
  prayerName,
  prayerTime,
  endTime,
  onPray,
  onRemindAt,
  isSkipReminder,
}: Props) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [remainingTime, setRemainingTime] = useState("");
  const [currentTime, setCurrentTime] = useState(dayjs().format("h:mm A"));
  const [isProcessing, setIsProcessing] = useState(false);

  // The component currently receives prayerTime from the parent even though the
  // existing UI does not display it. Keep the prop consumed to preserve the API.
  void prayerTime;

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------

  const isProcessingRef = useRef(false);
  const prayerNameRef = useRef(prayerName);
  const onPrayRef = useRef(onPray);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // ---------------------------------------------------------------------------
  // Animated Values
  // ---------------------------------------------------------------------------

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const progressScaleX = useMemo(
    () =>
      translateX.interpolate({
        inputRange: [0, SCREEN_WIDTH],
        outputRange: [0.0001, 1],
        extrapolate: "clamp",
      }),
    [translateX],
  );

  const swipeLabelOpacity = useMemo(
    () =>
      translateX.interpolate({
        inputRange: [0, SWIPE_THRESHOLD],
        outputRange: [1, 0],
        extrapolate: "clamp",
      }),
    [translateX],
  );

  const selectedHadith = useMemo(() => {
    const prayerKey = getPrayerKey(prayerName);
    return prayerKey ? HADITHS[prayerKey] : EMPTY_HADITH;
  }, [prayerName]);

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  const toggleTimePicker = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowTimePicker((previous) => !previous);
  }, []);

  const closeTimePicker = useCallback(() => {
    setShowTimePicker(false);
  }, []);

  const resetSwipeState = useCallback(() => {
    translateX.setValue(0);
    setIsProcessing(false);
    isProcessingRef.current = false;
  }, [translateX]);

  const handleSwipeSuccess = useCallback(async () => {
    const currentPrayerName = prayerNameRef.current;

    Vibration.vibrate(60);
    setIsProcessing(true);
    isProcessingRef.current = true;

    console.log(
      `[PrayerOverlay] Swipe success for "${currentPrayerName}", calling onPray`,
    );

    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(async () => {
      try {
        await onPrayRef.current(currentPrayerName);
      } finally {
        resetSwipeState();
      }
    });
  }, [resetSwipeState, translateX]);

  const handleSwipeReset = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      bounciness: 8,
      speed: 12,
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    prayerNameRef.current = prayerName;
    onPrayRef.current = onPray;
  }, [onPray, prayerName]);

  useEffect(() => {
    if (!visible || !endTime) {
      return undefined;
    }

    // Keep the live clock and countdown in sync while the overlay is visible.
    const updateRemainingTime = () => {
      const now = dayjs();
      setCurrentTime(now.format("h:mm A"));
      setRemainingTime(formatRemainingTime(now, endTime));
    };

    updateRemainingTime();
    const countdownInterval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(countdownInterval);
  }, [endTime, visible]);

  useEffect(() => {
    if (!visible) {
      setIsProcessing(false);
      isProcessingRef.current = false;
      pulseLoopRef.current?.stop();

      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();

      return undefined;
    }

    Animated.timing(opacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    pulseLoopRef.current?.stop();
    pulseLoopRef.current = Animated.loop(
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
    );

    pulseLoopRef.current.start();

    return () => {
      pulseLoopRef.current?.stop();
    };
  }, [opacity, pulseAnim, visible]);

  // ---------------------------------------------------------------------------
  // Gesture Handling
  // ---------------------------------------------------------------------------

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
        console.log(
          `[PrayerOverlay] Released at dx: ${gestureState.dx.toFixed(1)} (Threshold: ${SWIPE_THRESHOLD.toFixed(1)})`,
        );

        if (gestureState.dx >= SWIPE_THRESHOLD) {
          void handleSwipeSuccess();
          return;
        }

        handleSwipeReset();
      },
    }),
  ).current;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlayContainer, { opacity }]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={OVERLAY_BACKGROUND}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          <View style={styles.contentWrapper}>
            <View style={styles.topSection}>
              <PrayerHeader
                currentTime={currentTime}
                prayerName={prayerName}
                remainingTime={remainingTime}
                isSkipReminder={isSkipReminder}
              />

              <HadithCard
                hadithText={selectedHadith.text}
                hadithSource={selectedHadith.source}
              />
            </View>

            <View style={styles.bottomSection}>
              <SwipeToPrayAction
                isProcessing={isProcessing}
                panHandlers={panResponder.panHandlers}
                pulseAnim={pulseAnim}
                progressScaleX={progressScaleX}
                swipeLabelOpacity={swipeLabelOpacity}
                translateX={translateX}
              />

              <ReminderAccordion
                endTime={endTime}
                onRemindAt={onRemindAt}
                showTimePicker={showTimePicker}
                onToggle={toggleTimePicker}
                onClose={closeTimePicker}
              />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
