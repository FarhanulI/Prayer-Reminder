import { AppBootstrap } from "@/bootstrap/AppBootstrap";
import colors from "@/constants/colors.json";
import ForbiddenTimesScreen from "@/screens/ForbiddenTimesScreen";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, View } from "react-native";

import BookmarksScreen from "@/screens/Quran/BookmarksScreen";
import { useAuthContext } from "../context/AuthProvider";
import HistoryScreen from "../screens/History/HistoryScreen";
import LoginScreen from "../screens/LoginScreen";
import MilestoneDetailsScreen from "../screens/Milestones/MilestoneDetailsScreen";
import OnBoardingScreen from "../screens/OnBoarding/OnBoardingScreen";
import SignupScreen from "../screens/SignupScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import MainTabNavigator from "./MainTabNavigator";

// Single Master Stack used across the entire root file
const Stack = createNativeStackNavigator();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" component={WelcomeScreen} />
      <Stack.Screen name="OnBoarding" component={OnBoardingScreen} />
    </Stack.Navigator>
  );
}

export function MainAppNavigator() {
  const BootstrappedMainTabNavigator = () => (
    <AppBootstrap>
      <MainTabNavigator />
    </AppBootstrap>
  );

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={BootstrappedMainTabNavigator} />

      {/* <Stack.Screen name="Home" component={DashboardScreen} /> */}
      {/* <Stack.Screen name="Quran" component={QuranScreen} />
      <Stack.Screen name="Progress" component={MilestonesScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />*/}
      <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
      <Stack.Screen
        name="MilestoneDetails"
        component={MilestoneDetailsScreen}
      />
      <Stack.Screen name="Forbidden-times" component={ForbiddenTimesScreen} />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{
          headerShown: true,
          headerTitle: "Weekly Progress",
          headerStyle: {
            backgroundColor: colors["emerald-darkest"],
          },
          headerTintColor: colors.gold,
        }}
      />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
    </Stack.Navigator>
  );
}

const SplashScreen = () => (
  <View className="flex-1 bg-emerald-darkest items-center justify-center">
    <View className="items-center">
      <View className="w-24 h-24 mb-6 items-center justify-center">
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    </View>
  </View>
);

const RootNavigator = () => {
  const { authStatus } = useAuthContext();

  if (authStatus === "loading") {
    return <SplashScreen />;
  }

  switch (authStatus) {
    case "unauthenticated":
      return <AuthNavigator />;

    case "onboarding":
      return <OnboardingNavigator />;

    case "authenticated":
      return <MainAppNavigator />;

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
