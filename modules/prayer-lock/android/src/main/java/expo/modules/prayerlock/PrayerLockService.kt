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
import org.json.JSONArray

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

    private fun checkForegroundApp() {
        if (!isPrayerTime()) return

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
            triggerOverlay()
        }
    }

    private fun isPrayerTime(): Boolean {
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
                             prayer.optBoolean("completed", false) || 
                             prayer.optBoolean("skipped", false)

                if (isDone) continue

                val startParts = prayer.getString("time").split(":")
                val endParts = prayer.getString("end").split(":")

                if (startParts.size != 2 || endParts.size != 2) continue

                val startMins = startParts[0].toInt() * 60 + startParts[1].toInt()
                val endMins = endParts[0].toInt() * 60 + endParts[1].toInt()

                if (endMins < startMins) {
                    if (currentTimeInMins >= startMins || currentTimeInMins < endMins) {
                        return true
                    }
                } else {
                    if (currentTimeInMins in startMins until endMins) {
                        return true
                    }
                }
            }
            false
        } catch (e: Exception) {
            Log.e("PrayerLockService", "Error parsing prayers", e)
            false
        }
    }

    private fun triggerOverlay() {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)

        launchIntent?.let {
            it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            it.putExtra("isPrayerOverlay", true)
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