import { Card } from '@/components/ui/card';
import colors from '@/constants/colors.json';
import { useAuthContext } from '@/context/AuthProvider';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface ForbiddenTime {
    label: string;
    subLabel: string;
    start: string;
    end: string;
    description: string;
    icon: any;
    iconType: 'feather' | 'ionicons' | 'material';
}

const ForbiddenTimeItem = ({ item, isLast }: { item: ForbiddenTime; isLast: boolean }) => {
    const formatTime = (time: string) => {
        if (!time) return '--:--';
        return dayjs(`2000-01-01 ${time}`).format('hh:mm A');
    };

    const IconComponent = item.iconType === 'feather' ? Feather : item.iconType === 'ionicons' ? Ionicons : MaterialCommunityIcons;

    return (
        <View className="flex-row">
            {/* Timeline Left Part */}
            <View className="items-center mr-4">
                <View className="w-10 h-10 rounded-full border border-gold items-center justify-center bg-emerald-dark">
                    <IconComponent name={item.icon} size={18} color={colors.gold} />
                </View>
                {!isLast && <View className="w-[1px] flex-1 bg-gold/30 my-1" />}
            </View>

            {/* Card Right Part */}
            <Card variant="compact" className="flex-1 mb-6">
                <View className="flex-row justify-between items-center mb-2">
                    <View>
                        <Text className="text-white font-bold text-[15px]">{item.label}</Text>
                        <Text className="text-white/60 text-[13px] font-medium">{item.subLabel}</Text>
                    </View>
                    <View className="bg-gold/10 px-3 py-1 rounded-full border border-gold/20">
                        <Text className="text-gold text-[10px] font-bold uppercase tracking-widest">Forbidden</Text>
                    </View>
                </View>

                <Text className="text-gold font-bold text-[13px] mb-3">
                    {formatTime(item.start)} — {formatTime(item.end)}
                </Text>

                <Text className="text-white/40 text-[12px] leading-5">
                    {item.description}
                </Text>
            </Card>
        </View>
    );
};

export default function ForbiddenTimesScreen() {
    const { user } = useAuthContext();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { data, isLoading } = useDashboardData(user?.uid);

    const { profile, userData } = useMemo(() => {
        return {
            profile: data?.profile,
            userData: data?.userData,
        };
    }, [data]);

    const sunTimings = route.params?.sunTimings || profile?.sunTimings;
    const prayerTimes = route.params?.prayerTimes || userData;

    console.log({});


    const addMinutes = (time: string, mins: number) => {
        if (!time) return '';
        const [hr, mm] = time.split(':').map(Number);
        const date = new Date();
        date.setHours(hr, mm + mins);
        return date.toTimeString().slice(0, 5);
    };

    const forbiddenTimes: ForbiddenTime[] = useMemo(() => {
        if (!sunTimings || !prayerTimes) return [];
        console.log({ sunTimings, prayerTimes });

        return [
            {
                label: "Sunrise",
                subLabel: "(Shuruq)",
                start: sunTimings.sunrise || '',
                end: addMinutes(sunTimings.sunrise || '', 20),
                description: "The period from when the sun begins to rise until it has risen to the height of a spear (approximately 15-20 minutes after sunrise).",
                icon: "sunrise",
                iconType: 'feather'
            },
            {
                label: "Zenith",
                subLabel: "(Zawwal)",
                start: addMinutes(prayerTimes?.dhuhr?.time || '', -10),
                end: prayerTimes?.dhuhr?.time || '',
                description: "When the sun is at its highest point in the sky. This is a brief period just before the time of Dhuhr begins.",
                icon: "sunny-outline",
                iconType: 'ionicons'
            },
            {
                label: "Sunset",
                subLabel: "(Ghurub)",
                start: addMinutes(prayerTimes?.maghrib?.time || '', -15),
                end: prayerTimes?.maghrib?.time || '',
                description: "When the sun starts to set until it has completely disappeared. Note: The obligatory Maghrib prayer is excluded from this prohibition once the sun has set.",
                icon: "weather-sunset-down",
                iconType: 'material'
            }
        ];
    }, [sunTimings, prayerTimes]);

    console.log({ forbiddenTimes });




    if (isLoading && !sunTimings) {
        return (
            <View className="flex-1 bg-emerald-darkest items-center justify-center">
                <ActivityIndicator color={colors.gold} size="large" />
            </View>
        );
    }

    if (!sunTimings || !prayerTimes) {
        return (
            <View className="flex-1 bg-emerald-darkest">
                {/* Header */}
                <View className="flex-row justify-between items-center px-6 pt-16 pb-4 bg-emerald-darkest border-b border-white/5">
                    <View className="flex-row items-center flex-1">
                        <TouchableOpacity
                            className="mr-3 p-2 -ml-2"
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors['emerald-sage']} />
                        </TouchableOpacity>
                        <Text className="text-emerald-sage text-lg font-bold flex-1" style={{ fontFamily: 'serif' }}>
                            Forbidden Times
                        </Text>
                    </View>
                </View>
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="alert-circle-outline" size={48} color={colors.gold} className="mb-4" />
                    <Text className="text-white text-center text-lg font-bold mb-2">No Timing Data Available</Text>
                    <Text className="text-white/40 text-center text-sm leading-5">
                        We couldn't load your prayer and sun timings. Please check your internet connection or try refreshing the dashboard.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-emerald-darkest">
            {/* Header */}
            <View className="flex-row justify-between items-center px-6 pt-16 pb-4 bg-emerald-darkest border-b border-white/5">
                <View className="flex-row items-center flex-1">
                    <TouchableOpacity
                        className="mr-3 p-2 -ml-2"
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors['emerald-sage']} />
                    </TouchableOpacity>
                    <Text className="text-emerald-sage text-lg font-bold flex-1" style={{ fontFamily: 'serif' }}>
                        Forbidden Times
                    </Text>
                </View>

                <View className="w-10 h-10 rounded-full bg-emerald-soft items-center justify-center overflow-hidden border border-white/10">
                    {profile?.photoURL ? (
                        <Image source={{ uri: profile.photoURL }} className="w-full h-full" />
                    ) : (
                        <Text className="text-gold font-bold">{profile?.name?.charAt(0) || "U"}</Text>
                    )}
                </View>
            </View>

            <ScrollView
                className="flex-1 px-6 bg-emerald-darkest"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60, paddingTop: 20 }}
            >
                {/* Introduction Callout */}
                <View className="bg-emerald-medium-dark rounded-2xl p-6 mb-8 border border-white/5 items-center">
                    {/* Book Icon */}
                    <View className="w-12 h-12 rounded-full bg-emerald-dark items-center justify-center mb-5">
                        <Feather name="book-open" size={20} color={colors.gold} />
                    </View>

                    {/* Quote Text */}
                    <Text className="text-white/80 text-[15px] leading-relaxed text-center italic mb-6" style={{ fontFamily: 'serif' }}>
                        "And Uqbah ibn Aamir reported: Allah’s Messenger (ﷺ) forbade us from praying in three periods: when the sun is rising until it has fully risen, when the sun is at its zenith until it has passed the meridian, and when the sun is about to set until it has fully set."
                    </Text>

                    {/* Source */}
                    <Text className="text-gold text-[10px] font-bold uppercase tracking-widest text-center">
                        Sahih Muslim 831
                    </Text>
                </View>

                {/* Timeline */}
                <View className="mt-2 pl-2">
                    {forbiddenTimes.map((item, index) => (
                        <ForbiddenTimeItem
                            key={index}
                            item={item}
                            isLast={index === forbiddenTimes.length - 1}
                        />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

