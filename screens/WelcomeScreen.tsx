import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Star Component to replicate the dynamic web starfield
const Star = ({ index }: { index: number }) => {
    const opacity = useSharedValue(Math.random() * 0.4 + 0.3);
    const scale = useSharedValue(1);

    useEffect(() => {
        const duration = Math.random() * 1500 + 1500; // 1.5s to 3s
        const delay = Math.random() * 4000;

        opacity.value = withDelay(
            delay,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: duration / 2 }),
                    withTiming(0.3, { duration: duration / 2 })
                ),
                -1,
                true
            )
        );

        scale.value = withDelay(
            delay,
            withRepeat(
                withSequence(
                    withTiming(1.2, { duration: duration / 2 }),
                    withTiming(1, { duration: duration / 2 })
                ),
                -1,
                true
            )
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    const size = Math.random() * 2 + 1;
    const top = Math.random() * SCREEN_HEIGHT;
    const left = Math.random() * SCREEN_WIDTH;

    return (
        <Animated.View
            style={[
                styles.absolute,
                animatedStyle,
                {
                    top,
                    left,
                    width: size,
                    height: size,
                    backgroundColor: '#FFFFFF',
                    borderRadius: size / 2,
                },
            ]}
        />
    );
};

export default function WelcomeScreen({ navigation }: any) {
    // Logo floating animation
    const logoY = useSharedValue(0);
    // Button pulse animation
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        // Logo Float
        logoY.value = withRepeat(
            withSequence(
                withTiming(-15, { duration: 3000 }),
                withTiming(0, { duration: 3000 })
            ),
            -1,
            true
        );

        // Button Pulse
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.03, { duration: 1500 }),
                withTiming(1, { duration: 1500 })
            ),
            -1,
            true
        );
    }, []);

    const animatedLogoStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: logoY.value }],
    }));

    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    return (
        <View className="flex-1 bg-[#0D1410] items-center justify-center relative overflow-hidden">

            {/* 1. Dynamic Background Star Field (100 Stars for Mobile Performance) */}
            <View style={styles.absolute} pointerEvents="none">
                {[...Array(100)].map((_, i) => (
                    <Star key={i} index={i} />
                ))}
            </View>

            {/* 2. Geometric Pattern & Vignette Overlay via SVG */}
            <View style={styles.absolute} pointerEvents="none">
                <Svg height={SCREEN_HEIGHT} width={SCREEN_WIDTH}>
                    <Defs>
                        <RadialGradient
                            id="vignette"
                            cx="50%"
                            cy="50%"
                            rx="100%"
                            ry="100%"
                            fx="50%"
                            fy="50%"
                        >
                            <Stop offset="0%" stopColor="#0D1410" stopOpacity="0" />
                            <Stop offset="80%" stopColor="#0D1410" stopOpacity="1" />
                        </RadialGradient>
                    </Defs>
                    {/* Replicating CSS Background Texture */}
                    <Rect width="100%" height="100%" fill="url(#vignette)" />
                </Svg>
            </View>

            {/* 3. Main Layout Canvas */}
            <View className="items-center max-w-sm px-6 w-full z-10">

                {/* Animated Logo Container */}
                <Animated.View style={[animatedLogoStyle, styles.logoShadow]} className="mb-12">
                    <Image
                        source={{ uri: 'https://lh3.googleusercontent.com/aida/ADBb0ujH_zn3RtggBx3xcRlsKGRW3HVL5bGKU3yO2aW-vkD_MpkuKOL6GNY4FVbrElyDbbpoMmvyOK1zNdXZt9WBprL9q3O44GcHLytM0_Wkl3NkQgQSn7kA5wDZwwnERG7w58SprGSqsTSg6kdFcWVsnOlrjvv3JiHTqxMeU8s8-ibh-OX8EVaAJB22V-WT19cwLvYJumJlFFW7tqLoWKCq8AZYD2V99P8wAcuftQMI1hLmh7dKGbmjJqtQIA' }}
                        className="w-44 h-44 object-contain"
                        style={{ tintColor: '#e9c349' }} // Falling back to theme tertiary if image relies on CSS filters
                    />
                </Animated.View>

                {/* Typography Cluster */}
                <View className="space-y-3 items-center">
                    <Text className="text-center font-serif text-4xl text-[#e9c349] tracking-tight font-bold">
                        Welcome to your Sanctuary
                    </Text>
                    <Text className="text-center text-base text-[#c3c8c1] max-w-[260px] leading-relaxed mt-3">
                        Step away from the noise and find peace in every moment of your journey.
                    </Text>
                </View>

                {/* Action Button */}
                <View className="mt-12 w-full items-center">
                    <Animated.View style={animatedButtonStyle} className="w-full max-w-[240px]">
                        <TouchableOpacity
                            activeOpacity={0.8}
                            className="bg-[#e9c349] py-4 px-8 rounded-full shadow-lg items-center"
                            style={styles.buttonShadow}
                            onPress={() => navigation.replace('OnBoarding')}
                        >
                            <Text className="text-[#241a00] font-bold text-lg">
                                Start Your Journey
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <Text className="mt-6 text-xs text-[#c3c8c1] tracking-widest uppercase opacity-60">
                        Seeking Sakinah
                    </Text>
                </View>
            </View>

            {/* 4. Visual Footer Accent */}
            <View className="absolute bottom-6 left-6 right-6 flex-row justify-between items-end z-10">
                <View className="space-y-1">
                    <View className="h-1 w-12 bg-[#e9c349]/40 rounded-full" />
                    <View className="h-1 w-6 bg-[#e9c349]/20 rounded-full mt-1" />
                </View>

                {/* Replaced Material Symbols with a custom thin SVG Sparkle indicator */}
                <Svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <Path d="M12 2V22M2 12H22M19.07 4.93L4.93 19.07M19.07 19.07L4.93 4.93" stroke="#e9c349" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    absolute: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    logoShadow: {
        shadowColor: '#e9c349',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    buttonShadow: {
        shadowColor: '#e9c349',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    }
});