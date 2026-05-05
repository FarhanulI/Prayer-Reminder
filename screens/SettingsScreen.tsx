import { useAuthContext } from "@/context/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function SettingsScreen() {
  const { logout } = useAuthContext();

  return (
    <View className="flex-1 bg-[#0d1410]">
      <ScrollView contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 24 }}>
        <Text className="text-white text-2xl font-bold mb-8" style={{ fontFamily: 'serif' }}>Settings</Text>

        <View className="bg-[#141d17] border border-white/5 rounded-[24px] p-5 mb-6">
          <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-white/5">
            <View className="flex-row items-center">
              <Ionicons name="person-outline" size={20} color="white" />
              <Text className="text-white font-medium ml-3">Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="white" opacity={0.5} />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-white/5">
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={20} color="white" />
              <Text className="text-white font-medium ml-3">Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="white" opacity={0.5} />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center">
              <Ionicons name="lock-closed-outline" size={20} color="white" />
              <Text className="text-white font-medium ml-3">Privacy & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="white" opacity={0.5} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={logout}
          className="bg-red-500/10 border border-red-500/30 py-4 rounded-2xl items-center flex-row justify-center"
        >
          <Ionicons name="log-out-outline" size={20} color="#ff4d4d" />
          <Text className="text-[#ff4d4d] font-bold ml-2">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
