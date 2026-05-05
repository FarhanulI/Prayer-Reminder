import { useAuthContext } from '@/context/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import * as Location from "expo-location";
import { DocumentData } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface HeaderProps {
    profile: DocumentData | null | undefined;
}


export default function Header({ profile }: HeaderProps) {
    const { logout } = useAuthContext();

    const [locationName, setLocationName] = useState<string>("Locating...");


    useEffect(() => {
        const fetchLocationName = async () => {
            if (profile?.location) {

                try {
                    const { latitude, longitude } = profile.location;
                    const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });

                    if (result) {
                        const name = [result?.city || result.subregion || result.region, result.country].filter(Boolean).join(", ");
                        setLocationName(name || "Unknown Location");
                    }
                } catch (error) {
                    console.error("Error reverse geocoding:", error);
                    setLocationName("Unknown Location");
                }
            }
        };

        fetchLocationName();
    }, [profile?.location]);

    return (
        <View className="flex-row justify-between items-center mb-8">
            <View>
                <View className="flex-row items-center">
                    <Ionicons name="location" size={10} color="rgba(255,255,255,0.4)" style={{ marginRight: 4 }} />
                    <Text className="text-white/40 text-[11px] font-bold uppercase tracking-widest">{locationName}</Text>
                </View>
                <Text className="text-white text-xl font-bold">{profile?.name || "User"}</Text>
            </View>
            <View className="flex-row items-center">
                {/* <TouchableOpacity className="bg-white/5 p-2 rounded-full mr-3">
                    <Ionicons name="notifications-outline" size={20} color="white" />
                </TouchableOpacity> */}
                <TouchableOpacity onPress={logout} className="bg-white/5 p-2 rounded-full">
                    <Ionicons name="log-out-outline" size={20} color="#ff4d4d" />
                </TouchableOpacity>
            </View>
        </View>
    );
}