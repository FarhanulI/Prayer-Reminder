import { requireNativeModule } from 'expo-modules-core';

const PrayerLock = requireNativeModule('PrayerLock');

export function getForegroundApp(): string | null {
  return PrayerLock.getForegroundApp();
}

export function hasUsageStatsPermission(): boolean {
  return PrayerLock.hasUsageStatsPermission();
}

export function openUsageAccessSettings(): void {
  PrayerLock.openUsageAccessSettings();
}

export function hasOverlayPermission(): boolean {
  return PrayerLock.hasOverlayPermission();
}

export function requestOverlayPermission(): void {
  PrayerLock.requestOverlayPermission();
}

export function triggerOverlay(): void {
  PrayerLock.triggerOverlay();
}

export function syncPrayers(prayersJson: String): void {
  PrayerLock.syncPrayers(prayersJson);
}

export function startService(): void {
  PrayerLock.startService();
}

export function stopService(): void {
  PrayerLock.stopService();
}

export function wasLaunchedFromOverlay(): boolean {
  return PrayerLock.wasLaunchedFromOverlay();
}

