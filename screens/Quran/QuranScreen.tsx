import { DropdownOption } from "@/components/Dropdown";
import { useGetSurah } from "@/hooks/Quran/use-get-surah";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import DropdownSecion from "./components/DropdownSecion";

const VerseCard = ({ number, arabic, english }: { number: number, arabic: string, english: string }) => (
  <View className="bg-[#141d17] border border-white/5 rounded-2xl p-5 mb-4">
    <View className="bg-[#1a291f] w-7 h-7 rounded items-center justify-center mb-4">
      <Text className="text-[#dbb142] text-[11px] font-bold">{number}</Text>
    </View>

    <View className="mb-6">
      <Text className="text-white text-right text-[26px]" style={{ fontFamily: 'serif', lineHeight: 44 }}>{arabic}</Text>
    </View>

    <Text className="text-white/60 text-sm italic leading-6">{english}</Text>
  </View>
);

export default function QuranScreen() {
  const [currentSurah, setCurrentSurah] = useState<DropdownOption>();
  const { data: surah, isLoading, isError } = useGetSurah({ id: currentSurah?.id })

  return (
    <View className="flex-1 bg-[#0d1410]">
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 60, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center mb-8">
          <Text className="text-white text-xl font-bold" style={{ fontFamily: 'serif' }}>Al-Quran</Text>
        </View>
        {/* Top Dropdowns Row */}
        <DropdownSecion onSelectSurah={(item) => setCurrentSurah(item)} />

        {/* Action Buttons Row */}
        {/* <View className="flex-row mb-6">
          <TouchableOpacity className="flex-1 bg-[#dbb142] rounded-xl flex-row justify-center items-center py-3.5 mr-2">
            <Feather name="book-open" size={16} color="#0d1410" />
            <Text className="text-[#0d1410] font-bold ml-2">Read</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-[#141d17] border border-white/5 rounded-xl flex-row justify-center items-center py-3.5 ml-2">
            <Feather name="search" size={16} color="white" />
            <Text className="text-white font-bold ml-2">Search</Text>
          </TouchableOpacity>
        </View> */}

        {/* Surah Info Card */}
        {isLoading ? (
          <View className="bg-[#141d17] border border-white/5 rounded-2xl p-8 mb-6 items-center">
            <View className="w-24 h-6 bg-white/5 rounded mb-4" />
            <View className="w-32 h-4 bg-white/5 rounded mb-2" />
            <View className="w-20 h-3 bg-white/5 rounded mb-6" />
            <View className="w-full h-12 bg-[#dbb142]/10 rounded-full" />
          </View>
        ) : surah ? (
          <View className="bg-[#141d17] border border-[#dbb142]/40 rounded-2xl p-6 mb-6 items-center">
            <Text className="text-[#dbb142] text-2xl font-bold mb-2" style={{ fontFamily: 'serif' }}>{surah.name}</Text>
            <Text className="text-[#dbb142] text-base font-semibold">{surah.transliteration}</Text>
            <Text className="text-white/50 text-xs mb-5">({surah.translation})</Text>

            <View className="flex-row items-center mb-6 justify-center">
              <View className="flex-row items-center mx-3">
                <Ionicons name="list" size={14} color="rgba(255,255,255,0.4)" />
                <Text className="text-white/40 text-[10px] uppercase ml-1.5 tracking-widest">{surah.total_verses} Verses</Text>
              </View>
              <View className="flex-row items-center mx-3">
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.4)" />
                <Text className="text-white/40 text-[10px] uppercase ml-1.5 tracking-widest" style={{ textTransform: 'capitalize' }}>{surah.type}</Text>
              </View>
            </View>

            <TouchableOpacity className="bg-[#dbb142] rounded-full flex-row items-center px-6 py-3.5 w-[90%] justify-center">
              <Ionicons name="play-circle-outline" size={20} color="#0d1410" />
              <Text className="text-[#0d1410] font-bold text-xs uppercase tracking-widest ml-2">Listen to Surah</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="bg-[#141d17] border border-white/5 rounded-2xl p-8 mb-6 items-center justify-center opacity-50">
             <Ionicons name="book-outline" size={32} color="#dbb142" />
             <Text className="text-white/40 mt-2 text-xs uppercase tracking-widest font-bold">Select a surah to begin</Text>
          </View>
        )}

        {/* Verses List */}
        <View className="mb-6">
          {surah?.verses?.map((v) => (
            <VerseCard
              key={v.id}
              number={v.id}
              arabic={v.text}
              english={v.translation}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
