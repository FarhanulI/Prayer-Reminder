package expo.modules.prayerlock

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.work.*
import java.util.concurrent.TimeUnit

/**
 * PrayerLockWorker
 *
 * A periodic WorkManager task that ensures PrayerLockService stays alive.
 * WorkManager persists work across reboots and process kills and respects
 * Doze/App-Standby much better than a bare foreground service alone.
 *
 * Minimum interval is 15 minutes (Android platform constraint). The worker
 * simply checks whether prayer lock is still enabled and restarts the service
 * if needed. This is a safety net on top of the watchdog AlarmManager and the
 * exact prayer-time alarms.
 */
class PrayerLockWorker(
    private val context: Context,
    params: WorkerParameters,
) : Worker(context, params) {

    override fun doWork(): Result {
        val prefs = context.getSharedPreferences("PrayerLockPrefs", Context.MODE_PRIVATE)
        val isEnabled = prefs.getString("prayer_lock_enabled", "true") != "false"

        if (!isEnabled) {
            Log.d(TAG, "Prayer lock disabled — skipping keep-alive")
            return Result.success()
        }

        Log.d(TAG, "Keep-alive check — ensuring PrayerLockService is running")

        try {
            val intent = Intent(context, PrayerLockService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start PrayerLockService", e)
            // Return retry so WorkManager tries again soon.
            return Result.retry()
        }

        return Result.success()
    }

    companion object {
        private const val TAG = "PrayerLockWorker"
        private const val WORK_NAME = "prayer_lock_keep_alive"

        /**
         * Enqueue (or keep) the periodic keep-alive work.
         * Uses KEEP policy so an existing schedule is not reset on every call.
         */
        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<PrayerLockWorker>(
                15, TimeUnit.MINUTES
            )
                .setBackoffCriteria(
                    BackoffPolicy.LINEAR,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )

            Log.d(TAG, "Periodic keep-alive work enqueued (15 min interval)")
        }

        /** Cancel the keep-alive work — call when prayer lock is disabled. */
        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
            Log.d(TAG, "Periodic keep-alive work cancelled")
        }
    }
}
