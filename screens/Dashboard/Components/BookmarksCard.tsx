import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors.json';
import { useBookmarks } from '@/hooks/Quran/useBookmarks';

interface BookmarksCardProps {
  onPress: () => void;
}

/**
 * Dashboard card that shows live bookmark count.
 * Tapping navigates to the Saved Ayahs (Bookmarks) screen.
 */
export default function BookmarksCard({ onPress }: BookmarksCardProps) {
  const { count, loading } = useBookmarks();

  return (
    <TouchableOpacity
      onPress={onPress}
      className="w-[48%] bg-emerald-dark rounded-[24px] p-4 border border-white/5 justify-center shadow-lg"
      style={{ minHeight: 110 }}
      accessibilityLabel="Open saved bookmarks"
    >
      <View className="flex-row items-center">
        {/* Icon */}
        <View className="w-[44px] h-[54px] rounded-2xl bg-gold/10 items-center justify-center mr-3">
          <Ionicons name="bookmark" size={20} color={colors.gold} />
        </View>

        {/* Text */}
        <View className="flex-1">
          <Text className="text-white font-bold text-[12px] tracking-widest leading-tight mb-1.5">
            SAVED{'\n'}VERSES
          </Text>

          {loading ? (
            <View className="w-12 h-2.5 bg-white/10 rounded" />
          ) : (
            <>
              <Text className="text-white/60 text-[10px] mb-0.5">Bookmarks</Text>
              <View className="flex-row items-center">
                <Text className="text-gold text-[11px] font-semibold">
                  {count > 0 ? `Total: ${count}` : 'None yet'}
                </Text>
                {count > 0 && (
                  <Ionicons
                    name="chevron-forward"
                    size={10}
                    color={colors.gold}
                    style={{ marginLeft: 2 }}
                  />
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
