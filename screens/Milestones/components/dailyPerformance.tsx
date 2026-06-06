import CircularProgress from '@/components/CircularProgress';
import colors from '@/constants/colors.json';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

const DailyPerformance = ({ completedCount }: { completedCount: number }) => {
    const navigation = useNavigation<any>();

    const status = useMemo(() => {
        if (completedCount === 5) return { text: "Perfect Day", icon: "star-circle-outline" as const };
        if (completedCount >= 3) return { text: "Strong Day", icon: "medal-outline" as const };
        if (completedCount >= 1) return { text: "Good Start", icon: "run" as const };
        return { text: "Let's Begin", icon: "flag-outline" as const };
    }, [completedCount]);


    return (
        <View className="items-center my-8">
            <Text className="text-white/60 text-lg font-medium mb-8" style={{ fontFamily: 'serif' }}>Daily Performance</Text>

            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate("History")}
            >
                <CircularProgress value={completedCount || 0} total={5} />
            </TouchableOpacity>

            {/* Daily Performance Section Message*/}
            <View className="mt-8 bg-gold/10 px-6 py-2.5 rounded-full border border-gold/20 flex-row items-center">
                <MaterialCommunityIcons name={status.icon} size={18} color={colors.gold} />
                <Text className="text-gold text-[11px] font-bold uppercase tracking-widest ml-2">{status.text}</Text>
            </View>

            <Text className="text-white/30 text-xs font-medium italic mt-6 text-center px-10">
                {completedCount === 5
                    ? '"Alhamdulillah, all prayers completed today."'
                    : '"Building solid habits, one prayer at a time."'}
            </Text>
        </View>
    )
}

export default DailyPerformance