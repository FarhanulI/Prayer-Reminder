import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

/**
 * Card for the upcoming or current prayer with a countdown and progress bar.
 */
const UpcomingPrayerCard = ({ 
    title, 
    name, 
    time, 
    countdownTarget 
}: { 
    title: string; 
    name: string; 
    time: string; 
    countdownTarget: string 
}) => {
    const [timeLeft, setTimeLeft] = useState("");
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const calculate = () => {
            const now = dayjs();
            const target = dayjs(countdownTarget);
            
            const diffSec = target.diff(now, "second");

            if (diffSec > 0) {
                const h = String(Math.floor(diffSec / 3600)).padStart(2, '0');
                const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
                const s = String(diffSec % 60).padStart(2, '0');

                setTimeLeft(`${h}:${m}:${s}`);
                
                // Progress based on total duration (mocked to 1 hour if not provided, but here we just show remaining)
                // For a more accurate progress, we'd need the start time too.
                setProgress(Math.max(0, 100 - (diffSec / 3600) * 100));
            } else {
                setTimeLeft("00:00:00");
                setProgress(100);
            }
        };

        calculate();
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);
    }, [countdownTarget]);

    return (
        <View className="bg-[#141d17] border border-[#dbb142]/20 rounded-[32px] p-6 mb-8 shadow-2xl">
            <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{title}</Text>
                <View className="bg-[#dbb142]/10 px-3 py-1 rounded-full border border-[#dbb142]/20">
                    <Text className="text-[#dbb142] text-[10px] font-bold">{timeLeft}</Text>
                </View>
            </View>

            <Text className="text-white text-4xl font-semibold mb-2" style={{ fontFamily: 'serif' }}>{name}</Text>

            <View className="flex-row items-center mb-6">
                <Ionicons name="time-outline" size={16} color="#dbb142" />
                <Text className="text-[#dbb142] ml-2 font-medium">{time}</Text>
            </View>

            {/* Progress Bar */}
            <View className="h-[2px] bg-white/5 rounded-full overflow-hidden">
                <View
                    className="h-full bg-[#dbb142]"
                    style={{ width: `${progress}%` }}
                />
            </View>
        </View>
    );
};

export default UpcomingPrayerCard;