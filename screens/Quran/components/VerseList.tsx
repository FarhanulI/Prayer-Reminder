import colors from '@/constants/colors.json';
import { SurahDetail } from '@/hooks/Quran/types';
import { useBookmarks } from '@/hooks/Quran/useBookmarks';
import { useLastRead } from '@/hooks/Quran/useLastRead';
import { usePagination } from '@/hooks/usePagination';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import VerseCard from './VerseCard';

interface VerseListProps {
    surah?: SurahDetail;
    ayahNumber?: number;
    onPageChange?: () => void;
    onScrollToOffset?: (y: number) => void;
}

const VerseList = ({ surah, ayahNumber, onPageChange, onScrollToOffset }: VerseListProps) => {
    const { isBookmarked, toggle } = useBookmarks();
    const { lastRead, savePosition } = useLastRead();

    const {
        currentPage,
        totalPages,
        nextPage,
        prevPage,
        setPage,
        startIndex,
        endIndex,
        isFirstPage,
        isLastPage,
    } = usePagination({
        totalItems: surah?.verses?.length || 0,
        itemsPerPage: 20,
        resetKey: surah?.id,
        onPageChange: (page) => {
            if (page > 1) onPageChange?.();
        },
    });

    useEffect(() => {
        if (surah && surah.verses && ayahNumber) {
            const verseIndex = surah.verses.findIndex((v) => v.ayah === ayahNumber);
            if (verseIndex >= 0) {
                const targetPage = Math.floor(verseIndex / 20) + 1;
                setPage(targetPage);
            }
        }
    }, [surah?.id, ayahNumber, surah?.verses, setPage]);

    // Auto-save last read when surah changes (save first visible ayah of current page)
    // useEffect(() => {
    //     if (!surah) return;
    //     const firstVerse = surah.verses?.[startIndex];
    //     if (!firstVerse) return;
    //     savePosition(surah.id, surah.transliteration, firstVerse.ayah);
    // }, [surah?.id, startIndex]);

    if (!surah || !surah.verses) return null;

    const currentVerses = surah.verses.slice(startIndex, endIndex);

    return (
        <View className="mb-6">
            <View>
                {currentVerses.map((v) => (
                    <View
                        key={v.id}
                        onLayout={(event) => {
                            if (v.ayah === ayahNumber && onScrollToOffset) {
                                // Add 260px offset to account for ScrollView paddingTop and Surah Info Card height
                                onScrollToOffset(event.nativeEvent.layout.y + 260);
                            }
                        }}
                    >
                        <VerseCard
                            key={v.id}
                            number={v.id}
                            arabic={v.text}
                            english={v.translation}
                            ayah={v.ayah}
                            surahId={surah.id}
                            surahName={surah.transliteration}
                            isLastRead={
                                lastRead?.surahNumber === surah.id &&
                                lastRead?.ayahNumber === v.ayah
                            }
                            isBookmarked={isBookmarked(surah.id, v.ayah)}
                            onBookmarkToggle={() => toggle(surah.id, surah.transliteration, v.ayah)}
                            onPress={() => savePosition(surah.id, surah.transliteration, v.ayah)}
                        />
                    </View>
                ))}
            </View>

            {totalPages > 1 && (
                <View className="flex-row justify-center items-center mt-4 mb-10">
                    <TouchableOpacity
                        onPress={prevPage}
                        disabled={isFirstPage}
                        className={`p-1 rounded-md mr-4 ${isFirstPage ? 'opacity-20' : 'bg-emerald-light border border-gold/20'}`}
                    >
                        <Ionicons name="chevron-back" size={20} color={colors.gold} />
                    </TouchableOpacity>

                    <View className="bg-emerald-light border border-gold/20 px-6 py-2.5 rounded-xl">
                        <Text className="text-gold font-bold tracking-widest text-xs uppercase">
                            Page {currentPage} of {totalPages}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={nextPage}
                        disabled={isLastPage}
                        className={`p-1 rounded-md ml-4 ${isLastPage ? 'opacity-20' : 'bg-emerald-light border border-gold/20'}`}
                    >
                        <Ionicons name="chevron-forward" size={20} color={colors.gold} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default VerseList;