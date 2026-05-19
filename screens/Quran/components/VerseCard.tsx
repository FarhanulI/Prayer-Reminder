import { useAyahAudio } from '@/hooks/Quran/useAyahAudio';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const VerseCard = ({ number, arabic, english, ayah, surahId }: { number: number, arabic: string, english: string, ayah: number, surahId: number }) => {
    const { play, pause, isPlaying, loading } = useAyahAudio(surahId, ayah);
    const animation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isPlaying) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(animation, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: false,
                    }),
                    Animated.timing(animation, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        } else {
            Animated.timing(animation, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    }, [isPlaying, animation]);

    const borderColor = animation.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255, 255, 255, 0.05)', 'rgba(219, 177, 66, 0.45)'],
    });

    const bgGlowOpacity = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.06],
    });

    return (
        <Animated.View
            style={{ borderColor }}
            className="bg-[#141d17] border rounded-2xl p-5 mb-4 relative overflow-hidden"
        >
            {/* Pulsing Golden Background Glow */}
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    {
                        backgroundColor: '#dbb142',
                        opacity: bgGlowOpacity,
                    }
                ]}
            />

            <View className="flex flex-row justify-between items-center mb-4">
                <View className="flex gap-2 items-center bg-[#1a291f] w-7 h-7 rounded items-center justify-center ">
                    <Text className="text-[#dbb142] text-[11px] font-bold">{number}</Text>
                </View>
                <TouchableOpacity
                    className="flex gap-2 items-center bg-[#1a291f] w-7 h-7 rounded items-center justify-center "
                    onPress={isPlaying ? pause : play}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#dbb142" />
                    ) : (
                        <Ionicons name={isPlaying ? "pause-circle-outline" : "play-circle-outline"} size={20} color="#dbb142" />
                    )}
                </TouchableOpacity>
            </View>

            <View className="mb-6">
                <Text className="text-white text-right text-[26px]" style={{ fontFamily: 'serif', lineHeight: 44 }}>{arabic}</Text>
            </View>

            <View className="flex-row items-center justify-between">
                <Text className="text-white/60 text-sm italic leading-6">{english}</Text>
            </View>
        </Animated.View>
    );
};

export default VerseCard;