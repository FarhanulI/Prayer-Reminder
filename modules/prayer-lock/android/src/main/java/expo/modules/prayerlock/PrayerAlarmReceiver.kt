package expo.modules.prayerlock

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.*

/**
 * PrayerAlarmReceiver
 *
 * Fired by an exact AlarmManager alarm scheduled for each prayer's start time.
 * Its sole job is to ensure PrayerLockService is running the moment a prayer
 * window opens, even if the phone has been in Doze mode for hours.
 *
 * setExactAndAllowWhileIdle() wakes the CPU at the scheduled time regardless
 * of Doze, which makes it far more reliable than the inexact watchdog alarm.
 */
class PrayerAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION) return

        Log.d(TAG, "Prayer alarm fired — waking PrayerLockService")

        val prefs = context.getSharedPreferences("PrayerLockPrefs", Context.MODE_PRIVATE)
        val isEnabled = prefs.getString("prayer_lock_enabled", "true") != "false"
        if (!isEnabled) {
            Log.d(TAG, "Prayer lock disabled — skipping restart")
            return
        }

        try {
            val serviceIntent = Intent(context, PrayerLockService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start PrayerLockService from alarm", e)
        }
    }

    companion object {
        private const val TAG = "PrayerAlarmReceiver"
        const val ACTION = "expo.modules.prayerlock.PRAYER_ALARM"

        /**
         * Request-code base for prayer alarms so they don't collide with other
         * PendingIntents used elsewhere in the module (watchdog uses 0).
         * We allocate codes 3000–3099 for up to 10 upcoming prayers.
         */
        private const val REQUEST_CODE_BASE = 3000

        /**
         * Parses the prayers JSON currently stored in SharedPreferences and
         * schedules an exact RTC_WAKEUP alarm for each prayer whose start time
         * is still in the future.
         *
         * Called from:
         *  - PrayerLockModule.syncPrayers()  (JS → native sync)
         *  - PrayerLockService.onStartCommand()  (service restart)
         *
         * Uses setExactAndAllowWhileIdle() on API 23+ so alarms fire even while
         * the device is in Doze mode.
         */
        fun schedulePrayerAlarms(context: Context) {
            val prefs = context.getSharedPreferences("PrayerLockPrefs", Context.MODE_PRIVATE)
            val prayersJson = prefs.getString("prayers", "[]") ?: "[]"

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val now = System.currentTimeMillis()

            try {
                val prayers = JSONArray(prayersJson)
                var slot = 0 // slot index → request code = REQUEST_CODE_BASE + slot

                for (i in 0 until prayers.length()) {
                    val prayer = prayers.getJSONObject(i)

                    val isDone = prayer.optBoolean("isPrayed", false) ||
                                 prayer.optBoolean("completed", false)
                    val isSkipped = prayer.optBoolean("skipped", false)
                    if (isDone || isSkipped) continue

                    val prayerDate = prayer.optString(
                        "date",
                        dateFormat.format(Date())
                    )
                    val timeStr = prayer.optString("time", "")
                    val parts = timeStr.split(":")
                    if (parts.size != 2) continue

                    val startCal = Calendar.getInstance().apply {
                        time = try {
                            dateFormat.parse(prayerDate) ?: Date()
                        } catch (_: Exception) { Date() }
                        set(Calendar.HOUR_OF_DAY, parts[0].toIntOrNull() ?: continue)
                        set(Calendar.MINUTE,      parts[1].toIntOrNull() ?: continue)
                        set(Calendar.SECOND, 0)
                        set(Calendar.MILLISECOND, 0)
                    }

                    val alarmTime = startCal.timeInMillis
                    if (alarmTime <= now) continue // window already started or passed

                    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    } else {
                        PendingIntent.FLAG_UPDATE_CURRENT
                    }

                    val pendingIntent = PendingIntent.getBroadcast(
                        context,
                        REQUEST_CODE_BASE + slot,
                        Intent(context, PrayerAlarmReceiver::class.java).apply {
                            action = ACTION
                        },
                        flags
                    )

                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            alarmManager.setExactAndAllowWhileIdle(
                                AlarmManager.RTC_WAKEUP,
                                alarmTime,
                                pendingIntent
                            )
                        } else {
                            alarmManager.setExact(
                                AlarmManager.RTC_WAKEUP,
                                alarmTime,
                                pendingIntent
                            )
                        }

                        Log.d(
                            TAG,
                            "Exact alarm set for ${prayer.optString("name")} at " +
                            "${parts[0]}:${parts[1]} on $prayerDate (slot $slot)"
                        )
                        slot++

                    } catch (e: Exception) {
                        Log.w(TAG, "Could not set exact alarm for ${prayer.optString("name")}: ${e.message}")
                    }
                }

                Log.d(TAG, "Scheduled $slot exact prayer alarms")

            } catch (e: Exception) {
                Log.e(TAG, "Error scheduling prayer alarms", e)
            }
        }
    }
}
