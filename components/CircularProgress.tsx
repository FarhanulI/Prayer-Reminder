import colors from "@/constants/colors.json";
import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface ICircularProgress {
    value: number;
    total: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
}

const CircularProgress = ({
    value,
    total,
    size = 180,
    strokeWidth = 6,
    color = colors.gold,
}: ICircularProgress) => {
    const percentage = Math.min(Math.max(value / total, 0), 1);

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const strokeDashoffset =
        circumference - circumference * percentage;

    return (
        <View
            style={{
                width: size,
                height: size,
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <Svg
                width={size}
                height={size}
                style={{
                    position: "absolute",
                }}
            >
                {/* Background Track */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={strokeWidth}
                    fill="none"
                />

                {/* Progress Arc */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    rotation={-90}
                    origin={`${size / 2}, ${size / 2}`}
                />
            </Svg>

            <View className="items-center">
                <Text className="text-white text-5xl font-bold">
                    {value}/{total}
                </Text>

                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[4px] mt-1">
                    Prayers Today
                </Text>
            </View>
        </View>
    );
};

export default CircularProgress;