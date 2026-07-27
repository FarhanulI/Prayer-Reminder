import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import colors from "../../../constants/colors.json";
import { styles } from "../styles";
import { ReminderAccordionProps, ReminderOption } from "../types";
import { getAvailableReminderOptions } from "../utils";

const ReminderAccordion = memo(function ReminderAccordion({
  endTime,
  onRemindAt,
  showTimePicker,
  onToggle,
  onClose,
}: ReminderAccordionProps) {
  const availableReminderOptions = useMemo(
    () => (showTimePicker ? getAvailableReminderOptions(endTime) : []),
    [endTime, showTimePicker],
  );

  const handleReminderPress = useCallback(
    (option: ReminderOption) => {
      onRemindAt(option.targetTime24, endTime);
      onClose();
    },
    [endTime, onClose, onRemindAt],
  );

  return (
    <View
      style={[
        styles.reminderContainer,
        showTimePicker
          ? styles.reminderContainerExpanded
          : styles.reminderContainerCollapsed,
      ]}
    >
      <TouchableOpacity
        onPress={onToggle}
        style={
          showTimePicker
            ? styles.reminderHeaderExpanded
            : styles.reminderHeaderCollapsed
        }
      >
        <Ionicons
          name="alarm-outline"
          size={16}
          color={showTimePicker ? colors.gold : `${colors.gold}cc`}
          style={styles.reminderHeaderIcon}
        />

        <Text
          style={
            showTimePicker
              ? styles.reminderHeaderTextExpanded
              : styles.reminderHeaderTextCollapsed
          }
        >
          {showTimePicker ? "Remind me at..." : "Remind me later"}
        </Text>

        {showTimePicker && endTime ? (
          <Text style={styles.reminderEndsText}>ends {endTime}</Text>
        ) : null}

        <Ionicons
          name={showTimePicker ? "chevron-up" : "chevron-down"}
          size={16}
          color={showTimePicker ? colors.gold : "rgba(255,255,255,0.4)"}
          style={
            showTimePicker
              ? styles.reminderChevronExpanded
              : styles.reminderChevronCollapsed
          }
        />
      </TouchableOpacity>

      {showTimePicker ? (
        <View className="flex-row flex-wrap justify-center gap-3">
          {availableReminderOptions.map((option) => (
            <TouchableOpacity
              key={option.minutes}
              onPress={() => handleReminderPress(option)}
              style={styles.reminderOptionButton}
            >
              <Text style={styles.reminderOptionMinutesText}>
                {option.minutes}m
              </Text>
              <Text style={styles.reminderOptionTimeText}>
                {option.formattedTime}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
});

export default ReminderAccordion;
