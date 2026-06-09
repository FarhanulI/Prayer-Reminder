import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';

import { useAuthContext } from '@/context/AuthProvider';
import { db } from '@/lib/firebase';
import { PrayerLogDocument, UserDocument } from '@/types';

/**
 * Custom hook to fetch and sync dashboard data (profile and prayer times).
 * Combines TanStack Query for initial fetch/caching and Firebase onSnapshot for real-time updates.
 */
export function useDashboardData(uid: string | null | undefined) {
  const queryClient = useQueryClient();
  const { logout } = useAuthContext();

  // 1. Initial Data Fetching via TanStack Query
  const query = useQuery({
    queryKey: ['dashboard', uid],
    queryFn: async () => {
      // Safety check: if no UID, return null structure
      if (!uid) return { profile: null, prayerData: null, yesterdayData: null };

      const today = dayjs().format('YYYY-MM-DD');
      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

      // Execute fetches in parallel for better performance
      const [profileSnap, prayerSnap, yesterdaySnap] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getDoc(doc(db, 'users', uid, 'prayer_logs', today)),
        getDoc(doc(db, 'users', uid, 'prayer_logs', yesterday))
      ]);

      if (!profileSnap.exists()) {
        await logout();
        return null;
      }

      return {
        profile: profileSnap.exists() ? profileSnap.data() as UserDocument : null,
        prayerData: prayerSnap.exists() ? (prayerSnap.data() as PrayerLogDocument) : null,
        yesterdayData: yesterdaySnap.exists() ? (yesterdaySnap.data() as PrayerLogDocument) : null,
        streaks: profileSnap.exists() ? profileSnap.data()?.streaks : null,
      };
    },
    // Only run the query if a UID is provided
    enabled: !!uid,
    // Optional: set a staleTime so it doesn't refetch on every window focus
    staleTime: 1000 * 60 * 60 * 12,
  });

  // 2. Real-time Firebase Synchronization
  // This effect listens for remote changes and manually updates the React Query cache
  useEffect(() => {
    if (!uid) return;

    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    // Listener for User Profile updates
    const unsubProfile = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        queryClient.setQueryData(['dashboard', uid], (oldData: any) => ({
          ...(oldData ?? {}),
          profile: snap.data() ?? null,
          streaks: snap.data()?.streaks ?? null,
        }));
      } else {
        logout();
      }
    });

    // Listener for Today's Prayer data
    const unsubPrayers = onSnapshot(doc(db, 'users', uid, 'prayer_logs', today), (snap) => {
      if (snap.exists()) {
        queryClient.setQueryData(['dashboard', uid], (oldData: any) => ({
          ...oldData,
          prayerData: snap.data() as PrayerLogDocument,
        }));
      }
    });

    // Listener for Yesterday's Prayer data (useful for daily transitions/streaks)
    const unsubYesterday = onSnapshot(doc(db, 'users', uid, 'prayer_logs', yesterday), (snap) => {
      if (snap.exists()) {
        queryClient.setQueryData(['dashboard', uid], (oldData: any) => ({
          ...oldData,
          yesterdayData: snap.data() as PrayerLogDocument,
        }));
      }
    });

    // Cleanup: Unsubscribe from all listeners when the component unmounts or UID changes
    return () => {
      unsubProfile();
      unsubPrayers();
      unsubYesterday();
    };
  }, [uid, queryClient]);

  return query;
}