import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
} from 'firebase/firestore';

import { Bookmark, ReadingState } from '@/types/quranLogs';
import { db } from './firebase';

// ─── Firestore Path Helpers ───────────────────────────────────────────────────

/**
 * Document path: users/{uid}/quran_logs/readingState
 */
const readingStateRef = (uid: string) =>
  doc(db, 'users', uid, 'quran_logs', 'readingState');

/**
 * Collection path: users/{uid}/quran_bookmarks
 * Each bookmark doc ID is "{surahNumber}_{ayahNumber}" e.g. "2_255"
 */
const bookmarksCol = (uid: string) =>
  collection(db, 'users', uid, 'quran_bookmarks');

const bookmarkDocRef = (uid: string, surahNumber: number, ayahNumber: number) =>
  doc(db, 'users', uid, 'quran_bookmarks', `${surahNumber}_${ayahNumber}`);

// ─── Last Read ────────────────────────────────────────────────────────────────

/**
 * Persist the user's current reading position.
 * Uses setDoc (merge = false) so the document is always an exact snapshot.
 * Silently swallows errors so it never interrupts the reading experience.
 */
export const saveLastRead = async (
  uid: string | undefined,
  surahNumber: number,
  surahName: string,
  ayahNumber: number,
): Promise<void> => {
  try {
    if (!uid) throw new Error("User ID is required");
    await setDoc(readingStateRef(uid), {
      surahNumber,
      surahName,
      ayahNumber,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[QuranLogs] saveLastRead failed:', err);
  }
};

/**
 * Retrieve the user's saved reading position.
 * Returns null if no position has been saved yet.
 */
export const getLastRead = async (uid: string): Promise<ReadingState | null> => {
  try {
    const snap = await getDoc(readingStateRef(uid));
    if (!snap.exists()) return null;
    return snap.data() as ReadingState;
  } catch (err) {
    console.warn('[QuranLogs] getLastRead failed:', err);
    return null;
  }
};

// ─── Bookmarks ────────────────────────────────────────────────────────────────

/**
 * Add a bookmark. Uses a deterministic doc ID to prevent duplicates.
 */
export const addBookmark = async (
  uid: string,
  surahNumber: number,
  surahName: string,
  ayahNumber: number,
): Promise<void> => {
  await setDoc(bookmarkDocRef(uid, surahNumber, ayahNumber), {
    surahNumber,
    surahName,
    ayahNumber,
    createdAt: serverTimestamp(),
  });
};

/**
 * Remove a saved bookmark.
 */
export const removeBookmark = async (
  uid: string,
  surahNumber: number,
  ayahNumber: number,
): Promise<void> => {
  await deleteDoc(bookmarkDocRef(uid, surahNumber, ayahNumber));
};

/**
 * Toggle bookmark — adds if absent, removes if present.
 * Returns the new bookmarked state (true = now bookmarked).
 */
export const toggleBookmark = async (
  uid: string,
  surahNumber: number,
  surahName: string,
  ayahNumber: number,
  currentlyBookmarked: boolean,
): Promise<boolean> => {
  if (currentlyBookmarked) {
    await removeBookmark(uid, surahNumber, ayahNumber);
    return false;
  }
  await addBookmark(uid, surahNumber, surahName, ayahNumber);
  return true;
};

/**
 * One-time fetch of all bookmarks, ordered by most recently saved first.
 */
export const getBookmarks = async (uid: string): Promise<Bookmark[]> => {
  try {
    const snap = await getDocs(
      query(bookmarksCol(uid), orderBy('createdAt', 'desc')),
    );
    return snap.docs.map((d) => d.data() as Bookmark);
  } catch (err) {
    console.warn('[QuranLogs] getBookmarks failed:', err);
    return [];
  }
};

/**
 * Check if a specific ayah is bookmarked (one-time read).
 */
export const isBookmarked = async (
  uid: string,
  surahNumber: number,
  ayahNumber: number,
): Promise<boolean> => {
  try {
    const snap = await getDoc(bookmarkDocRef(uid, surahNumber, ayahNumber));
    return snap.exists();
  } catch {
    return false;
  }
};

/**
 * Subscribe to real-time bookmark list changes.
 * Call the returned unsubscribe function to clean up.
 */
export const subscribeToBookmarks = (
  uid: string,
  onChange: (bookmarks: Bookmark[]) => void,
): Unsubscribe => {
  return onSnapshot(
    query(bookmarksCol(uid), orderBy('createdAt', 'desc')),
    (snap) => onChange(snap.docs.map((d) => d.data() as Bookmark)),
    (err) => console.warn('[QuranLogs] subscribeToBookmarks error:', err),
  );
};
