package expo.modules.prayerlock

import android.app.*
import android.app.AlarmManager
import android.app.PendingIntent
import android.app.usage.UsageStatsManager
import android.app.usage.UsageEvents
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import java.util.*
import java.text.SimpleDateFormat
import org.json.JSONArray
import org.json.JSONObject

class PrayerLockService : Service() {

    private val handler = Handler(Looper.getMainLooper())
    private var runnable: Runnable? = null

    private val NOTIFICATION_ID = 101
    private val CHANNEL_ID = "prayer_lock_service_channel"

    /**
     * If the JS layer hasn't synced prayers in more than this many milliseconds,
     * treat the stored prayer data as stale and skip blocking until fresh data
     * arrives. This prevents false negatives when the app has been closed for
     * 6+ hours and the stored times belong to a previous day.
     *
     * 26 hours gives a full day's worth of slack so the service still blocks
     * correctly if the user closes the app mid-day and reopens it the same night.
     */
    private val STALE_THRESHOLD_MS = 26 * 60 * 60 * 1000L // 26 hours

    /**
     * How often (ms) the AlarmManager watchdog re-fires to ensure this service
     * is still running. 15 min is the minimum interval Android allows for
     * inexact repeating alarms.
     */
    private val WATCHDOG_INTERVAL_MS = 15 * 60 * 1000L // 15 minutes

    private val BLOCKED_APPS = listOf(
        "com.instagram.android",
        "com.facebook.katana",
        "com.twitter.android",
        "com.google.android.youtube",
        "com.zhiliaoapp.musically",
        "com.snapchat.android",
        "com.reddit.frontpage",
        "com.netflix.mediaclient",
        "com.android.settings"
    )

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        val notification = createNotification("Monitoring for prayer distractions")
        startForeground(NOTIFICATION_ID, notification)

        // Enqueue the WorkManager keep-alive task so the service is restarted
        // even if both the foreground service and the watchdog alarm are killed.
        PrayerLockWorker.schedule(this)

        Log.d("PrayerLockService", "Service started")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startPolling()
        scheduleWatchdog()
        // Re-schedule exact prayer alarms every time the service starts so that
        // after a reboot or crash the alarms are recreated from stored data.
        PrayerAlarmReceiver.schedulePrayerAlarms(this)
        // START_REDELIVER_INTENT: Android will re-deliver the last intent if the
        // service is killed, giving it another chance to restart cleanly.
        return START_REDELIVER_INTENT
    }

    // ── Watchdog ─────────────────────────────────────────────────────────────

    /**
     * Sets a repeating AlarmManager alarm that fires every 15 minutes and
     * sends a broadcast to [WatchdogReceiver]. If the service was killed in
     * between, the receiver restarts it.
     *
     * This is the key mechanism that keeps the service alive on manufacturer
     * ROMs (Samsung, Xiaomi, etc.) that aggressively kill background services.
     */
    private fun scheduleWatchdog() {
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(this, WatchdogReceiver::class.java).apply {
            action = "expo.modules.prayerlock.WATCHDOG_RESTART"
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getBroadcast(this, 0, intent, flags)

        // Use inexact repeating — exact alarms require special permission on API 31+
        // and still don't fire if the app is in Doze. Inexact is a reasonable trade-off.
        alarmManager.setInexactRepeating(
            AlarmManager.RTC_WAKEUP,
            System.currentTimeMillis() + WATCHDOG_INTERVAL_MS,
            WATCHDOG_INTERVAL_MS,
            pendingIntent
        )

        Log.d("PrayerLockService", "Watchdog alarm scheduled every ${WATCHDOG_INTERVAL_MS / 60000} min")
    }

    private fun cancelWatchdog() {
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(this, WatchdogReceiver::class.java).apply {
            action = "expo.modules.prayerlock.WATCHDOG_RESTART"
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getBroadcast(this, 0, intent, flags)
        alarmManager.cancel(pendingIntent)
        Log.d("PrayerLockService", "Watchdog alarm cancelled")
    }

    // ── Polling ───────────────────────────────────────────────────────────────

    private fun startPolling() {
        if (runnable != null) return

        runnable = object : Runnable {
            override fun run() {
                try {
                    checkForegroundApp()
                } catch (e: Exception) {
                    Log.e("PrayerLockService", "Error in polling", e)
                }
                handler.postDelayed(this, 5000)
            }
        }

        handler.post(runnable!!)
    }

    // ── Snooze ────────────────────────────────────────────────────────────────

    private fun isSnoozed(): Boolean {
        val prefs = getSharedPreferences("PrayerLockPrefs", Context.MODE_PRIVATE)
        val snoozedUntil = prefs.getString("overlay_snoozed_until", null) ?: return false

        return try {
            val snoozedTime = parseIso8601(snoozedUntil) ?: return false
            val stillSnoozed = System.currentTimeMillis() < snoozedTime.time
            if (!stillSnoozed) {
                prefs.edit().remove("overlay_snoozed_until").apply()
            }
            stillSnoozed
        } catch (e: Exception) {
            Log.w("PrayerLockService", "Could not parse snooze time: $snoozedUntil", e)
            false
        }
    }

    private fun parseIso8601(value: String): Date? {
        val formats = listOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
            "yyyy-MM-dd'T'HH:mm:ssXXX",
        )
        for (pattern in formats) {
            try {
                val sdf = SimpleDateFormat(pattern, Locale.US)
                sdf.timeZone = TimeZone.getTimeZone("UTC")
                return sdf.parse(value)
            } catch (_: Exception) {
                // try next format
            }
        }
        return null
    }

    // ── Staleness guard ───────────────────────────────────────────────────────

    /**
     * Returns true if the prayer data stored in SharedPreferences is genuinely
     * outdated and should not be used for blocking decisions.
     *
     * Previous behaviour: skip any time the sync timestamp was > 26 h old.
     * Problem: after a 15-hour sleep (< 26 h) this guard did not trigger, yet
     * after a longer absence it would skip valid same-day data.
     *
     * New behaviour:
     * 1. If the data is fresh (< STALE_THRESHOLD_MS) → not stale.
     * 2. If the data is old BUT stored prayers contain today's date → still
     *    valid; the service just hasn't been synced recently (e.g. user slept
     *    with the app closed).  Use it.
     * 3. If the data is old AND no prayer has today's date → genuinely stale
     *    (yesterday's data); skip blocking until the app re-syncs.
     *
     * The JS layer writes `last_synced_at` every time it calls syncPrayers(),
     * so this value is always fresh when the app is open.
     *
     * IMPORTANT: If `last_synced_at` has never been written (= 0, e.g. on
     * existing installs before this field was added), we do NOT treat the data
     * as stale. Blocking will still use getActivePrayer() which checks actual
     * time windows — if those windows haven't passed, blocking works normally.
     */
    private fun isPrayerDataStale(): Boolean {
        val prefs = getSharedPreferences("PrayerLockPrefs", Context.MODE_PRIVATE)
        val lastSynced = prefs.getLong("last_synced_at", 0L)

        // No timestamp recorded yet (fresh install / first launch before this
        // field existed) — do NOT treat as stale; let getActivePrayer() decide.
        if (lastSynced == 0L) {
            return false
        }

        val ageMs = System.currentTimeMillis() - lastSynced

        // Data is fresh — definitely not stale.
        if (ageMs <= STALE_THRESHOLD_MS) return false

        // Data is old. Check if any stored prayer belongs to today.
        // This handles the case where the user sleeps > 26 h with the app
        // closed but the prayer data in SharedPreferences is still for today.
        val prayersJson = prefs.getString("prayers", "[]") ?: "[]"
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val hasTodayPrayer = prayersJson.contains("\"$today\"")

        if (hasTodayPrayer) {
            Log.d(
                "PrayerLockService",
                "Sync timestamp is old (${ageMs / 3600000}h) but stored prayers include today ($today) — continuing"
            )
            return false
        }

        Log.d(
            "PrayerLockService",
            "Prayer data is stale (${ageMs / 3600000}h old, no prayers for $today) — skipping block"
        )
        return true
    }

    // ── Core foreground check ─────────────────────────────────────────────────

    private fun checkForegroundApp() {
        // Skip blocking when prayer data is stale (app closed 6+ hours)
        if (isPrayerDataStale()) return

        val activePrayer = getActivePrayer() ?: return

        if (isSnoozed()) {
            Log.d("PrayerLockService", "Overlay snoozed — skipping trigger")
            return
        }

        val usageStatsManager =
            getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

        val endTime = System.currentTimeMillis()
        val beginTime = endTime - 1000 * 60

        val usageEvents = usageStatsManager.queryEvents(beginTime, endTime)

        var foregroundApp: String? = null
        val event = UsageEvents.Event()

        while (usageEvents.hasNextEvent()) {
            usageEvents.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                foregroundApp = event.packageName
            }
        }

        if (foregroundApp == null) {
            val stats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY,
                endTime - 1000 * 60 * 5,
                endTime
            )

            if (stats != null && stats.isNotEmpty()) {
                foregroundApp = stats.maxByOrNull { it.lastTimeUsed }?.packageName
            }
        }

        if (foregroundApp != null && BLOCKED_APPS.contains(foregroundApp)) {
            Log.d("PrayerLockService", "Blocked app detected: $foregroundApp")
            triggerOverlay(activePrayer)
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun isSessionCompleted(prefs: android.content.SharedPreferences, name: String, date: String): Boolean {
        val sessionKey = "$name|$date"
        return try {
            val completedKeys = JSONArray(prefs.getString("completed_prayer_keys", "[]") ?: "[]")
            for (i in 0 until completedKeys.length()) {
                if (completedKeys.getString(i) == sessionKey) return true
            }
            false
        } catch (_: Exception) {
            false
        }
    }

    private fun getActivePrayer(): JSONObject? {
        val prefs = getSharedPreferences("PrayerLockPrefs", Context.MODE_PRIVATE)
        val prayersJson = prefs.getString("prayers", "[]") ?: "[]"

        return try {
            val prayers = JSONArray(prayersJson)
            val now = Calendar.getInstance()
            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

            for (i in 0 until prayers.length()) {
                val prayer = prayers.getJSONObject(i)

                val isDone = prayer.optBoolean("isPrayed", false) ||
                             prayer.optBoolean("completed", false)

                if (isDone) continue
                if (prayer.optBoolean("skipped", false)) continue

                val prayerDateStr = prayer.optString(
                    "date",
                    dateFormat.format(Date())
                )

                val name = prayer.optString("name", "")
                val timeStr = prayer.optString("time", "")
                val endStr = prayer.optString("end", "")

                val startParts = timeStr.split(":")
                val endParts = endStr.split(":")
                if (startParts.size != 2 || endParts.size != 2) continue

                val startCal = Calendar.getInstance().apply {
                    time = dateFormat.parse(prayerDateStr) ?: Date()
                    set(Calendar.HOUR_OF_DAY, startParts[0].toInt())
                    set(Calendar.MINUTE, startParts[1].toInt())
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }

                val endCal = Calendar.getInstance().apply {
                    time = dateFormat.parse(prayerDateStr) ?: Date()
                    set(Calendar.HOUR_OF_DAY, endParts[0].toInt())
                    set(Calendar.MINUTE, endParts[1].toInt())
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }

                // Handle overnight windows: only push end forward.
                // The stored date already represents the correct start date,
                // so we never subtract a day from startCal.
                if (endCal.before(startCal)) {
                    endCal.add(Calendar.DAY_OF_YEAR, 1)
                }

                val effectiveDate = prayerDateStr
                if (isSessionCompleted(prefs, name, effectiveDate)) continue

                val nowMs = now.timeInMillis
                val startMs = startCal.timeInMillis
                val endMs = endCal.timeInMillis

                val isCurrent = nowMs in startMs until endMs
                if (isCurrent) {
                    prayer.put("date", effectiveDate)
                    return prayer
                }
            }
            null
        } catch (e: Exception) {
            Log.e("PrayerLockService", "Error parsing prayers", e)
            null
        }
    }

    private fun triggerOverlay(activePrayer: JSONObject) {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)

        launchIntent?.let {
            it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            it.putExtra("isPrayerOverlay", true)
            it.putExtra("prayerName", activePrayer.optString("name", ""))
            it.putExtra("prayerEnd", activePrayer.optString("end", ""))
            it.putExtra(
                "prayerDate",
                activePrayer.optString(
                    "date",
                    SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
                )
            )
            startActivity(it)
        }
    }

    // ── Notification channel ──────────────────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Prayer Lock Background Service",
                NotificationManager.IMPORTANCE_LOW
            )

            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(text: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Prayer Lock Active")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .build()
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onDestroy() {
        runnable?.let { handler.removeCallbacks(it) }
        runnable = null
        super.onDestroy()

        Log.d("PrayerLockService", "Service stopped")
    }
}
