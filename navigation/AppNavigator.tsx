import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";

import { useAuthContext } from "../context/AuthProvider";
import DashboardScreen from "../screens/Dashboard/DashboardScreen";
import LoginScreen from "../screens/LoginScreen";
import OnBoardingScreen from "../screens/OnBoardingScreen";
import PrayerLockSetupScreen from "../screens/PrayerLockSetupScreen";
import SignupScreen from "../screens/SignupScreen";

const Stack = createNativeStackNavigator();
const SETUP_DONE_KEY = "prayer_lock_setup_done";

export default function AppNavigator() {
  const { user, loading } = useAuthContext();
  const [setupDone, setSetupDone] = useState<boolean | null>(null);

  useEffect(() => {
    // Only check setup status once user is confirmed & on Android
    if (!user || Platform.OS !== "android") {
      setSetupDone(true);
      return;
    }
    AsyncStorage.getItem(SETUP_DONE_KEY).then((val) => {
      setSetupDone(val === "true");
    });
  }, [user]);

  const handleSetupComplete = async () => {
    await AsyncStorage.setItem(SETUP_DONE_KEY, "true");
    setSetupDone(true);
  };

  if (loading || (user && setupDone === null)) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0d1410", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#dbb142" />
      </View>
    );
  }

  // Show permission setup before the dashboard on first launch
  if (user && !setupDone) {
    return <PrayerLockSetupScreen onComplete={handleSetupComplete} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="OnBoarding" component={OnBoardingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="OnBoarding" component={OnBoardingScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}