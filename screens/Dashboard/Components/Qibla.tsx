import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

const toRadians = (deg: number) => deg * (Math.PI / 180);
const toDegrees = (rad: number) => rad * (180 / Math.PI);

const calculateQiblaBearing = (
    userLat: number,
    userLng: number
): number => {
    const lat1 = toRadians(userLat);
    const lon1 = toRadians(userLng);
    const lat2 = toRadians(KAABA_LAT);
    const lon2 = toRadians(KAABA_LNG);

    const dLon = lon2 - lon1;

    const y = Math.sin(dLon);
    const x =
        Math.cos(lat1) * Math.tan(lat2) -
        Math.sin(lat1) * Math.cos(dLon);

    let bearing = toDegrees(Math.atan2(y, x));

    return (bearing + 360) % 360;
};

const getHeading = (data: any) => {
    let { x, y } = data;
    let angle = Math.atan2(y, x) * (180 / Math.PI);

    if (angle < 0) angle += 360;

    return angle;
};

export default function Qibla() {
    const [qiblaDirection, setQiblaDirection] = useState(0);
    const [heading, setHeading] = useState(0);

    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        getLocation();

        Magnetometer.setUpdateInterval(200);

        const subscription = Magnetometer.addListener((data) => {
            const newHeading = getHeading(data);
            setHeading(newHeading);

            Animated.timing(rotateAnim, {
                toValue: newHeading,
                duration: 100,
                useNativeDriver: true,
            }).start();
        });

        return () => subscription.remove();
    }, []);

    const getLocation = async () => {
        const { status } =
            await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") return;

        const location = await Location.getCurrentPositionAsync({});

        const bearing = calculateQiblaBearing(
            location.coords.latitude,
            location.coords.longitude
        );

        setQiblaDirection(bearing);
    };

    const relativeRotation = qiblaDirection - heading;

    const spin = rotateAnim.interpolate({
        inputRange: [0, 360],
        outputRange: ["0deg", "360deg"],
    });

    return (
        <TouchableOpacity
            className="w-[48%] bg-emerald-dark rounded-[24px] p-4 border border-white/5 justify-center shadow-lg"
            style={{ minHeight: 110 }}
        >
            <View className="flex-row items-center">
                <Animated.View
                    style={{
                        transform: [
                            { rotate: `${relativeRotation}deg` },
                        ],
                    }}
                    className="w-[44px] h-[54px] rounded-2xl bg-gold/10 items-center justify-center mr-3"
                >
                    <Ionicons
                        name="navigate"
                        size={24}
                    // color={Colors.gold}
                    />
                </Animated.View>

                <View className="flex-1">
                    <Text className="text-white font-bold text-[12px] tracking-widest leading-tight mb-1.5">
                        QIBLA
                    </Text>

                    <Text className="text-white/60 text-[10px] mb-0.5">
                        Direction:
                    </Text>

                    <Text className="text-white text-[11px] font-semibold">
                        {qiblaDirection.toFixed(1)}°
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}