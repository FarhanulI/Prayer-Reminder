import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

// Use a simple global variable to store the CURRENTLY LOADED sound object
// This ensures we can stop any sound from ANY instance of the hook.
let globalSoundInstance: AudioPlayer | null = null;

export const useAyahAudio = (surahId: number, ayahInSurah: number) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  // Track this specific instance's sound
  const localSoundRef = useRef<AudioPlayer | null>(null);

  const stopGlobalAudio = async () => {
    if (globalSoundInstance) {
      try {
        globalSoundInstance.pause();
        globalSoundInstance.remove();
      } catch (e) { /* ignore */ }
      globalSoundInstance = null;
    }
  };

  const play = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Stop whatever is playing globally
      await stopGlobalAudio();

      // 2. Fetch Audio URL
      const response = await fetch(`https://api.alquran.cloud/v1/ayah/${ayahInSurah}/ar.alafasy`);
      const data = await response.json();
      console.log({ data });

      const url = data?.data?.audio;

      if (!url) throw new Error("No audio URL");

      // 3. Create and Play
      const player = createAudioPlayer(url);
      player.play();

      // 4. Assign to global and local
      globalSoundInstance = player;
      localSoundRef.current = player;
      setIsPlaying(true);

      player.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded) {
          setIsPlaying(status.playing);
          if (status.didJustFinish) {
            setIsPlaying(false);
            player.remove();
            if (globalSoundInstance === player) {
              globalSoundInstance = null;
            }
          }
        }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [ayahInSurah]);

  const pause = useCallback(async () => {
    if (localSoundRef.current) {
      localSoundRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localSoundRef.current === globalSoundInstance) {
        stopGlobalAudio();
      }
    };
  }, []);

  return { play, pause, isPlaying, loading };
};
