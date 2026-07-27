import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import colors from "../constants/colors.json";
import { useAudio } from "../hooks/useAudio";

export const MiniPlayer = () => {
  const {
    currentTrack,
    playing,
    play,
    pause,
    progress,
    clearCurrentTrack,
    skipForward,
    skipBackward,
  } = useAudio();

  const closePlayer = useCallback(() => {
    clearCurrentTrack();
  }, [clearCurrentTrack]);

  if (!currentTrack) return null;

  // const hasNext = queue.length > 0 && currentIndex < queue.length - 1;
  // const hasPrevious = currentIndex > 0 || progress > 0;

  return (
    <View
      className="bg-emerald-dark border-t border-white/5"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      {/* Progress Bar */}
      <View className="h-[2px] w-full bg-white/10 absolute top-0">
        <View className="h-full bg-gold" style={{ width: `${progress}%` }} />
      </View>

      <View className="flex-row items-center justify-between px-4 py-2 mt-[2px]">
        {/* Track Info */}
        <View className="flex-1 mr-4">
          <Text className="text-white font-bold text-sm" numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text className="text-white/60 text-xs mt-0.5" numberOfLines={1}>
            {currentTrack.reciter || currentTrack.artist || "Unknown Reciter"}
          </Text>
        </View>

        {/* Controls */}
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => skipBackward(10)}
            className="p-2"
            // disabled={!hasPrevious && progress === 0}
          >
            <Ionicons
              name="play-back"
              size={20}
              color={colors.gold}
              // style={{ opacity: !hasPrevious && progress === 0 ? 0.3 : 1 }}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={playing ? pause : play} className="mx-2">
            <Ionicons
              name={playing ? "pause-circle" : "play-circle"}
              size={36}
              color={colors.gold}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => skipForward(10)}
            className="p-2"
            //  disabled={!hasNext}
          >
            <Ionicons
              name="play-forward"
              size={20}
              color={colors.gold}
              // style={{ opacity: !hasNext ? 0.3 : 1 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => closePlayer()}
            className="p-2"
            //  disabled={!hasNext}
          >
            <Ionicons
              name="stop"
              size={20}
              color={colors.gold}
              // style={{ opacity: !hasNext ? 0.3 : 1 }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
