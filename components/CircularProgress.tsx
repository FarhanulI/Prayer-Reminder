import colors from '@/constants/colors.json';
import React from 'react';
import { Text, View } from 'react-native';

interface ICircularProgress {
    value: number;
    total: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
}

const CircularProgress = ({ value, total, size = 180, strokeWidth = 6, color = colors.gold }: ICircularProgress) => {
    const percentage = (value / total) * 100;

    return (
        <View style={{ width: size, height: size }} className="items-center justify-center">
            {/* Background Track */}
            <View
                style={{ width: size, height: size, borderRadius: size / 2 }}
                className="border-[6px] border-white/5 absolute"
            />

            {/* Progress Track (Approximate with CSS-only for simplicity, would use SVG for perfect arc) */}
            <View
                style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: strokeWidth,
                    borderColor: color,
                    borderTopColor: 'transparent',
                    borderLeftColor: 'transparent',
                    transform: [{ rotate: `${(percentage / 100) * 360 - 45}deg` }]
                }}
                className="absolute"
            />

            <View className="items-center">
                <Text className="text-white text-5xl font-bold">{value}/{total}</Text>
                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[4px] mt-1">Prayers Today</Text>
            </View>
        </View>
    );
};

export default CircularProgress