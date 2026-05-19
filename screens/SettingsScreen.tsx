import { useAuthContext } from "@/context/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Platform, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";

const SETUP_DONE_KEY = "prayer_lock_setup_done";
const PRAYER_LOCK_ENABLED_KEY = "prayer_lock_enabled";

export default function SettingsScreen() {
  const { logout } = useAuthContext();
  const navigation = useNavigation<any>();
  const [setupDone, setSetupDone] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(true);
  const [hasUsageAccess, setHasUsageAccess] = useState(false);
  const [hasOverlayAccess, setHasOverlayAccess] = useState(false);
  // Track if we sent the user to OS settings so we know to re-check on return
  const awaitingPermission = useRef(false);

  const checkNativePermissions = async () => {
    try {
      const { hasUsageStatsPermission, hasOverlayPermission } = await import('../modules/prayer-lock');
      setHasUsageAccess(hasUsageStatsPermission());
      setHasOverlayAccess(hasOverlayPermission());
    } catch (e) {
      console.warn("[Settings] Native module not available:", e);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      const done = await AsyncStorage.getItem(SETUP_DONE_KEY);
      const enabled = await AsyncStorage.getItem(PRAYER_LOCK_ENABLED_KEY);
      setSetupDone(done === "true");
      setLockEnabled(enabled === null || enabled === "true");
      await checkNativePermissions();
    };
    loadSettings();

    // When user returns from the OS permission settings screen, re-check
    // if both permissions are now granted and auto-enable the toggle.
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        await checkNativePermissions();
        if (awaitingPermission.current) {
          awaitingPermission.current = false;
          const { hasUsageStatsPermission, hasOverlayPermission } = await import('../modules/prayer-lock');
          const hasUsage = hasUsageStatsPermission();
          const hasOverlay = hasOverlayPermission();

          if (hasUsage && hasOverlay) {
            // Both permissions granted — enable the lock automatically
            setLockEnabled(true);
            await AsyncStorage.setItem(PRAYER_LOCK_ENABLED_KEY, "true");
          }
        }
      }
    });

    return () => sub.remove();
  }, []);

  const toggleLock = async (value: boolean) => {
    if (value) {
      // Toggling ON — verify Android permissions are still active.
      try {
        const {
          hasUsageStatsPermission,
          hasOverlayPermission,
          openUsageAccessSettings,
          requestOverlayPermission,
        } = await import('../modules/prayer-lock');

        const hasUsage = hasUsageStatsPermission();
        const hasOverlay = hasOverlayPermission();

        if (!hasUsage) {
          awaitingPermission.current = true;
          openUsageAccessSettings();
          return;
        }

        if (!hasOverlay) {
          awaitingPermission.current = true;
          requestOverlayPermission();
          return;
        }
      } catch (e) {
        console.warn("[Settings] Native module not available:", e);
      }
    }

    setLockEnabled(value);
    await AsyncStorage.setItem(PRAYER_LOCK_ENABLED_KEY, value ? "true" : "false");
  };

  const openPermissionSettings = async (type: 'usage' | 'overlay') => {
    try {
      const { openUsageAccessSettings, requestOverlayPermission } = await import('../modules/prayer-lock');
      awaitingPermission.current = true;
      if (type === 'usage') openUsageAccessSettings();
      else requestOverlayPermission();
    } catch (e) {
      console.warn("[Settings] Failed to open permission settings:", e);
    }
  };

  return (
    <View className="flex-1 bg-[#0d1410]">
      <ScrollView contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 24 }}>
        <Text className="text-white text-2xl font-bold mb-8" style={{ fontFamily: 'serif' }}>Settings</Text>

        {/* Account Section */}
        <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3 ml-1">Account</Text>
        <View className="bg-[#141d17] border border-white/5 rounded-[24px] p-5 mb-6">
          <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-white/5">
            <View className="flex-row items-center">
              <Ionicons name="person-outline" size={20} color="white" />
              <Text className="text-white font-medium ml-3">Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="white" opacity={0.5} />
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-row items-center justify-between py-3"
            onPress={() => navigation.navigate('History')}
          >
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={20} color="white" />
              <Text className="text-white font-medium ml-3">History</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="white" opacity={0.5} />
          </TouchableOpacity>
        </View>

        {/* Prayer Lock Section (Android Only & If Setup Done) */}
        {Platform.OS === 'android' && setupDone && (
          <>
            <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3 ml-1">Focus Mode</Text>
            <View className="bg-[#141d17] border border-white/5 rounded-[24px] p-5 mb-6">
              <View className="flex-row items-center justify-between py-1">
                <View className="flex-row items-center flex-1 pr-4">
                  <View className="bg-[#dbb142]/10 p-2.5 rounded-xl mr-3">
                    <Ionicons name="lock-closed-outline" size={20} color="#dbb142" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">Prayer Lock</Text>
                    <Text className="text-white/40 text-[11px] mt-0.5">Restrict distracting apps during salah</Text>
                  </View>
                </View>
                <Switch
                  value={lockEnabled}
                  onValueChange={toggleLock}
                  trackColor={{ false: "#1f2923", true: "#dbb142" }}
                  // @ts-ignore
                  thumbColor={Platform.OS === 'ios' ? '#fff' : lockEnabled ? '#fff' : '#88988a'}
                />
              </View>
            </View>

            {/* System Permissions Management */}
            <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3 ml-1">System Permissions</Text>
            <View className="bg-[#141d17] border border-white/5 rounded-[24px] p-5 mb-6">
              {/* Usage Access */}
              <View className="flex-row items-center justify-between py-3 border-b border-white/5">
                <View className="flex-row items-center">
                  <View className={`w-2 h-2 rounded-full mr-3 ${hasUsageAccess ? 'bg-[#dbb142]' : 'bg-red-500'}`} />
                  <View>
                    <Text className="text-white font-medium">Usage Access</Text>
                    <Text className="text-white/40 text-[10px]">Required to detect apps</Text>
                  </View>
                </View>
                {!hasUsageAccess && (
                  <TouchableOpacity
                    onPress={() => openPermissionSettings('usage')}
                    className="bg-[#dbb142]/10 border border-[#dbb142]/30 px-3 py-1.5 rounded-lg"
                  >
                    <Text className="text-[#dbb142] text-[10px] font-bold uppercase">Enable</Text>
                  </TouchableOpacity>
                )}
                {hasUsageAccess && <Ionicons name="checkmark-circle" size={18} color="#dbb142" />}
              </View>

              {/* Overlay Permission */}
              <View className="flex-row items-center justify-between py-3">
                <View className="flex-row items-center">
                  <View className={`w-2 h-2 rounded-full mr-3 ${hasOverlayAccess ? 'bg-[#dbb142]' : 'bg-red-500'}`} />
                  <View>
                    <Text className="text-white font-medium">Display Over Apps</Text>
                    <Text className="text-white/40 text-[10px]">Required for the lock screen</Text>
                  </View>
                </View>
                {!hasOverlayAccess && (
                  <TouchableOpacity
                    onPress={() => openPermissionSettings('overlay')}
                    className="bg-[#dbb142]/10 border border-[#dbb142]/30 px-3 py-1.5 rounded-lg"
                  >
                    <Text className="text-[#dbb142] text-[10px] font-bold uppercase">Enable</Text>
                  </TouchableOpacity>
                )}
                {hasOverlayAccess && <Ionicons name="checkmark-circle" size={18} color="#dbb142" />}
              </View>
            </View>
          </>
        )}

        {/* Security Section */}
        <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3 ml-1">Privacy</Text>
        <View className="bg-[#141d17] border border-white/5 rounded-[24px] p-5 mb-8">
          <TouchableOpacity className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark-outline" size={20} color="white" />
              <Text className="text-white font-medium ml-3">Privacy & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="white" opacity={0.5} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={logout}
          className="bg-red-500/10 border border-red-500/30 py-4 rounded-2xl items-center flex-row justify-center mb-10"
        >
          <Ionicons name="log-out-outline" size={20} color="#ff4d4d" />
          <Text className="text-[#ff4d4d] font-bold ml-2">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
