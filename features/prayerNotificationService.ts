import * as Notifications from "expo-notifications";

// Module-level variable to keep track of the last notified prayer name.
// This prevents duplicate notifications across re-renders or app resumes.
let previousPrayerName: string | undefined = undefined;

/**
 * Sends a local notification immediately when the active prayer changes.
 * 
 * You can call this method from anywhere (e.g., inside a useEffect when the 
 * active prayer name is calculated). It internally tracks the last prayer
 * it notified for, so it's safe to call repeatedly.
 */
export const sendPrayerNotificationIfNeeded = (
  name: string | undefined,
  title: string | undefined,
  time: string | undefined,
) => {
  if (!name) return;

  // Skip the initial check — we only want to notify on *transitions* to a new prayer,
  // not when the app first opens.
  if (previousPrayerName === undefined) {
    previousPrayerName = name;
    return;
  }

  // Same prayer as before — do nothing.
  if (name === previousPrayerName) return;

  // Update the tracker
  previousPrayerName = name;

  // Fire one immediate notification for the new prayer.
  Notifications.scheduleNotificationAsync({
    content: {
      title: `${name} Prayer Time`,
      body: title?.toLowerCase().includes("current")
        ? `It is now time for ${name} prayer. It began at ${time}.`
        : `${name} prayer begins at ${time}.`,
      sound: true,
    },
    trigger: null, // deliver immediately — no scheduling, no IDs to manage
  }).catch((e) => {
    console.warn("[sendPrayerNotificationIfNeeded] Failed to send notification:", e);
  });
};

/**
 * Optional: Reset the tracker if needed (e.g. on user logout)
 */
export const resetPrayerNotificationTracker = () => {
  previousPrayerName = undefined;
};
