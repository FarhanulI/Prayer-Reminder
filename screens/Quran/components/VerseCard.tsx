import { useAyahAudio } from '@/hooks/Quran/useAyahAudio';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Platform,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const GOLD = '#dbb142';
const CARD_BG = '#0f1812';
const CARD_BG_PLAYING = '#121f18';

type VerseCardProps = {
    number: number;
    arabic: string;
    english: string;
    ayah: number;
    surahId: number;
    transliteration?: string;
    isLastRead?: boolean;
};

function HexVerseBadge({ number }: { number: number }) {
    return (
        <View className="w-10 h-11 items-center justify-center">
            <View
                style={{
                    position: 'absolute',
                    width: 30,
                    height: 30,
                    backgroundColor: '#0a100c',
                    borderWidth: 1.5,
                    borderColor: `${GOLD}99`,
                    transform: [{ rotate: '45deg' }],
                    borderRadius: 5,
                }}
            />
            <Text className="text-[#dbb142] text-[12px] font-bold z-10">{number}</Text>
        </View>
    );
}

const VerseCard = ({
    number,
    arabic,
    english,
    ayah,
    surahId,
    transliteration,
    isLastRead = false,
}: VerseCardProps) => {
    const { play, pause, isPlaying, loading } = useAyahAudio(surahId, ayah);
    const pulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isPlaying) {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: false }),
                    Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: false }),
                ])
            );
            loop.start();
            return () => loop.stop();
        }
        Animated.timing(pulse, { toValue: 0, duration: 250, useNativeDriver: false }).start();
    }, [isPlaying, pulse]);

    const borderColor = pulse.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(219, 177, 66, 0.12)', 'rgba(219, 177, 66, 0.45)'],
    });

    const accentOpacity = pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.85, 1],
    });

    const handleShare = async () => {
        try {
            await Share.share({
                message: [arabic, transliteration, english].filter(Boolean).join('\n\n'),
            });
        } catch {
            /* user dismissed */
        }
    };

    return (
        <Animated.View
            style={[
                styles.card,
                {
                    borderColor,
                    backgroundColor: isPlaying ? CARD_BG_PLAYING : CARD_BG,
                },
            ]}
        >
            <Animated.View style={[styles.leftAccent, { opacity: accentOpacity }]} />

            {/* Header */}
            <View className="flex-row justify-between items-center mb-5">

                <View>
                    <HexVerseBadge number={number} />
                </View>

                <View className="flex-row  items-center gap-2">
                    <View className="flex-row items-center bg-[#1a291f] border border-[#dbb142]/25 rounded-full px-1.5 py-1.5 ml-2">
                        <Ionicons name="bookmark" size={12} color="bg-white/5" />
                        {/* <Text className="text-[#dbb142] text-[9px] font-bold tracking-[1.5px] ml-1.5 uppercase">
                            Last Read
                        </Text> */}
                    </View>

                    <TouchableOpacity
                        onPress={handleShare}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        className="p-2 mr-1"
                        accessibilityLabel="Share verse"
                    >
                        <Ionicons name="share-social-outline" size={20} color={GOLD} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={isPlaying ? pause : play}
                        disabled={loading}
                        className="w-10 h-10 rounded-full bg-[#dbb142] items-center justify-center"
                        accessibilityLabel={isPlaying ? 'Pause recitation' : 'Play recitation'}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#0d1410" />
                        ) : (
                            <Ionicons
                                name={isPlaying ? 'pause' : 'play'}
                                size={18}
                                color="#0d1410"
                                style={{ marginLeft: isPlaying ? 0 : 2 }}
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Arabic */}
            <Text
                className="text-white text-[26px] text-center leading-[46px] mb-4 px-1"
                style={{ fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif' }}
            >
                {arabic}
            </Text>

            {/* Transliteration */}
            {transliteration ? (
                <Text className="text-[#dbb142]/90 text-[14px] italic leading-6 mb-3">
                    {transliteration}
                </Text>
            ) : null}

            <View className="h-px bg-white/8 mb-4" />

            {/* Translation */}
            <Text className="text-white/85 text-[15px] leading-7">{english}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 18,
        paddingVertical: 18,
        marginBottom: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    leftAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: GOLD,
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
    },
});

export default VerseCard;
