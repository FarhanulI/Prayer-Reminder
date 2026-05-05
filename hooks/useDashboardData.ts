import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';

import { db } from '@/lib/firebase';
import { PrayerCollection } from '@/types';

export function useDashboardData(uid: string | null | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dashboard', uid],
    queryFn: async () => {
      if (!uid) return { profile: null, userData: null, yesterdayData: null };

      const today = dayjs().format('YYYY-MM-DD');
      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

      const profileSnap = await getDoc(doc(db, 'users', uid));
      const prayerSnap = await getDoc(doc(db, 'users', uid, 'prayerTimes', today));
      const yesterdaySnap = await getDoc(doc(db, 'users', uid, 'prayerTimes', yesterday));

      return {
        profile: profileSnap.exists() ? profileSnap.data() : null,
        userData: prayerSnap.exists() ? (prayerSnap.data() as PrayerCollection) : null,
        yesterdayData: yesterdaySnap.exists() ? (yesterdaySnap.data() as PrayerCollection) : null,
      };
    },
    enabled: !!uid,
  });

  // Maintain real-time Firebase sync into React Query cache
  useEffect(() => {
    if (!uid) return;

    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    const unsubProfile = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        queryClient.setQueryData(['dashboard', uid], (oldData: any) => ({
          ...oldData,
          profile: snap.data(),
        }));
      }
    });

    const unsubPrayers = onSnapshot(doc(db, 'users', uid, 'prayerTimes', today), (snap) => {
      if (snap.exists()) {
        queryClient.setQueryData(['dashboard', uid], (oldData: any) => ({
          ...oldData,
          userData: snap.data() as PrayerCollection,
        }));
      }
    });

    const unsubYesterday = onSnapshot(doc(db, 'users', uid, 'prayerTimes', yesterday), (snap) => {
      if (snap.exists()) {
        queryClient.setQueryData(['dashboard', uid], (oldData: any) => ({
          ...oldData,
          yesterdayData: snap.data() as PrayerCollection,
        }));
      }
    });

    return () => {
      unsubProfile();
      unsubPrayers();
      unsubYesterday();
    };
  }, [uid, queryClient]);

  return query;
}
