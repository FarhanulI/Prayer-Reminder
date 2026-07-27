import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import React, { useCallback, useEffect, useState } from "react";
import { AudioContext } from "../context/AudioContext";
import { AudioTrack } from "../types/audio";

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Initialize the player
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);

  // Configure global audio mode
  useEffect(() => {
    async function configureAudioMode() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: "mixWithOthers",
        });
      } catch (error) {
        console.error("Failed to set audio mode:", error);
      }
    }
    configureAudioMode();
  }, []);

  // Update lock screen metadata when track changes
  useEffect(() => {
    if (currentTrack) {
      player.setActiveForLockScreen(true, {
        title: currentTrack.title,
        artist: currentTrack.artist || currentTrack.reciter,
        artworkUrl: currentTrack.artwork,
      });
    } else {
      player.clearLockScreenControls();
    }
  }, [currentTrack, player]);

  // Handle track end for queue progression
  useEffect(() => {
    if (status.duration > 0 && status.currentTime >= status.duration && !status.playing) {
      // Track finished playing
      if (queue.length > 0 && currentIndex < queue.length - 1) {
        const nextIndex = currentIndex + 1;
        const nextTrack = queue[nextIndex];

        setCurrentIndex(nextIndex);
        setCurrentTrack(nextTrack);
        player.replace(nextTrack.url);
        player.play();
      } else {
        // End of queue or single track
        player.seekTo(0);
        player.pause();
      }
    }
  }, [status.currentTime, status.duration, status.playing, currentIndex, queue, player]);

  const playTrack = useCallback(
    (track: AudioTrack) => {
      setCurrentTrack(track);
      player.replace(track.url);
      player.play();
    },
    [player]
  );

  const play = useCallback(() => {
    player.play();
  }, [player]);

  const pause = useCallback(() => {
    player.pause();
  }, [player]);

  const stop = useCallback(() => {
    player.pause();
    player.seekTo(0);
  }, [player]);

  const seek = useCallback(
    (seconds: number) => {
      player.seekTo(seconds);
    },
    [player]
  );

  const skipForward = useCallback(
    (seconds: number) => {
      player.seekTo(Math.min(status.duration || 0, status.currentTime + seconds));
    },
    [player, status.currentTime, status.duration]
  );

  const skipBackward = useCallback(
    (seconds: number) => {
      player.seekTo(Math.max(0, status.currentTime - seconds));
    },
    [player, status.currentTime]
  );

  const next = useCallback(() => {
    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      playTrack(queue[nextIndex]);
    }
  }, [currentIndex, queue, playTrack]);

  const previous = useCallback(() => {
    if (status.currentTime > 3) {
      // If we are more than 3 seconds in, restart the current track
      seek(0);
    } else if (currentIndex > 0) {
      // Otherwise go to previous track
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      playTrack(queue[prevIndex]);
    } else {
      seek(0);
    }
  }, [status.currentTime, currentIndex, queue, playTrack, seek]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(0);
  }, []);

  const clearCurrentTrack = useCallback(() => {
    player.pause();
    player.seekTo(0);
    setCurrentTrack(null);
    setQueue([]);
    setCurrentIndex(0);
  }, [player]);

  const progress = status.duration > 0 ? (status.currentTime / status.duration) * 100 : 0;

  const value = {
    currentTrack,
    queue,
    currentIndex,
    playing: status.playing,
    buffering: status.isBuffering,
    duration: status.duration,
    currentTime: status.currentTime,
    progress,
    loading: status.duration === 0 && currentTrack !== null,
    error: null, // Error handling could be expanded based on status.playbackState if available

    playTrack,
    play,
    pause,
    stop,
    seek,
    skipForward,
    skipBackward,
    next,
    previous,
    setQueue,
    clearQueue,
    clearCurrentTrack,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};
