import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  AppState,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import colors from "@/constants/colors.json";

type Permission = {
  key: string;
  icon: string;
  title: string;
  description: string;
  granted: boolean;
  onPress: () => void;
};

export default function PrayerLockSetupScreen({ onComplete }: { onComplete: () => void }) {
  const [permissions, setPermissions] = useState({ usage: false, overlay: false });

  const checkPermissions = async () => {
    if (Platform.OS !== "android") {
      onComplete();
      return;
    }
    try {
      const { hasUsageStatsPermission, hasOverlayPermission } = await import("../modules/prayer-lock");
      setPermissions({
        usage: hasUsageStatsPermission(),
        overlay: hasOverlayPermission(),
      });
    } catch {
      // Native module not yet built — skip in development
      onComplete();
    }
  };

  useEffect(() => {
    checkPermissions();

    // Re-check every time user returns from settings
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkPermissions();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (permissions.usage && permissions.overlay) {
      setTimeout(onComplete, 600);
    }
  }, [permissions]);

  const requestUsage = async () => {
    const { openUsageAccessSettings } = await import("../modules/prayer-lock");
    openUsageAccessSettings();
  };

  const requestOverlay = async () => {
    const { requestOverlayPermission } = await import("../modules/prayer-lock");
    requestOverlayPermission();
  };

  const permissionItems = [
    {
      icon: "stats-chart-outline",
      title: "Usage Access",
      description: "Allows Prayer Lock to detect when you open distracting apps during prayer time.",
      granted: permissions.usage,
      onPress: requestUsage,
    },
    {
      icon: "layers-outline",
      title: "Display Over Other Apps",
      description: "Allows Prayer Lock to show the prayer reminder overlay on top of any app.",
      granted: permissions.overlay,
      onPress: requestOverlay,
    },
  ];

  const allGranted = permissions.usage && permissions.overlay;

  return (
    <LinearGradient colors={[colors['emerald-login-bg-end'], colors['emerald-login-bg']]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 60 }}
      >
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 48 }}>
          <View style={{
            backgroundColor: `${colors.gold}1a`,
            borderWidth: 1,
            borderColor: `${colors.gold}40`,
            borderRadius: 999,
            padding: 20,
            marginBottom: 20,
          }}>
            <Ionicons name="shield-checkmark-outline" size={40} color={colors.gold} />
          </View>
          <Text style={{ color: "#fff", fontSize: 26, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>
            Prayer Lock Setup
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, textAlign: "center", lineHeight: 22 }}>
            Grant these permissions so Prayer Lock can protect your salah time.
          </Text>
        </View>

        {/* Permission Cards */}
        <View style={{ gap: 16, marginBottom: 40 }}>
          {permissionItems.map((item) => (
            <TouchableOpacity
              key={item.title}
              onPress={item.granted ? undefined : item.onPress}
              activeOpacity={item.granted ? 1 : 0.7}
              style={{
                backgroundColor: colors['emerald-dark'],
                borderWidth: 1.5,
                borderColor: item.granted ? `${colors.success}66` : "rgba(255,255,255,0.07)",
                borderRadius: 24,
                padding: 20,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View style={{
                backgroundColor: item.granted ? `${colors.success}1a` : `${colors.gold}1a`,
                borderRadius: 16,
                padding: 12,
                marginRight: 16,
              }}>
                <Ionicons
                  name={item.icon as any}
                  size={24}
                  color={item.granted ? colors.success : colors.gold}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15, marginBottom: 4 }}>
                  {item.title}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 18 }}>
                  {item.description}
                </Text>
              </View>
              <Ionicons
                name={item.granted ? "checkmark-circle" : "chevron-forward"}
                size={22}
                color={item.granted ? colors.success : "rgba(255,255,255,0.3)"}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Skip / Continue */}
        <TouchableOpacity
          onPress={onComplete}
          style={{
            backgroundColor: allGranted ? colors.gold : "rgba(255,255,255,0.05)",
            borderWidth: 1,
            borderColor: allGranted ? colors.gold : "rgba(255,255,255,0.1)",
            borderRadius: 20,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: allGranted ? colors['emerald-login-bg-end'] : "rgba(255,255,255,0.4)", fontWeight: "700", fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}>
            {allGranted ? "✓  All Set" : "Skip for now"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}
