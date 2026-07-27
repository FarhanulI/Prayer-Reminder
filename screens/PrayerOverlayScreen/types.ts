import { Animated, PanResponder } from "react-native";
import { HADITHS } from "./constants";

export type PrayerKey = keyof typeof HADITHS;

export type Props = {
  visible: boolean;
  prayerName: string;
  prayerTime: string;
  endTime: string;
  onPray: (name: string) => void | Promise<void>;
  onRemindAt: (targetTime: string, prayerEndTime: string) => void;
  isSkipReminder?: boolean;
};

export type ReminderOption = {
  minutes: number;
  formattedTime: string;
  targetTime24: string;
};

export type ReminderAccordionProps = {
  endTime: string;
  onRemindAt: (targetTime: string, prayerEndTime: string) => void;
  showTimePicker: boolean;
  onToggle: () => void;
  onClose: () => void;
};

export type SwipeToPrayProps = {
  isProcessing: boolean;
  panHandlers: ReturnType<typeof PanResponder.create>["panHandlers"];
  pulseAnim: Animated.Value;
  progressScaleX: Animated.AnimatedInterpolation<number>;
  swipeLabelOpacity: Animated.AnimatedInterpolation<number>;
  translateX: Animated.Value;
};

export type PrayerHeaderProps = {
  currentTime: string;
  prayerName: string;
  remainingTime: string;
  isSkipReminder?: boolean;
};

export type HadithCardProps = {
  hadithText: string;
  hadithSource: string;
};
