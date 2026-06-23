import { FirebaseError } from "firebase/app";
import {
  doc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Stricter patch type for prayer log documents (Fix #10).
 * Allows dotted field paths (e.g. "prayers.fajr.isPrayed") as well as
 * top-level fields like prayerCount.
 */
export type PrayerLogPatch = Partial<{
  prayerCount: ReturnType<typeof increment>;
  [dottedPath: string]:
  | boolean
  | string
  | number
  | null
  | ReturnType<typeof increment>
  | ReturnType<typeof serverTimestamp>;
}>;

// ─── Upsert helper ────────────────────────────────────────────────────────────

/**
 * Attempts an `updateDoc`; falls back to a merged `setDoc` **only** when
 * the document does not exist yet (Firestore error code "not-found").
 *
 * All other errors (network, permissions, invalid data) are re-thrown so the
 * caller can handle them explicitly — previously a bare `catch` would silently
 * swallow those failures (Fix #2).
 */
export async function upsertPrayerLog(
  uid: string,
  date: string,
  patch: PrayerLogPatch,
): Promise<void> {
  const ref = doc(db, "users", uid, "prayer_logs", date);
  try {
    await updateDoc(ref, patch);
  } catch (error) {
    // Only fall back to setDoc when the document genuinely doesn't exist yet.
    if (
      error instanceof FirebaseError &&
      error.code === "not-found"
    ) {
      // setDoc with merge:true does not accept dotted paths — expand them first.
      const expandedPatch: Record<string, unknown> = {};
      for (const key of Object.keys(patch)) {
        const parts = key.split(".");
        let current = expandedPatch;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (i === parts.length - 1) {
            current[part] = patch[key as keyof PrayerLogPatch];
          } else {
            current[part] = (current[part] as Record<string, unknown>) || {};
            current = current[part] as Record<string, unknown>;
          }
        }
      }
      await setDoc(ref, expandedPatch, { merge: true });
    } else {
      // Network failure, permission error, invalid data, etc. — propagate.
      throw error;
    }
  }
}
