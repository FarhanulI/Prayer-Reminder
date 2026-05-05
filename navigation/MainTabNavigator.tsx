import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

import DashboardScreen from "../screens/Dashboard/DashboardScreen";
import QuranScreen from "../screens/Quran/QuranScreen";
import SettingsScreen from "../screens/SettingsScreen";
import StreaksScreen from "../screens/StreaksScreen";

const Tab = createBottomTabNavigator();

// Custom Tab Bar to match the design
function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View
      className="flex-row items-center justify-between bg-[#141d17] border-t border-white/5 px-6 pb-8 pt-4"
      style={{
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName = "";
        let IconComponent: any = Ionicons;

        if (route.name === "Home") {
          iconName = "mosque";
          IconComponent = FontAwesome5;
        } else if (route.name === "Progress") {
          iconName = "trending-up";
        } else if (route.name === "Quran") {
          iconName = "book-outline";
        } else if (route.name === "Settings") {
          iconName = "settings-outline";
        }

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            className={`items-center justify-center py-3 px-6 rounded-2xl ${isFocused ? 'bg-[#182a1d]' : ''}`}
            style={{ minWidth: 80 }}
          >
            <IconComponent
              name={iconName}
              size={22}
              color={isFocused ? "#dbb142" : "rgba(255,255,255,0.4)"}
              style={{ marginBottom: 4 }}
            />
            <Text
              className={`text-[10px] font-bold tracking-widest ${isFocused ? 'text-[#dbb142]' : 'text-white/40'}`}
              style={{ textTransform: 'uppercase' }}
            >
              {route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Quran" component={QuranScreen} />
      <Tab.Screen name="Progress" component={StreaksScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
