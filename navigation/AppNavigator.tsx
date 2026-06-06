import colors from "@/constants/colors.json";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Platform, View } from "react-native";

import ForbiddenTimesScreen from "@/screens/ForbiddenTimesScreen";
import BookmarksScreen from "@/screens/Quran/BookmarksScreen";
import { useAuthContext } from "../context/AuthProvider";
import HistoryScreen from "../screens/History/HistoryScreen";
import LoginScreen from "../screens/LoginScreen";
import MilestoneDetailsScreen from "../screens/Milestones/MilestoneDetailsScreen";
import OnBoardingScreen from "../screens/OnBoarding/OnBoardingScreen";
import PrayerLockSetupScreen from "../screens/PrayerLockSetupScreen";
import SignupScreen from "../screens/SignupScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import MainTabNavigator from "./MainTabNavigator";

const Stack = createNativeStackNavigator();
const SETUP_DONE_KEY = "prayer_lock_setup_done";

const SplashScreen = () => (
  <View className="flex-1 bg-emerald-darkest items-center justify-center">
    <View className="items-center">
      <View className="w-24 h-24 mb-6 items-center justify-center">
        {/* <View
          style={{
            position: "absolute",
            width: 96,
            height: 96,
            borderRadius: 48,
            borderWidth: 2,
            borderColor: `${colors.gold}33`,
          }}
        /> */}
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    </View>
  </View>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
  </Stack.Navigator>
);

const OnboardingStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="OnBoarding" component={OnBoardingScreen} />
  </Stack.Navigator>
);

const AppStack = () => {
  const [setupDone, setSetupDone] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSetupStatus = async () => {
      if (Platform.OS !== "android") {
        setSetupDone(true);
        return;
      }
      try {
        const { hasUsageStatsPermission, hasOverlayPermission } = await import("../modules/prayer-lock");
        const usage = hasUsageStatsPermission();
        const overlay = hasOverlayPermission();

        if (usage && overlay) {
          setSetupDone(true);
        } else {
          setSetupDone(false);
        }
      } catch (e) {
        setSetupDone(false);
      }
    };

    checkSetupStatus();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkSetupStatus();
    });

    return () => sub.remove();
  }, []);

  const handleSetupComplete = async () => {
    // If user clicked skip or permissions were fully granted
    setSetupDone(true);
  };

  if (setupDone === null) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!setupDone && Platform.OS === "android" ? (
        <Stack.Screen name="PrayerLockSetup">
          {(props) => (
            <PrayerLockSetupScreen {...props} onComplete={handleSetupComplete} />
          )}
        </Stack.Screen>
      ) : null}
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
      <Stack.Screen name="MilestoneDetails" component={MilestoneDetailsScreen} />
      <Stack.Screen name="Forbidden-times" component={ForbiddenTimesScreen} />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{
          headerShown: true,
          headerTitle: "Seerah (Journey)",
          headerStyle: { backgroundColor: colors['emerald-darkest'] },
          headerTintColor: colors.gold
        }}
      />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
    </Stack.Navigator>
  );
};

const RootNavigator = () => {
  const { authStatus } = useAuthContext();

  switch (authStatus) {
    case "loading":
      return <SplashScreen />;

    case "unauthenticated":
      return <AuthStack />;

    case "onboarding":
      return <OnboardingStack />;

    case "authenticated":
      return <AppStack />;

    default:
      return <SplashScreen />;
  }
};

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}