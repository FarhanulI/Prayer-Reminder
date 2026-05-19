import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";

import { useAuthContext } from "../context/AuthProvider";
import LoginScreen from "../screens/LoginScreen";
import OnBoardingScreen from "../screens/OnBoarding/OnBoardingScreen";
import PrayerLockSetupScreen from "../screens/PrayerLockSetupScreen";
import SignupScreen from "../screens/SignupScreen";
import HistoryScreen from "../screens/History/HistoryScreen";
import MilestoneDetailsScreen from "../screens/Milestones/MilestoneDetailsScreen";
import MainTabNavigator from "./MainTabNavigator";

const Stack = createNativeStackNavigator();
const SETUP_DONE_KEY = "prayer_lock_setup_done";

export default function AppNavigator() {
  const { user, loading } = useAuthContext();
  const [setupDone, setSetupDone] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSetupStatus = async () => {
      // 1. If no user is logged in, reset setup status to false
      if (!user) {
        setSetupDone(false);
        return;
      }

      // 2. If user exists but is NOT on Android, skip setup
      if (Platform.OS !== "android") {
        setSetupDone(true);
        return;
      }

      // 3. User is on Android: Check the actual storage
      try {
        const val = await AsyncStorage.getItem(SETUP_DONE_KEY);
        setSetupDone(val === "true");
      } catch (e) {
        // Fallback: if error, assume not done to be safe
        setSetupDone(false);
      }
    };

    checkSetupStatus();
  }, [user]);

  const handleSetupComplete = async () => {
    await AsyncStorage.setItem(SETUP_DONE_KEY, "true");
    setSetupDone(true);
  };

  if (loading || (user && setupDone === null)) {
    return (
      <View className="flex-1 bg-[#0d1410] items-center justify-center">
        <View className="items-center">
          <View className="w-24 h-24 mb-6 items-center justify-center">
            <View className="absolute w-24 h-24 rounded-full border-2 border-[#dbb142]/20" />
            <ActivityIndicator size="large" color="#dbb142" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            {/* Show setup screen as a mandatory first screen if not done on Android */}
            {!setupDone && Platform.OS === "android" ? (
              <Stack.Screen name="PrayerLockSetup">
                {(props) => (
                  <PrayerLockSetupScreen {...props} onComplete={handleSetupComplete} />
                )}
              </Stack.Screen>
            ) : null}
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="MilestoneDetails" component={MilestoneDetailsScreen} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ headerShown: true, headerTitle: "History", headerStyle: { backgroundColor: '#0d1410' }, headerTintColor: '#dbb142' }} />
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