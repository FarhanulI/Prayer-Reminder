import colors from "@/constants/colors.json";
import { useAudio } from "@/hooks/useAudio";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import React, { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

interface SurahAudioPlayerProps {
  surah?: any;
  audioUrl?: string;
  onPlayingChange?: (isPlaying: boolean) => void;
}
export default function SurahAudioPlayer({
  surah,
  audioUrl,
  onPlayingChange,
}: SurahAudioPlayerProps) {
  const {
    currentTrack,
    playing,
    playTrack,
    play,
    pause,
    stop,
    duration,
    currentTime,
    progress,
    skipForward,
    skipBackward,
    loading,
  } = useAudio();

  const isCurrentSurah = useMemo(
    () => currentTrack?.url === audioUrl && !!audioUrl,
    [audioUrl, currentTrack],
  );

  useEffect(() => {
    if (isCurrentSurah) {
      onPlayingChange?.(playing);
    } else {
      onPlayingChange?.(false);
    }
  }, [playing, isCurrentSurah, onPlayingChange]);

  const handleListenClick = useCallback(() => {
    if (!audioUrl) return;

    if (isCurrentSurah) {
      if (!playing) play();
    } else {
      playTrack({
        id: surah?.id?.toString() || audioUrl,
        title: surah?.name || "Surah Audio",
        artist: "Al-Quran",
        url: audioUrl,
        reciter: "Mishary Rashid Alafasy",
        surahNumber: surah?.id,
      });
    }
  }, [audioUrl, isCurrentSurah, playing, play, playTrack, surah]);

  // const togglePlayPause = useCallback(() => {
  //   if (playing) {
  //     pause();
  //   } else {
  //     play();
  //   }
  // }, [playing, pause, play]);

  // const closePlayer = useCallback(() => {
  //   stop();
  // }, [stop]);

  // const formatTime = useCallback((seconds: number) => {
  //   if (!seconds || Number.isNaN(seconds)) {
  //     return "00:00";
  //   }

  //   const mins = Math.floor(seconds / 60);
  //   const secs = Math.floor(seconds % 60);

  //   return `${mins.toString().padStart(2, "0")}:${secs
  //     .toString()
  //     .padStart(2, "0")}`;
  // }, []);

  // const currentTimeStr = useMemo(
  //   () => formatTime(currentTime),
  //   [formatTime, currentTime],
  // );

  // const durationStr = useMemo(
  //   () => formatTime(duration),
  //   [formatTime, duration],
  // );

  if (!audioUrl) {
    return (
      <View className="bg-gray-200 rounded-full px-6 py-3.5 w-[90%]">
        <Text className="text-center text-gray-500 text-sm">
          Audio not available
        </Text>
      </View>
    );
  }

  if (!!audioUrl && currentTrack?.url === audioUrl && playing) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleListenClick}
        className="border border-gold rounded-full  flex-col items-center justify-center overflow-hidden"
      >
        <LottieView
          source={require("@/assets/images/audioLoader.json")}
          autoPlay
          loop
          style={{ width: 220, height: 38, borderRadius: 20 }}
        />
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View className="bg-gold rounded-full flex-row items-center justify-center px-6 py-3.5 w-[90%]">
        <ActivityIndicator size="small" color={colors["emerald-dark"]} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handleListenClick}
      className="bg-gold rounded-full flex-row items-center justify-center px-6 py-3.5 w-[90%]"
    >
      <Ionicons
        name="play-circle-outline"
        size={22}
        color={colors["emerald-darkest"]}
      />

      <Text className="text-emerald-darkest font-bold uppercase tracking-widest text-xs ml-2">
        Listen to Surah
      </Text>
    </TouchableOpacity>
  );
}
