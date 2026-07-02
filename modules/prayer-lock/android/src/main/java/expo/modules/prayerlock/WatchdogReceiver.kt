package expo.modules.prayerlock

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Receives the periodic AlarmManager watchdog intent and restarts
 * PrayerLockService if it is not already running.
 *
 * This guards against the service being killed by aggressive battery-saving
 * features on manufacturer-modified Android ROMs (Samsung, Xiaomi, OPPO, etc.)
 * or after the user swipes the app away from recents.
 */
class WatchdogReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "expo.modules.prayerlock.WATCHDOG_RESTART") return

        val prefs = context.getSharedPreferences("PrayerLockPrefs", Context.MODE_PRIVATE)
        val isEnabled = prefs.getString("prayer_lock_enabled", "true") != "false"

        if (!isEnabled) {
            Log.d("PrayerLockWatchdog", "Prayer lock disabled — skipping restart")
            return
        }

        Log.d("PrayerLockWatchdog", "Watchdog fired — ensuring PrayerLockService is running")
        try {
            val serviceIntent = Intent(context, PrayerLockService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.e("PrayerLockWatchdog", "Failed to restart PrayerLockService", e)
        }
    }
}
