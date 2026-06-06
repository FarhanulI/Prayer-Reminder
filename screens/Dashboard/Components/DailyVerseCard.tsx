import { Card } from '@/components/ui/card';
import colors from '@/constants/colors.json';
import { useGetRandomAyah } from '@/hooks/Quran/use-get-random-ayah';
import { useBookmarks } from '@/hooks/Quran/useBookmarks';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, ImageBackground, Share, Text, TouchableOpacity, View } from 'react-native';

const DailyVerseCard = () => {
    const { data: ayah, isLoading, error } = useGetRandomAyah();
    const { toggle, isBookmarked } = useBookmarks();

    const bookmarked = ayah ? isBookmarked(ayah.surah.number, ayah.numberInSurah) : false;

    const handleShare = async () => {
        if (!ayah) return;
        try {
            await Share.share({
                message: `"${ayah.text}"\n\n- Surah ${ayah.surah.englishName} ${ayah.surah.number}:${ayah.numberInSurah}`,
            });
        } catch (error) {
            console.error('Error sharing ayah:', error);
        }
    };

    const handleBookmark = () => {
        if (!ayah) return;
        toggle(ayah.surah.number, ayah.surah.englishName, ayah.numberInSurah);
    };

    return (
        <Card variant="verse" className="mb-8 overflow-hidden" style={{ padding: 0 }}>
            <ImageBackground
                source={require('@/assets/images/bgOverlay.png')}
                imageStyle={{ opacity: 0.3, resizeMode: 'cover' }}
                className="w-full p-6"
            >
                <FontAwesome5 name="quote-right" size={40} color="rgba(255,255,255,0.03)" className="absolute right-6 top-6" />

                {isLoading ? (
                    <View className="py-6 justify-center items-center">
                        <ActivityIndicator color={colors.gold} />
                    </View>
                ) : error || !ayah ? (
                    <Text className="text-white/80 text-[15px] leading-7 italic mb-6">
                        Failed to load verse. Please check your connection.
                    </Text>
                ) : (
                    <>
                        <Text className="text-white/80 text-[15px] leading-7 italic mb-6 mt-2">
                            "{ayah.text}"
                        </Text>
                        <View className="flex-row justify-between items-center">
                            <Text className="text-gold text-[11px] font-bold uppercase tracking-widest flex-1 mr-4">
                                Surah {ayah.surah.englishName} {ayah.surah.number}:{ayah.numberInSurah}
                            </Text>
                            <View className="flex-row">
                                <TouchableOpacity className="mr-4" onPress={handleShare}>
                                    <Feather name="share-2" size={16} color="white" className="opacity-40" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleBookmark}>
                                    <Feather
                                        name="bookmark"
                                        size={16}
                                        color={bookmarked ? colors.gold : "white"}
                                        className={bookmarked ? "" : "opacity-40"}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                )}
            </ImageBackground>
        </Card>
    );
};

export default DailyVerseCard;