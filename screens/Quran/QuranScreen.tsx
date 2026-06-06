import { DropdownOption } from "@/components/Dropdown";
import { Card } from "@/components/ui/card";
import colors from "@/constants/colors.json";
import { useGetSurah } from "@/hooks/Quran/use-get-surah";
import { useBookmarks } from "@/hooks/Quran/useBookmarks";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import DropdownSecion from "./components/DropdownSecion";
import VerseList from "./components/VerseList";

export default function QuranScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // Refs to preserve navigation parameters until they are fully loaded and consumed
  const initialSurahNumberRef = useRef<number | undefined>(route.params?.surahNumber);
  const initialAyahNumberRef = useRef<number | undefined>(route.params?.ayahNumber);

  // Update refs if new route params are received, and clear the route parameters
  useEffect(() => {
    if (route.params?.surahNumber) {
      initialSurahNumberRef.current = route.params.surahNumber;
      initialAyahNumberRef.current = route.params.ayahNumber;

      // Clear the params so they don't persist on subsequent manual tab visits
      navigation.setParams({ surahNumber: undefined, ayahNumber: undefined });
    }
  }, [route.params?.surahNumber, route.params?.ayahNumber, navigation]);

  const surahNumber = initialSurahNumberRef.current;
  const ayahNumber = initialAyahNumberRef.current;

  const [currentSurah, setCurrentSurah] = useState<DropdownOption>();
  const { data: surah, isLoading, isError } = useGetSurah({ id: currentSurah?.id || surahNumber });
  const { count: bookmarkCount } = useBookmarks();

  // Clear the initial refs once the requested surah has successfully loaded
  useEffect(() => {
    if (surah && surah.id === initialSurahNumberRef.current) {
      initialSurahNumberRef.current = undefined;
      initialAyahNumberRef.current = undefined;
    }
  }, [surah]);

  return (
    <View className="flex-1 bg-emerald-darkest">
      <View className="px-6 pt-14 pb-2 bg-emerald-darkest z-50 border-b border-white/5">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-white text-xl font-bold" style={{ fontFamily: 'serif' }}>
            Al-Quran
          </Text>

          {/* Bookmarks shortcut */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Bookmarks")}
            className="flex-row items-center bg-emerald-dark border border-gold/20 rounded-full px-3 py-1.5"
            accessibilityLabel="Open saved bookmarks"
          >
            <Ionicons name="bookmark" size={13} color={colors.gold} />
            <Text className="text-gold text-[11px] font-bold ml-1.5">
              {bookmarkCount > 0 ? `${bookmarkCount} Saved` : 'Bookmarks'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Surah Dropdown */}
        <DropdownSecion selectedSurahId={surahNumber} onSelectSurah={(item) => setCurrentSurah(item)} />
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Surah Info Card */}
        {isLoading ? (
          <Card className="rounded-2xl p-8 mb-6 items-center">
            <View className="w-24 h-6 bg-white/5 rounded mb-4" />
            <View className="w-32 h-4 bg-white/5 rounded mb-2" />
            <View className="w-20 h-3 bg-white/5 rounded mb-6" />
            <View className="w-full h-12 bg-gold/10 rounded-full" />
          </Card>
        ) : surah ? (
          <Card variant="highlight" className="mb-6 items-center">
            <Text className="text-gold text-2xl font-bold mb-2" style={{ fontFamily: 'serif' }}>
              {surah.name}
            </Text>
            <Text className="text-gold text-base font-semibold">{surah.transliteration}</Text>
            <Text className="text-white/50 text-xs mb-5">({surah.translation})</Text>

            <View className="flex-row items-center mb-6 justify-center">
              <View className="flex-row items-center mx-3">
                <Ionicons name="list" size={14} color="rgba(255,255,255,0.4)" />
                <Text className="text-white/40 text-[10px] uppercase ml-1.5 tracking-widest">
                  {surah.total_verses} Verses
                </Text>
              </View>
              <View className="flex-row items-center mx-3">
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.4)" />
                <Text
                  className="text-white/40 text-[10px] uppercase ml-1.5 tracking-widest"
                  style={{ textTransform: 'capitalize' }}
                >
                  {surah.type}
                </Text>
              </View>
            </View>

            <TouchableOpacity className="bg-gold rounded-full flex-row items-center px-6 py-3.5 w-[90%] justify-center">
              <Ionicons name="play-circle-outline" size={20} color={colors['emerald-darkest']} />
              <Text className="text-emerald-darkest font-bold text-xs uppercase tracking-widest ml-2">
                Listen to Surah
              </Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <Card className="rounded-2xl p-8 mb-6 items-center justify-center opacity-50">
            <Ionicons name="book-outline" size={32} color={colors.gold} />
            <Text className="text-white/40 mt-2 text-xs uppercase tracking-widest font-bold">
              Select a surah to begin
            </Text>
          </Card>
        )}

        {/* Verses */}
        <VerseList
          surah={surah}
          ayahNumber={ayahNumber}
          onPageChange={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          onScrollToOffset={(y) => scrollRef.current?.scrollTo({ y, animated: true })}
        />
      </ScrollView>
    </View>
  );
}
