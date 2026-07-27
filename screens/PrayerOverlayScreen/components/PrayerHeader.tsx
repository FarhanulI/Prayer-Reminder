import colors from "@/constants/colors.json";
import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Text, View } from "react-native";
import { styles } from "../styles";
import { PrayerHeaderProps } from "../types";

const PrayerHeader = memo(function PrayerHeader({
  currentTime,
  prayerName,
  remainingTime,
  isSkipReminder,
}: PrayerHeaderProps) {
  return (
    <>
      <View style={styles.iconContainer}>
        <Ionicons name="moon" size={48} color={colors.gold} />
      </View>

      <Text style={styles.prayerLabelText}>
        {isSkipReminder ? "30-Min Reminder" : "Prayer Time"}
      </Text>

      <Text style={styles.prayerNameText}>{prayerName}</Text>

      <View style={styles.currentTimeRow}>
        <Ionicons name="time-outline" size={14} color={colors.gold} />
        <Text style={styles.currentTimeText}>{currentTime}</Text>
      </View>

      <View style={styles.remainingTimePill}>
        <Text style={styles.remainingTimeText}>Ends in: {remainingTime}</Text>
      </View>
    </>
  );
});

export default PrayerHeader;
