package expo.modules.prayerlock

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class PrayerLockModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PrayerLock")

    Function("getForegroundApp") {
      val context = appContext.reactContext ?: return@Function null

      val usageStatsManager =
        context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

      val endTime = System.currentTimeMillis()
      val beginTime = endTime - 1000 * 30

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
          endTime - 1000 * 60 * 10,
          endTime
        )

        if (stats != null && stats.isNotEmpty()) {
          val mostRecent = stats.maxByOrNull { it.lastTimeUsed }
          foregroundApp = mostRecent?.packageName
        }
      }

      return@Function foregroundApp
    }

    Function("hasUsageStatsPermission") {
      val context = appContext.reactContext ?: return@Function false

      val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager

      val mode = appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName
      )

      return@Function (mode == AppOpsManager.MODE_ALLOWED)
    }

    Function("openUsageAccessSettings") {
      appContext.reactContext?.let { context ->
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }

      return@Function true
    }

    Function("hasOverlayPermission") {
      val context = appContext.reactContext ?: return@Function false
      return@Function Settings.canDrawOverlays(context)
    }

    Function("requestOverlayPermission") {
      appContext.reactContext?.let { context ->
        if (!Settings.canDrawOverlays(context)) {
          val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + context.packageName)
          )
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          context.startActivity(intent)
        }
      }

      return@Function true
    }

    Function("triggerOverlay") {
      appContext.reactContext?.let { context ->
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)

        intent?.let {
          it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
          it.putExtra("isPrayerOverlay", true)
          context.startActivity(it)
        }
      }

      return@Function true
    }

    Function("syncPrayers") { prayersJson: String ->
      appContext.reactContext?.let { context ->
        val prefs =
          context.getSharedPreferences("PrayerLockPrefs", Context.MODE_PRIVATE)

        prefs.edit()
          .putString("prayers", prayersJson)
          // Record when the JS layer last pushed fresh data so the native
          // service can skip blocking if the data is stale (> 24 h old).
          .putLong("last_synced_at", System.currentTimeMillis())
          .commit()
      }

      return@Function true
    }

    // Persist the enabled/disabled state so BootReceiver and WatchdogReceiver
    // know whether to restart the service after the phone reboots or the
    // process is killed by the OS.
    Function("setEnabled") { enabled: Boolean ->
      appContext.reactContext?.let { context ->
        val prefs =
          context.getSharedPreferences("PrayerLockPrefs", Context.MODE_PRIVATE)
        prefs.edit().putString("prayer_lock_enabled", if (enabled) "true" else "false").commit()
      }
      return@Function true
    }

    Function("markPrayerSessionComplete") { prayerName: String, prayerDate: String ->
      appContext.reactContext?.let { context ->
        val prefs =
          context.getSharedPreferences("PrayerLockPrefs", Context.MODE_PRIVATE)

        val sessionKey = "$prayerName|$prayerDate"
        val completedKeys = try {
          org.json.JSONArray(prefs.getString("completed_prayer_keys", "[]") ?: "[]")
        } catch (_: Exception) {
          org.json.JSONArray()
        }

        var alreadyRecorded = false
        for (i in 0 until completedKeys.length()) {
          if (completedKeys.getString(i) == sessionKey) {
            alreadyRecorded = true
            break
          }
        }
        if (!alreadyRecorded) {
          completedKeys.put(sessionKey)
        }

        val prayersJson = prefs.getString("prayers", "[]") ?: "[]"
        val prayers = try {
          org.json.JSONArray(prayersJson)
        } catch (_: Exception) {
          org.json.JSONArray()
        }

        fun getEffectivePrayerDate(prayer: org.json.JSONObject): String {
          val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
          val storedDate = prayer.optString("date", dateFormat.format(Date()))
          val timeStr = prayer.optString("time", "")
          val endStr = prayer.optString("end", "")
          val startParts = timeStr.split(":")
          val endParts = endStr.split(":")

          if (startParts.size != 2 || endParts.size != 2) {
            return storedDate
          }

          return try {
            val startCal = Calendar.getInstance().apply {
              time = dateFormat.parse(storedDate) ?: Date()
              set(Calendar.HOUR_OF_DAY, startParts[0].toInt())
              set(Calendar.MINUTE, startParts[1].toInt())
              set(Calendar.SECOND, 0)
              set(Calendar.MILLISECOND, 0)
            }

            val endCal = Calendar.getInstance().apply {
              time = dateFormat.parse(storedDate) ?: Date()
              set(Calendar.HOUR_OF_DAY, endParts[0].toInt())
              set(Calendar.MINUTE, endParts[1].toInt())
              set(Calendar.SECOND, 0)
              set(Calendar.MILLISECOND, 0)
            }

            // Handle overnight windows: only push end forward.
            // The stored date already represents the correct start date.
            if (endCal.before(startCal)) {
              endCal.add(Calendar.DAY_OF_YEAR, 1)
            }

            storedDate
          } catch (_: Exception) {
            storedDate
          }
        }

        for (i in 0 until prayers.length()) {
          val prayer = prayers.getJSONObject(i)
          if (
            prayer.optString("name") == prayerName &&
            getEffectivePrayerDate(prayer) == prayerDate
          ) {
            prayer.put("isPrayed", true)
            prayer.put("completed", true)
            prayer.put("skipped", false)
          }
        }

        prefs.edit()
          .putString("prayers", prayers.toString())
          .putString("completed_prayer_keys", completedKeys.toString())
          .commit()
      }

      return@Function true
    }

    Function("startService") {
      appContext.reactContext?.let { context ->
        val intent = Intent(context, PrayerLockService::class.java)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
      }

      return@Function true
    }

    Function("stopService") {
      appContext.reactContext?.let { context ->
        val intent = Intent(context, PrayerLockService::class.java)
        context.stopService(intent)
      }

      return@Function true
    }

    Function("wasLaunchedFromOverlay") {
      val activity = appContext.currentActivity ?: return@Function false
      val intent = activity.intent
      return@Function intent?.getBooleanExtra("isPrayerOverlay", false) == true
    }

    Function("syncOverlaySnooze") { untilIso: String? ->
      appContext.reactContext?.let { context ->
        val prefs =
          context.getSharedPreferences("PrayerLockPrefs", Context.MODE_PRIVATE)

        prefs.edit().apply {
          if (untilIso.isNullOrBlank()) {
            remove("overlay_snoozed_until")
          } else {
            putString("overlay_snoozed_until", untilIso)
          }
        }.apply()
      }

      return@Function true
    }

    Function("getOverlayLaunchPayload") {
      val activity = appContext.currentActivity ?: return@Function null
      val intent = activity.intent ?: return@Function null

      if (intent.getBooleanExtra("isPrayerOverlay", false) != true) {
        return@Function null
      }

      val prayerName = intent.getStringExtra("prayerName")
      val prayerEnd = intent.getStringExtra("prayerEnd")
      val prayerDate = intent.getStringExtra("prayerDate")

      intent.removeExtra("isPrayerOverlay")
      intent.removeExtra("prayerName")
      intent.removeExtra("prayerEnd")
      intent.removeExtra("prayerDate")

      if (prayerName.isNullOrBlank() || prayerEnd.isNullOrBlank()) {
        return@Function null
      }

      return@Function mapOf(
        "prayerName" to prayerName,
        "prayerEnd" to prayerEnd,
        "prayerDate" to (prayerDate ?: "")
      )
    }
  }
}