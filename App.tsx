import {
    FontAwesome5,
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { cssInterop } from "nativewind";
import React from "react";
import { View } from "react-native";
import Toast from "react-native-toast-message";
import { DeviceSync } from "./components/DeviceSync";
import { AuthProvider } from "./context/AuthProvider";
import "./global.css";
import AppNavigator from "./navigation/AppNavigator";
import { AudioProvider } from "./providers/AudioProvider";

// Register components for NativeWind support
cssInterop(LinearGradient, {
  className: "style",
});
cssInterop(Ionicons, {
  className: "style",
});
cssInterop(FontAwesome5, {
  className: "style",
});
cssInterop(MaterialCommunityIcons, {
  className: "style",
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60,
      refetchOnReconnect: true,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AudioProvider>
        <View style={{ flex: 1 }}>
          <AuthProvider>
            <DeviceSync />
            <AppNavigator />
            <Toast />
          </AuthProvider>
        </View>
      </AudioProvider>
    </QueryClientProvider>
  );
}
