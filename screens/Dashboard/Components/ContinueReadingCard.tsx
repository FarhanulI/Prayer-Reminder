import colors from '@/constants/colors.json';
import { useLastRead } from '@/hooks/Quran/useLastRead';
import { ReadingState } from '@/types/quranLogs';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface ContinueReadingCardProps {
  onPress: (lastRead: ReadingState | null) => void;
}

/**
 * Dashboard card showing the user's last read Quran position.
 * Falls back to Al-Fatiha • Ayah 1 when no data is saved yet.
 */
export default function ContinueReadingCard({ onPress }: ContinueReadingCardProps) {
  const { lastRead, loading } = useLastRead();

  return (
    <TouchableOpacity
      onPress={() => lastRead?.surahName ? onPress(lastRead) : null}
      className="w-[48%] bg-emerald-dark rounded-[24px] p-4 border border-white/5 justify-center shadow-lg"
      style={{ minHeight: 110 }}
      accessibilityLabel="Continue reading Quran"
    >
      <View className="flex-row items-center gap-2">
        {/* Icon */}
        <View className="w-[44px] h-[54px] rounded-2xl bg-gold/10 items-center justify-center">
          <Ionicons name="book" size={22} color={colors.gold} />
        </View>

        {/* Text */}
        <View className="flex-1">
          <Text className="text-white font-bold text-[12px] tracking-widest leading-tight mb-1.5">
            LAST READ
          </Text>

          {loading ? (
            <>
              <View className="w-16 h-2.5 bg-white/10 rounded mb-1" />
              <View className="w-10 h-2 bg-white/5 rounded" />
            </>
          ) : (
            <>
              <Text className="text-white/60 text-[10px] mb-0.5" numberOfLines={1}>
                {lastRead?.surahName || "None yet"}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-gold text-[11px] font-semibold">
                  Ayah {lastRead?.ayahNumber || '-'}
                </Text>
                {lastRead?.ayahNumber && <Ionicons name="chevron-forward" size={10} color={colors.gold} style={{ marginLeft: 2 }} />}
              </View>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
