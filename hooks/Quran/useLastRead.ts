import { useAuthContext } from '@/context/AuthProvider';
import { getLastRead, saveLastRead } from '@/lib/quranLogs.service';
import { ReadingState } from '@/types/quranLogs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

/**
 * Hook for tracking and persisting the user's last read Quran position.
 */
export const useLastRead = () => {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Fetching Logic
  const { data: lastRead, isLoading: loading } = useQuery({
    queryKey: ['lastRead', user?.profile?.uid],
    queryFn: () => (user?.profile?.uid ? getLastRead(user?.profile?.uid) : null),
    enabled: !!user?.profile?.uid, // Only run if user exists
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 mins
  });

  // 2. Mutation Logic (The "Save" action)
  const { mutate } = useMutation({
    mutationFn: (vars: { surahNumber: number; surahName: string; ayahNumber: number }) =>
      saveLastRead(user?.profile?.uid, vars.surahNumber, vars.surahName, vars.ayahNumber),
    onMutate: async (newPosition) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['lastRead', user?.profile?.uid] });

      const previousState = queryClient.getQueryData<ReadingState>(['lastRead', user?.profile?.uid]);

      // Optimistically update the cache
      queryClient.setQueryData(['lastRead', user?.profile?.uid], {
        ...previousState,
        ...newPosition,
        updatedAt: new Date().toISOString(),
      });

      return { previousState };
    },
    onError: (err, newPosition, context) => {
      // Rollback if the save fails
      queryClient.setQueryData(['lastRead', user?.profile?.uid], context?.previousState);
    },
    onSettled: () => {
      // Invalidate to sync with server truth after mutation completes
      queryClient.invalidateQueries({ queryKey: ['lastRead', user?.profile?.uid] });
    },
  });

  // 3. Debounced Wrapper
  const savePosition = useCallback(
    (surahNumber: number, surahName: string, ayahNumber: number) => {
      if (!user?.profile?.uid) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        mutate({ surahNumber, surahName, ayahNumber });
      }, 500);
    },
    [user?.profile?.uid, mutate],
  );

  return {
    lastRead: lastRead ?? null,
    loading,
    savePosition
  };
};