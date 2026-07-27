import { createContext } from "react";
import { AudioTrack } from "../types/audio";

export interface AudioContextType {
  currentTrack: AudioTrack | null;
  queue: AudioTrack[];
  currentIndex: number;
  playing: boolean;
  buffering: boolean;
  duration: number;
  currentTime: number;
  progress: number;
  loading: boolean;
  error: Error | null;

  playTrack: (track: AudioTrack) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (seconds: number) => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;
  next: () => void;
  previous: () => void;
  setQueue: (tracks: AudioTrack[]) => void;
  clearQueue: () => void;
  clearCurrentTrack: () => void;
}

export const AudioContext = createContext<AudioContextType | undefined>(undefined);
