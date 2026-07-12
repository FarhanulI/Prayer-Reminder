import colors from "@/constants/colors.json";
import { Ionicons } from "@expo/vector-icons";
import {
  setAudioModeAsync, // <-- Added global Audio object for mode configuration
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface SurahAudioPlayerProps {
  audioUrl?: string;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export default function SurahAudioPlayer({
  audioUrl,
  onPlayingChange,
}: SurahAudioPlayerProps) {
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);

  // Configure background execution globally
  useEffect(() => {
    async function configureAudioMode() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'mixWithOthers'
        });
      } catch (error) {
        console.error("Failed to set audio mode:", error);
      }
    }
    configureAudioMode();
  }, []);

  // Create player only when URL exists
  const player = useAudioPlayer(audioUrl ?? "");
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    onPlayingChange?.(status.playing);
  }, [status.playing, onPlayingChange]);

  /**
   * Reset player when audio changes
   */
  useEffect(() => {
    if (!audioUrl) {
      setIsPlayerVisible(false);
    }
  }, [audioUrl]);

  /**
   * Auto reset when playback finishes
   */
  useEffect(() => {
    if (
      status.duration > 0 &&
      status.currentTime >= status.duration &&
      !status.playing
    ) {
      player.seekTo(0);
    }
  }, [
    status.currentTime,
    status.duration,
    status.playing,
    player,
  ]);

  const handleListenClick = useCallback(() => {
    if (!audioUrl) return;

    setIsPlayerVisible(true);

    if (!status.playing) {
      player.play();
    }
  }, [audioUrl, player, status.playing]);

  const togglePlayPause = useCallback(() => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, status.playing]);

  const skipBackward = useCallback(() => {
    player.seekTo(Math.max(0, status.currentTime - 10));
  }, [player, status.currentTime]);

  const skipForward = useCallback(() => {
    player.seekTo(
      Math.min(status.duration || 0, status.currentTime + 10)
    );
  }, [player, status.currentTime, status.duration]);

  const closePlayer = useCallback(() => {
    player.pause();
    player.seekTo(0);
    setIsPlayerVisible(false);
  }, [player]);

  const progress = useMemo(() => {
    if (!status.duration) return 0;
    return (status.currentTime / status.duration) * 100;
  }, [status.currentTime, status.duration]);

  const formatTime = useCallback((seconds: number) => {
    if (!seconds || Number.isNaN(seconds)) {
      return "00:00";
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }, []);

  const currentTime = useMemo(
    () => formatTime(status.currentTime),
    [formatTime, status.currentTime]
  );

  const duration = useMemo(
    () => formatTime(status.duration),
    [formatTime, status.duration]
  );

  if (!audioUrl) {
    return (
      <View className="bg-gray-200 rounded-full px-6 py-3.5 w-[90%]">
        <Text className="text-center text-gray-500 text-sm">
          Audio not available
        </Text>
      </View>
    );
  }

  if (!isPlayerVisible) {
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

  return (
    <View className="bg-emerald-dark rounded-2xl w-[90%] p-4 border border-gold/20">
      {/* Controls */}
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity
          onPress={skipBackward}
          activeOpacity={0.7}
        >
          <Ionicons
            name="play-back"
            size={26}
            color={colors.gold}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={togglePlayPause}
          activeOpacity={0.8}
        >
          <Ionicons
            name={
              status.playing
                ? "pause-circle"
                : "play-circle"
            }
            size={52}
            color={colors.gold}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={skipForward}
          activeOpacity={0.7}
        >
          <Ionicons
            name="play-forward"
            size={26}
            color={colors.gold}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={closePlayer}
          activeOpacity={0.7}
        >
          <Ionicons
            name="close-circle-outline"
            size={26}
            color={colors.gold}
          />
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {status.duration === 0 && (
        <View className="items-center py-3">
          <ActivityIndicator color={colors.gold} />
          <Text className="text-white/60 text-xs mt-2">
            Loading audio...
          </Text>
        </View>
      )}

      {/* Progress */}
      <View className="w-full">
        <View className="h-1.5 rounded-full bg-white/15 overflow-hidden">
          <View
            className="h-full bg-gold rounded-full"
            style={{
              width: `${progress}%`,
            }}
          />
        </View>

        <View className="flex-row justify-between mt-2">
          <Text className="text-white/60 text-xs">
            {currentTime}
          </Text>

          <Text className="text-white/60 text-xs">
            {duration}
          </Text>
        </View>
      </View>
    </View>
  );
}