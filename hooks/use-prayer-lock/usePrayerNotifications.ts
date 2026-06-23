import dayjs from "dayjs";
import * as Notifications from "expo-notifications";
import { useEffect, useMemo, useRef } from "react";
import { Prayer } from "./utils/prayer.helpers";

/**
 * Schedules local notifications for upcoming prayers and tracks their IDs
 * so only those specific notifications are cancelled on cleanup — avoiding
 * accidental removal of notifications created elsewhere in the app (Fix #6).
 *
 * The effect only re-runs when the scheduling-relevant fields actually change
 * (name, time, date, isPrayed, skipped), preventing duplicate notifications
 * caused by new array references from re-renders.
 */
export function usePrayerNotifications(prayers: Prayer[]) {
  /** IDs of notifications scheduled by this hook instance. */
  const scheduledIdsRef = useRef<string[]>([]);

  /**
   * Stable key derived from only the fields that affect notification scheduling.
   * This prevents the effect from re-firing when the parent re-renders but the
   * prayer data hasn't actually changed.
   */
  const prayersKey = useMemo(
    () =>
      prayers
        .map((p) => `${p.name}|${p.date ?? ""}|${p.time ?? ""}|${p.isPrayed}|${p.skipped}`)
        .join(","),
    [prayers],
  );

  useEffect(() => {
    const schedule = async () => {
      // Cancel only the notifications this hook previously scheduled
      const prevIds = scheduledIdsRef.current;
      scheduledIdsRef.current = [];

      await Promise.all(
        prevIds.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
        ),
      );

      const now = dayjs();
      const newIds: string[] = [];

      try {
        for (const prayer of prayers) {
          if (prayer.isPrayed || prayer.skipped || !prayer.time) continue;

          const baseDate = prayer.date ?? now.format("YYYY-MM-DD");
          const prayerTime = dayjs(`${baseDate} ${prayer.time}`);

          if (prayerTime.isAfter(now)) {
            const id = await Notifications.scheduleNotificationAsync({
              content: {
                title: `${prayer.name} Prayer Time`,
                body: `It is now time for ${prayer.name} prayer.`,
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: prayerTime.toDate(),
              },
            });
            newIds.push(id);
          }
        }
      } catch (e) {
        console.warn("[usePrayerNotifications] Failed to schedule notifications:", e);
      }

      scheduledIdsRef.current = newIds;
    };

    schedule();

    return () => {
      // Cancel only this hook's notifications on unmount / re-run
      const ids = scheduledIdsRef.current;
      scheduledIdsRef.current = [];
      Promise.all(
        ids.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
        ),
      );
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prayersKey]); // ← stable string key, not the array reference
}
