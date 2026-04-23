import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';
import React from 'react';
import { View } from 'react-native';
import Toast from 'react-native-toast-message';
import { DeviceSync } from './components/DeviceSync';
import { AuthProvider } from './context/AuthProvider';
import "./global.css";
import AppNavigator from './navigation/AppNavigator';

// Register components for NativeWind support
cssInterop(LinearGradient, {
    className: 'style',
});
cssInterop(Ionicons, {
    className: 'style',
});
cssInterop(FontAwesome5, {
    className: 'style',
});
cssInterop(MaterialCommunityIcons, {
    className: 'style',
});



export default function App() {
    return (
        <View style={{ flex: 1 }}>
            <AuthProvider>
                <DeviceSync />
                <AppNavigator />
                <Toast />
            </AuthProvider>
        </View>
    );
}