// app.plugin.js — Config Plugin for Prayer Lock
// Automatically adds required Android permissions during expo prebuild

const { withAndroidManifest } = require("@expo/config-plugins");

function withPrayerLockPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest;

    // Add permissions if they don't already exist
    const permissionsToAdd = [
      "android.permission.PACKAGE_USAGE_STATS",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.VIBRATE",
    ];

    if (!mainApplication["uses-permission"]) {
      mainApplication["uses-permission"] = [];
    }

    const existingPermissions = mainApplication["uses-permission"].map(
      (p) => p.$["android:name"]
    );

    permissionsToAdd.forEach((permission) => {
      if (!existingPermissions.includes(permission)) {
        mainApplication["uses-permission"].push({
          $: { "android:name": permission },
        });
      }
    });

    return config;
  });
}

module.exports = withPrayerLockPermissions;
