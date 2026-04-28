import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { useAuthContext } from "../context/AuthProvider";
import DashboardScreen from "../screens/Dashboard/DashboardScreen";
import LoginScreen from "../screens/LoginScreen";
import OnBoardingScreen from "../screens/OnBoardingScreen";
import SignupScreen from "../screens/SignupScreen";
import { View, ActivityIndicator } from "react-native";


const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d1410', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#dbb142" />
      </View>
    );
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