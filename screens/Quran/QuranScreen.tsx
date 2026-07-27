import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { DropdownOption } from "@/components/Dropdown";
import { Card } from "@/components/ui/card";

import colors from "@/constants/colors.json";

import { useGetSurah } from "@/hooks/Quran/use-get-surah";
import { useBookmarks } from "@/hooks/Quran/useBookmarks";

import DropdownSection from "./components/DropdownSection";
import SurahAudioPlayer from "./components/SurahAudioPlayer";
import VerseList from "./components/VerseList";

export default function QuranScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [initialPramsState, setinitialPramsState] = useState({
    surahNumber: route.params?.surahNumber,
    ayahNumber: route.params?.ayahNumber,
  });

  const scrollRef = useRef<ScrollView>(null);

  const initialParams = useRef({
    surahNumber: route.params?.surahNumber,
    ayahNumber: route.params?.ayahNumber,
  });

  const [selectedSurah, setSelectedSurah] = useState<DropdownOption>();
  const [isFullAudioPlaying, setIsFullAudioPlaying] = useState(false);

  const { count: bookmarkCount } = useBookmarks();

  /**
   * Handle deep link / navigation params
   */
  useEffect(() => {
    if (!route.params?.surahNumber) return;

    setinitialPramsState({
      surahNumber: route.params.surahNumber,
      ayahNumber: route.params.ayahNumber,
    });

    initialParams.current = {
      surahNumber: route.params.surahNumber,
      ayahNumber: route.params.ayahNumber,
    };

    setSelectedSurah(undefined);

    navigation.setParams({
      surahNumber: undefined,
      ayahNumber: undefined,
    });
  }, [navigation, route.params?.ayahNumber, route.params?.surahNumber]);

  const selectedSurahId = useMemo(() => {
    return (
      selectedSurah?.id ??
      (initialParams.current.surahNumber
        ? Number(initialParams.current.surahNumber)
        : undefined)
    );
  }, [selectedSurah, route.params?.surahNumber]);

  const { data: surah, isLoading } = useGetSurah({ id: selectedSurahId });

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  };

  const scrollToOffset = (y: number) => {
    scrollRef.current?.scrollTo({
      y,
      animated: true,
    });

    /**
     * Once deep-linked surah is loaded,
     * clear params so manual browsing works normally.
     */

    setinitialPramsState({
      surahNumber: undefined,
      ayahNumber: undefined,
    });

    initialParams.current = {
      surahNumber: undefined,
      ayahNumber: undefined,
    };
  };

  return (
    <View className="flex-1 bg-emerald-darkest">
      {/* Header */}
      <View className="px-6 pt-14 pb-2 bg-emerald-darkest border-b border-white/5">
        <View className="flex-row items-center justify-between mb-6">
          <Text
            className="text-white text-xl font-bold"
            style={{ fontFamily: "serif" }}
          >
            Al-Quran
          </Text>

          <TouchableOpacity
            accessibilityLabel="Open bookmarks"
            onPress={() => navigation.navigate("Bookmarks")}
            className="flex-row items-center bg-emerald-dark border border-gold/20 rounded-full px-3 py-1.5"
          >
            <Ionicons name="bookmark" size={13} color={colors.gold} />

            <Text className="text-gold text-[11px] font-bold ml-1.5">
              {bookmarkCount ? `${bookmarkCount} Saved` : "Bookmarks"}
            </Text>
          </TouchableOpacity>
        </View>

        <DropdownSection
          selectedSurahId={selectedSurahId}
          onSelectSurah={setSelectedSurah}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: 100,
        }}
      >
        {isLoading ? (
          <Card className="rounded-2xl p-8 mb-6 items-center">
            <View className="w-24 h-6 rounded bg-white/5 mb-4" />
            <View className="w-32 h-4 rounded bg-white/5 mb-2" />
            <View className="w-20 h-3 rounded bg-white/5 mb-6" />
            <View className="w-full h-12 rounded-full bg-gold/10" />
          </Card>
        ) : surah ? (
          <Card variant="highlight" className="items-center mb-6">
            <Text
              className="text-gold text-2xl font-bold mb-2"
              style={{ fontFamily: "serif" }}
            >
              {surah.name}
            </Text>

            <Text className="text-gold text-base font-semibold">
              {surah.transliteration}
            </Text>

            <Text className="text-white/50 text-xs mb-5">
              ({surah.translation})
            </Text>

            <View className="flex-row justify-center items-center mb-6">
              <View className="flex-row items-center mx-3">
                <Ionicons name="list" size={14} color="rgba(255,255,255,0.4)" />
                <Text className="ml-1.5 text-white/40 text-[10px] uppercase tracking-widest">
                  {surah.total_verses} Verses
                </Text>
              </View>

              <View className="flex-row items-center mx-3">
                <Ionicons
                  name="location-outline"
                  size={14}
                  color="rgba(255,255,255,0.4)"
                />

                <Text
                  className="ml-1.5 text-white/40 text-[10px] uppercase tracking-widest"
                  style={{
                    textTransform: "capitalize",
                  }}
                >
                  {surah.revelation_place}
                </Text>
              </View>
            </View>

            <SurahAudioPlayer
              surah={surah}
              audioUrl={surah.fullAdio?.surah_audio}
              onPlayingChange={setIsFullAudioPlaying}
            />
          </Card>
        ) : (
          <Card className="rounded-2xl p-8 mb-6 items-center justify-center opacity-50">
            <Ionicons name="book-outline" size={32} color={colors.gold} />

            <Text className="mt-2 text-xs font-bold uppercase tracking-widest text-white/40">
              Select a surah to begin
            </Text>
          </Card>
        )}

        <VerseList
          surah={surah}
          ayahNumber={initialPramsState.ayahNumber}
          isFullAudioPlaying={isFullAudioPlaying}
          onPageChange={scrollToTop}
          onScrollToOffset={scrollToOffset}
        />
      </ScrollView>
    </View>
  );
}
