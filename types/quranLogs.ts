import { Timestamp } from 'firebase/firestore';

// ─── Reading State ────────────────────────────────────────────────────────────

/**
 * Stored at: users/{uid}/quran_logs/readingState
 */
export interface ReadingState {
  surahNumber: number;
  surahName: string;  // transliteration e.g. "Al-Kahf"
  ayahNumber: number;
  updatedAt: Timestamp | null;
}

// ─── Bookmark ─────────────────────────────────────────────────────────────────

/**
 * Stored at: users/{uid}/quran_bookmarks/{surahNumber}_{ayahNumber}
 * e.g. users/abc123/quran_bookmarks/2_255
 */
export interface Bookmark {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  createdAt: Timestamp | null;
}
