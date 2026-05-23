import { cardClassName } from '@/components/ui/card';
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
import colors from '@/constants/colors.json';

const GOLD = colors.gold;
const CARD_BG = colors['verse-card-bg'];
const CARD_BG_PLAYING = colors['verse-card-bg-playing'];

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
                    backgroundColor: colors['verse-badge-bg'],
                    borderWidth: 1.5,
                    borderColor: `${GOLD}99`,
                    transform: [{ rotate: '45deg' }],
                    borderRadius: 5,
                }}
            />
            <Text className="text-gold text-[12px] font-bold z-10">{number}</Text>
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
            className={cardClassName('quranVerse')}
            style={{
                borderColor,
                backgroundColor: isPlaying ? CARD_BG_PLAYING : CARD_BG,
            }}
        >
            <Animated.View style={[styles.leftAccent, { opacity: accentOpacity }]} />

            {/* Header */}
            <View className="flex-row justify-between items-center mb-5">

                <View>
                    <HexVerseBadge number={number} />
                </View>

                <View className="flex-row  items-center gap-2">
                    <View className="flex-row items-center bg-emerald-light border border-gold/25 rounded-full px-1.5 py-1.5 ml-2">
                        <Ionicons name="bookmark" size={12} color="bg-white/5" />
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
                        className="w-10 h-10 rounded-full bg-gold items-center justify-center"
                        accessibilityLabel={isPlaying ? 'Pause recitation' : 'Play recitation'}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={colors['emerald-darkest']} />
                        ) : (
                            <Ionicons
                                name={isPlaying ? 'pause' : 'play'}
                                size={18}
                                color={colors['emerald-darkest']}
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
                <Text className="text-gold/90 text-[14px] italic leading-6 mb-3">
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
