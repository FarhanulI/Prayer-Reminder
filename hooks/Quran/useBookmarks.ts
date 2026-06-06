import { useAuthContext } from '@/context/AuthProvider';
import { addBookmark, removeBookmark, subscribeToBookmarks } from '@/lib/quranLogs.service';
import { Bookmark } from '@/types/quranLogs';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Hook that manages the full bookmark lifecycle via a real-time Firestore
 * subscription. Applies optimistic UI updates for instant toggle feedback.
 */
export const useBookmarks = () => {
  const { user } = useAuthContext();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time subscription — keeps the list always in sync
  useEffect(() => {
    if (!user?.profile?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToBookmarks(user?.profile?.uid, (data) => {
      setBookmarks(data);
      setLoading(false);
    });
    return unsub;
  }, [user?.profile?.uid]);

  // Build a Set of "surahNumber_ayahNumber" keys for O(1) lookups
  const bookmarkSet = useMemo(
    () => new Set(bookmarks.map((b) => `${b.surahNumber}_${b.ayahNumber}`)),
    [bookmarks],
  );

  /**
   * Returns true if the given ayah is currently bookmarked.
   * Uses in-memory set — no async call needed.
   */
  const isBookmarked = useCallback(
    (surahNumber: number, ayahNumber: number) =>
      bookmarkSet.has(`${surahNumber}_${ayahNumber}`),
    [bookmarkSet],
  );

  /**
   * Toggle bookmark with optimistic UI update.
   * The real-time listener will reconcile any discrepancy after the write.
   */
  const toggle = useCallback(
    async (surahNumber: number, surahName: string, ayahNumber: number) => {
      if (!user?.profile?.uid) return;

      const alreadyBookmarked = bookmarkSet.has(`${surahNumber}_${ayahNumber}`);

      if (alreadyBookmarked) {
        // Optimistic removal
        setBookmarks((prev) =>
          prev.filter(
            (b) => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber),
          ),
        );
        try {
          await removeBookmark(user?.profile?.uid!, surahNumber, ayahNumber);
        } catch {
          // Roll back on failure — real-time listener will restore correct state
        }
      } else {
        // Optimistic addition
        const optimistic: Bookmark = {
          surahNumber,
          surahName,
          ayahNumber,
          createdAt: null,
        };
        setBookmarks((prev) => [optimistic, ...prev]);
        try {
          await addBookmark(user?.profile?.uid!, surahNumber, surahName, ayahNumber);
        } catch {
          // Roll back
          setBookmarks((prev) =>
            prev.filter(
              (b) => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber),
            ),
          );
        }
      }
    },
    [user?.profile?.uid, bookmarkSet],
  );

  return {
    bookmarks,
    loading,
    isBookmarked,
    toggle,
    count: bookmarks.length,
  };
};
