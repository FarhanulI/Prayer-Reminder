import Skeleton from "@/components/Skeleton";
import { cardClassName } from "@/components/ui/card";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, PanResponder, Text, TouchableOpacity, View } from "react-native";
import colors from "@/constants/colors.json";

interface DateSelectorRowProps {
    handlePrevWeek: () => void;
    handleNextWeek: () => void;
    weekStartStr: string;
    weekEndStr: string;
    loading: boolean;
}

const DateSelectorRow = ({
    handlePrevWeek,
    handleNextWeek,
    weekStartStr,
    weekEndStr,
    loading
}: DateSelectorRowProps) => {
    const wiggleAnim = useRef(new Animated.Value(0)).current;

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
            return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20;
        },
        onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dx > 50) {
                handlePrevWeek();
            } else if (gestureState.dx < -50) {
                handleNextWeek();
            }
        },
    });

    useEffect(() => {
        // Subtle wiggle to hint swipeability
        Animated.sequence([
            Animated.delay(1000),
            Animated.timing(wiggleAnim, { toValue: 15, duration: 200, useNativeDriver: true }),
            Animated.timing(wiggleAnim, { toValue: -15, duration: 200, useNativeDriver: true }),
            Animated.timing(wiggleAnim, { toValue: 10, duration: 150, useNativeDriver: true }),
            Animated.timing(wiggleAnim, { toValue: -10, duration: 150, useNativeDriver: true }),
            Animated.timing(wiggleAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View
            {...panResponder.panHandlers}
            style={{ transform: [{ translateX: wiggleAnim }] }}
            className={cardClassName('compact', 'flex-row justify-between items-center mb-6')}
        >
            <TouchableOpacity onPress={handlePrevWeek}>
                <Ionicons name="chevron-back" size={16} color={colors.gold} />
            </TouchableOpacity>
            {loading ? (
                <Skeleton width={120} height={20} borderRadius={4} />
            ) : (
                <Text className="text-white font-bold text-sm tracking-widest">
                    {weekStartStr} – {weekEndStr}
                </Text>
            )}
            <TouchableOpacity onPress={handleNextWeek}>
                <Ionicons name="chevron-forward" size={16} color={colors.gold} />
            </TouchableOpacity>
        </Animated.View>
    );
};

export default DateSelectorRow;
