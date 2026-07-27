import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { ActivityIndicator, Animated, Text, View } from "react-native";
import colors from "../../../constants/colors.json";
import { OVERLAY_BACKGROUND, SCREEN_WIDTH } from "../constants";
import { styles } from "../styles";
import { SwipeToPrayProps } from "../types";

const SwipeToPrayAction = memo(function SwipeToPrayAction({
  isProcessing,
  panHandlers,
  pulseAnim,
  progressScaleX,
  swipeLabelOpacity,
  translateX,
}: SwipeToPrayProps) {
  return (
    <Animated.View
      style={[styles.swipeWrapper, { transform: [{ scale: pulseAnim }] }]}
    >
      <Animated.View {...panHandlers} style={styles.swipeTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              transform: [
                { translateX: -SCREEN_WIDTH / 2 },
                { scaleX: progressScaleX },
                { translateX: SCREEN_WIDTH / 2 },
              ],
            },
          ]}
        />

        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator
              size="small"
              color={colors.gold}
              style={styles.processingSpinner}
            />
            <Text style={styles.processingText}>Wait until finish</Text>
          </View>
        ) : (
          <>
            <Animated.View
              style={[styles.thumbWrapper, { transform: [{ translateX }] }]}
            >
              <Animated.View style={styles.thumbButton}>
                <Ionicons
                  name="arrow-forward"
                  size={26}
                  color={OVERLAY_BACKGROUND}
                />
              </Animated.View>
            </Animated.View>

            <Animated.Text
              style={[styles.swipeLabelText, { opacity: swipeLabelOpacity }]}
            >
              Swipe to Pray
            </Animated.Text>
          </>
        )}
      </Animated.View>
    </Animated.View>
  );
});

export default SwipeToPrayAction;
