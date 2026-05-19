import { SurahDetail } from '@/hooks/Quran/types'
import { usePagination } from '@/hooks/usePagination'
import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import VerseCard from './VerseCard'

interface VerseListPotpsTypes {
    surah?: SurahDetail;
    onPageChange?: () => void;
}

const VerseList = ({ surah, onPageChange }: VerseListPotpsTypes) => {
    const {
        currentPage,
        totalPages,
        nextPage,
        prevPage,
        startIndex,
        endIndex,
        isFirstPage,
        isLastPage
    } = usePagination({
        totalItems: surah?.verses?.length || 0,
        itemsPerPage: 20,
        resetKey: surah?.id,
        onPageChange: (page) => {
            if (page > 1) onPageChange?.();
        }
    });

    if (!surah || !surah.verses) return null;

    const currentVerses = surah.verses.slice(startIndex, endIndex);

    return (
        <View className="mb-6">
            <View>
                {currentVerses.map((v) => (
                    <VerseCard
                        key={v.id}
                        number={v.id}
                        arabic={v.text}
                        english={v.translation}
                        ayah={v.ayah}
                        surahId={surah.id}
                    />
                ))}
            </View>

            {totalPages > 1 && (
                <View className="flex-row justify-center items-center mt-4 mb-10">
                    <TouchableOpacity
                        onPress={prevPage}
                        disabled={isFirstPage}
                        className={`p-1 rounded-md mr-4 ${isFirstPage ? 'opacity-20' : 'bg-[#1a291f] border border-[#dbb142]/20'}`}
                    >
                        <Ionicons name="chevron-back" size={20} color="#dbb142" />
                    </TouchableOpacity>

                    <View className="bg-[#1a291f] border border-[#dbb142]/20 px-6 py-2.5 rounded-xl">
                        <Text className="text-[#dbb142] font-bold tracking-widest text-xs uppercase">
                            Page {currentPage} of {totalPages}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={nextPage}
                        disabled={isLastPage}
                        className={`p-1 rounded-md ml-4 ${isLastPage ? 'opacity-20' : 'bg-[#1a291f] border border-[#dbb142]/20'}`}
                    >
                        <Ionicons name="chevron-forward" size={20} color="#dbb142" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    )
}

export default VerseList