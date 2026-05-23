import Dropdown, { DropdownOption } from '@/components/Dropdown';
import Skeleton from '@/components/Skeleton';
import colors from '@/constants/colors.json';
import { useSurahsLists } from '@/hooks/Quran/use-surah-list';
import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface DropdownSecionProps {
    onSelectSurah: (value: DropdownOption) => void;
}

const DropdownSecion = ({ onSelectSurah }: DropdownSecionProps): React.ReactNode => {
    const isFocused = useIsFocused();
    const [surah, setSurah] = useState<DropdownOption>();

    const { data: surahsList, isLoading } = useSurahsLists({ lang: 'en', enabled: isFocused })

    return (
        <View className=" bg-emerald-dark border border-white/5 rounded-2xl p-2 mb-4">
            <Dropdown
                value={surah?.name || surahsList?.[0]?.name}
                options={surahsList}
                onSelect={(item) => { setSurah(item); onSelectSurah(item) }}
                containerStyle="w-full"
                renderTrigger={(value, isOpen, toggleDropdown) => (
                    <TouchableOpacity
                        onPress={toggleDropdown}
                        activeOpacity={0.7}
                        className="px-3 justify-center py-1"
                    >
                        <Text className="text-[#a5b4a5] text-[10px] font-bold uppercase tracking-widest mb-1">Select Surah</Text>
                        <View className="flex-row items-center">
                            {isLoading ? (
                                <Skeleton width={100} height={16} borderRadius={4} className="mr-2" />
                            ) : (
                                <Text className="text-gold font-bold mr-2 text-sm">{value}</Text>
                            )}
                            <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.gold} />
                        </View>
                    </TouchableOpacity>
                )}
            />

            {/* <View className="w-[1px] h-8 bg-white/10 mx-1" /> */}

            {/* <View className="flex-1 flex-row items-center bg-black/20 rounded-xl px-3 py-3 ml-1">
                <Feather name="search" size={16} color="#a5b4a5" />
                <TextInput
                    placeholder="Jump to Ayah"
                    placeholderTextColor="#a5b4a5"
                    className="flex-1 ml-2 text-white font-medium p-0"
                />
            </View> */}
        </View>
    )
}

export default DropdownSecion