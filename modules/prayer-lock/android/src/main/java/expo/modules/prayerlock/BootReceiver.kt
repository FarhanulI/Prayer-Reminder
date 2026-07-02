package expo.modules.prayerlock

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Listens for BOOT_COMPLETED and MY_PACKAGE_REPLACED broadcasts so that
 * PrayerLockService is automatically restarted after:
 *   - The device boots up
 *   - The app is updated (which kills the running service)
 *
 * Without this receiver, closing the app for 6+ hours or rebooting means
 * the foreground service never starts again and no blocking / notifications occur.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return

        if (
            action == Intent.ACTION_BOOT_COMPLETED ||
            action == "android.intent.action.LOCKED_BOOT_COMPLETED" ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED
        ) {
            Log.d("PrayerLockBoot", "Received: $action — restarting PrayerLockService")

            val prefs = context.getSharedPreferences("PrayerLockPrefs", Context.MODE_PRIVATE)

            // Only restart if prayer lock was enabled before the phone shut down
            val isEnabled = prefs.getString("prayer_lock_enabled", "true") != "false"
            if (!isEnabled) {
                Log.d("PrayerLockBoot", "Prayer lock disabled — skipping restart")
                return
            }

            val serviceIntent = Intent(context, PrayerLockService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
                Log.d("PrayerLockBoot", "PrayerLockService started successfully")
            } catch (e: Exception) {
                Log.e("PrayerLockBoot", "Failed to start PrayerLockService", e)
            }
        }
    }
}
