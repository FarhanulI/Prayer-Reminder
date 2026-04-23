import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { useAuthContext } from "../context/AuthProvider";
import DashboardScreen from "../screens/DashboardScreen";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import OnBoardingScreen from "../screens/OnBoardingScreen";


const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuthContext();

  if (loading) return null;

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