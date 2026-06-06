import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '@/constants/colors.json';
import { useBookmarks } from '@/hooks/Quran/useBookmarks';
import { Bookmark } from '@/types/quranLogs';

function BookmarkItem({ item, onPress, onRemove }: {
  item: Bookmark;
  onPress: () => void;
  onRemove: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: colors['emerald-dark'],
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* Gold accent */}
      <View
        style={{
          width: 3,
          borderRadius: 2,
          backgroundColor: colors.gold,
          alignSelf: 'stretch',
          marginRight: 14,
          opacity: 0.7,
        }}
      />

      {/* Ayah badge */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: `${colors.gold}18`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}
      >
        <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '800' }}>
          {item.ayahNumber}
        </Text>
      </View>

      {/* Labels */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginBottom: 3 }}>
          SURAH • AYAH
        </Text>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
          {item.surahName}
        </Text>
        <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '600', marginTop: 1 }}>
          Ayah {item.ayahNumber}
        </Text>
      </View>

      {/* Remove */}
      <TouchableOpacity
        onPress={onRemove}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel="Remove bookmark"
      >
        <Ionicons name="bookmark" size={18} color={colors.gold} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

/**
 * Full-screen Saved Ayahs list.
 * Tapping an item navigates to the Quran screen with that surah pre-selected.
 */
export default function BookmarksScreen() {
  const navigation = useNavigation<any>();
  const { bookmarks, loading, toggle } = useBookmarks();

  const handleOpenAyah = (item: Bookmark) => {
    // Navigate to Quran tab — QuranScreen will pick up the surah from the dropdown.
    // We pass surahNumber so the screen can pre-select it.
    navigation.navigate('Main', {
      screen: 'Quran',
      params: { surahNumber: item.surahNumber, ayahNumber: item.ayahNumber },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors['emerald-darkest'] }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 24,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.05)',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ marginRight: 14 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.gold} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
            Saved Verses
          </Text>
          {!loading && (
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
              {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
            </Text>
          )}
        </View>

        <View
          style={{
            backgroundColor: `${colors.gold}18`,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Ionicons name="bookmark" size={16} color={colors.gold} />
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : bookmarks.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: `${colors.gold}12`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <Ionicons name="bookmark-outline" size={32} color={colors.gold} />
          </View>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
            No Bookmarks Yet
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
            Tap the bookmark icon on any ayah while reading to save it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => `${item.surahNumber}_${item.ayahNumber}`}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <BookmarkItem
              item={item}
              onPress={() => handleOpenAyah(item)}
              onRemove={() => toggle(item.surahNumber, item.surahName, item.ayahNumber)}
            />
          )}
        />
      )}
    </View>
  );
}
