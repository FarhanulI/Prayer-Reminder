import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { PrayerCollection } from '@/types';

export function useStreaks(uid: string | null | undefined, currentDate: dayjs.Dayjs) {
  return useQuery({
    queryKey: ['streaks', uid, currentDate.format('YYYY-MM-DD')],
    queryFn: async () => {
      if (!uid) return [];

      // Find the start of the week (Monday) based on currentDate
      let startOfWeek = currentDate;
      while (startOfWeek.day() !== 1) {
        startOfWeek = startOfWeek.subtract(1, 'day');
      }

      const promises = [];
      for (let i = 0; i < 7; i++) {
        const dateStr = startOfWeek.add(i, 'day').format('YYYY-MM-DD');
        promises.push(getDoc(doc(db, 'users', uid, 'prayerTimes', dateStr)));
      }

      const snaps = await Promise.all(promises);
      const data = snaps.map((snap, i) => ({
        date: startOfWeek.add(i, 'day'),
        data: snap.exists() ? (snap.data() as PrayerCollection) : null,
      }));

      return data;
    },
    enabled: !!uid, // Only run the query if we have a user ID
  });
}
