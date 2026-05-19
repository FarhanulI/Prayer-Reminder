package expo.modules.prayerlock

import android.app.*
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

        Log.d("PrayerLockService", "Service started")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startPolling()
        return START_STICKY
    }

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

    private fun checkForegroundApp() {
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
            val currentTimeInMins =
                now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)

            for (i in 0 until prayers.length()) {
                val prayer = prayers.getJSONObject(i)

                val isDone = prayer.optBoolean("isPrayed", false) ||
                             prayer.optBoolean("completed", false)

                if (isDone) continue

                if (prayer.optBoolean("skipped", false)) continue

                val prayerDate = prayer.optString(
                    "date",
                    SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
                )
                if (isSessionCompleted(prefs, prayer.optString("name", ""), prayerDate)) continue

                val startParts = prayer.getString("time").split(":")
                val endParts = prayer.getString("end").split(":")

                if (startParts.size != 2 || endParts.size != 2) continue

                val startMins = startParts[0].toInt() * 60 + startParts[1].toInt()
                val endMins = endParts[0].toInt() * 60 + endParts[1].toInt()

                val inWindow = if (endMins < startMins) {
                    currentTimeInMins >= startMins || currentTimeInMins < endMins
                } else {
                    currentTimeInMins in startMins until endMins
                }

                if (inWindow) return prayer
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

    override fun onDestroy() {
        runnable?.let { handler.removeCallbacks(it) }
        runnable = null
        super.onDestroy()

        Log.d("PrayerLockService", "Service stopped")
    }
}
