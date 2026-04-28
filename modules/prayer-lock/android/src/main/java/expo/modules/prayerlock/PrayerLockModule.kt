package expo.modules.prayerlock

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PrayerLockModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PrayerLock")

    Function("getForegroundApp") { ->
      val context = appContext.reactContext ?: return@Function null
      val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val endTime = System.currentTimeMillis()
      val beginTime = endTime - 1000 * 60 * 5

      val usageEvents = usageStatsManager.queryEvents(beginTime, endTime)
      var foregroundApp: String? = null
      val event = UsageEvents.Event()

      while (usageEvents.hasNextEvent()) {
        usageEvents.getNextEvent(event)
        if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
          foregroundApp = event.packageName
        }
      }
      return@Function foregroundApp
    }

    Function("hasUsageStatsPermission") { ->
      val context = appContext.reactContext ?: return@Function false
      val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName
      )
      return@Function mode == AppOpsManager.MODE_ALLOWED
    }

    Function("openUsageAccessSettings") {
      appContext.reactContext?.let { context ->
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
    }

    Function("hasOverlayPermission") { ->
      val context = appContext.reactContext ?: return@Function false
      return@Function Settings.canDrawOverlays(context)
    }

    Function("requestOverlayPermission") {
      appContext.reactContext?.let { context ->
        if (!Settings.canDrawOverlays(context)) {
          val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + context.packageName))
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          context.startActivity(intent)
        }
      }
    }

    Function("triggerOverlay") {
      appContext.reactContext?.let { context ->
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (intent != null) {
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
          intent.putExtra("isPrayerOverlay", true)
          context.startActivity(intent)
        }
      }
    }
  }
}
