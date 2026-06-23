import colors from "@/constants/colors.json";
import { useAuthContext } from "@/context/AuthProvider";
import { createPrayerLogIfNeeded } from "@/features/device.service";
import { loadPrayerLock } from "@/hooks/use-prayer-lock/prayer-lock.loader";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect } from "react";
import {
    ActivityIndicator,
    Platform,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export const AppBootstrap = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const { authStatus, user } = useAuthContext();

    useEffect(() => {
        if (Platform.OS !== "android") {
            return;
        }

        if (
            authStatus === "authenticated" &&
            user?.profile?.uid
        ) {
            return;
        }

        loadPrayerLock()
            .then(({ stopService }) => {
                stopService();
            })
            .catch((error) => {
                console.warn(
                    "[AppBootstrap] Failed to stop prayer lock service:",
                    error,
                );
            });
    }, [authStatus, user?.profile?.uid]);

    const {
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: [
            "app-bootstrap",
            user?.profile?.uid,
        ],

        queryFn: async () => {
            if (!user?.profile?.uid) {
                return true;
            }

            return createPrayerLogIfNeeded(
                user.profile.uid,
                user.location
            );
        },

        enabled:
            authStatus === "authenticated" &&
            !!user?.profile?.uid,

        retry: 3,

        staleTime: Infinity,

        gcTime: Infinity,

        refetchOnWindowFocus: false,

        refetchOnReconnect: true,
    });

    if (authStatus !== "authenticated") {
        return <>{children}</>;
    }

    if (isLoading) {
        return (
            <View className="flex-1 bg-emerald-darkest items-center justify-center">
                <ActivityIndicator
                    size="large"
                    color={colors.gold}
                />

                <Text className="text-white/60 mt-4">
                    Preparing prayer schedule...
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 bg-emerald-darkest items-center justify-center px-6">
                <Text className="text-gold text-xl font-semibold mb-2">
                    Initialization Failed
                </Text>

                <Text className="text-white/60 text-center mb-6">
                    {error instanceof Error
                        ? error.message
                        : "Unknown error"}
                </Text>

                <TouchableOpacity
                    onPress={() => refetch()}
                    style={{
                        backgroundColor: colors.gold,
                    }}
                    className="px-6 py-3 rounded-full"
                >
                    <Text className="text-black font-semibold">
                        Retry
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return <>{children}</>;
};