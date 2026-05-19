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

        prefs.edit().putString("prayers", prayersJson).commit()
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

        for (i in 0 until prayers.length()) {
          val prayer = prayers.getJSONObject(i)
          if (
            prayer.optString("name") == prayerName &&
            prayer.optString("date") == prayerDate
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