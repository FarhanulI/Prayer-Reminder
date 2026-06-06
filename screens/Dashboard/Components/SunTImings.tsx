import Skeleton from '@/components/Skeleton';
import colors from "@/constants/colors.json";
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { UserDocument } from '@/types';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { Text, View } from 'react-native';

const SunTimings = ({ profile }: { profile: UserDocument }) => {
    const { data, isLoading, isError, error } = usePrayerTimes({ latitude: profile?.location?.latitude, longitude: profile?.location?.longitude });

    return (
        <View className="flex-row items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 ">
            <View className="flex-row items-center flex-1 justify-center">
                <Feather name="sunrise" size={16} color={colors.gold} />
                <View className="ml-3">
                    <Text className="text-white/30 text-[9px] uppercase font-bold tracking-wider">Sunrise</Text>
                    {isLoading ? (
                        <Skeleton width={45} height={16} className="mt-0.5" />
                    ) : (
                        <Text className="text-white/80 text-sm font-semibold mt-0.5">
                            {data?.prayerTimings?.Sunrise ? dayjs(`2000-01-01 ${data?.prayerTimings?.Sunrise.split(' ')[0]}`).format("h:mm A") : "--:--"}
                        </Text>
                    )}
                </View>
            </View>

            <View className="w-[1px] h-6 bg-white/10" />

            <View className="flex-row items-center flex-1 justify-center">
                <Feather name="sunset" size={16} color={colors.gold} />
                <View className="ml-3">
                    <Text className="text-white/30 text-[9px] uppercase font-bold tracking-wider">Sunset</Text>
                    {isLoading ? (
                        <Skeleton width={45} height={16} className="mt-0.5" />
                    ) : (
                        <Text className="text-white/80 text-sm font-semibold mt-0.5">
                            {data?.prayerTimings?.Sunset ? dayjs(`2000-01-01 ${data?.prayerTimings?.Sunset.split(' ')[0]}`).format("h:mm A") : "--:--"}
                        </Text>
                    )}
                </View>
            </View>
        </View>
    )
}

export default SunTimings