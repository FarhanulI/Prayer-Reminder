import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
    Platform,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import colors from '@/constants/colors.json';

interface SecondStepProps {
    prayerFreq: string;
    opportunities: number;
    setCurrentStep: (step: number) => void;
}

const SecondStep = ({
    prayerFreq,
    opportunities,
    setCurrentStep
}: SecondStepProps) => {
    const getDynamicContent = (freq: string) => {
        const count = parseInt(freq) || 0;

        if (count >= 5) {
            return {
                message: (
                    <Text className="text-white/80 text-center text-lg leading-7">
                        <Text className="text-gold font-bold">Ma sha Allah!</Text> Keep up this consistency and inspire others!
                    </Text>
                ),
                subText: "Your dedication is a light for those around you. Stay firm.",
                verse: "“And those who strictly guard their prayers... These are the inheritors.”",
                reference: "SURAH AL-MU'MINUN 23:9-10"
            };
        }

        if (count === 4) {
            return {
                message: (
                    <Text className="text-white/80 text-center text-lg leading-7">
                        You are praying <Text className="text-gold font-bold">4 times</Text> a day 🤲
                    </Text>
                ),
                subText: "You're so close! Just one more prayer to complete your day. You have the strength; let this last one be your light.",
                verse: "“Guard strictly your prayers and [especially] the middle prayer.”",
                reference: "SURAH AL-BAQARAH 2:238"
            };
        }

        // Default for 0-3 prayers
        return {
            message: (
                <Text className="text-white/80 text-center text-lg leading-7">
                    You're praying around <Text className="text-gold font-bold">{count} a day</Text> 🤲
                </Text>
            ),
            subText: `That means you have ${5 - count} opportunities daily to grow closer to Allah.`,
            verse: "“Indeed, Allah will not change the condition of a people until they change what is in themselves.”",
            reference: "SURAH AR-RA'D 13:11"
        };
    };

    const content = useMemo(() => getDynamicContent(prayerFreq), [prayerFreq]);
    return (
        <View>
            <View className="items-center mb-10">
                <View className="bg-gold/10 p-5 rounded-full mb-6 border border-gold/20">
                    <Ionicons
                        name={Number(prayerFreq) >= 5 ? "star" : "heart-outline"}
                        size={40}
                        color={colors.gold}
                    />
                </View>
                <Text
                    className="text-white text-3xl text-center mb-4 px-4"
                    style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
                >
                    {Number(prayerFreq) >= 5 ? "Excellent Progress" : "Let's improve together"}
                </Text>

                <Card variant="xl" className="w-full">
                    {content.message}

                    <Text className="text-white/60 text-center text-[15px] leading-6 italic mt-4">
                        "{content.subText}"
                    </Text>
                </Card>
            </View>

            <View className="items-center mb-8 px-4">
                <Text
                    className="text-white/80 text-center text-[15px] leading-6 italic"
                    style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
                >
                    {content.verse}
                </Text>
                <Text className="text-gold text-[11px] font-bold mt-2 tracking-widest">
                    {content.reference}
                </Text>
            </View>

            <TouchableOpacity
                onPress={() => setCurrentStep(2)}
                className="bg-gold py-4 rounded-full items-center mb-4 active:opacity-90"
            >
                <Text className="text-emerald-login-bg font-bold tracking-widest text-[12px]">MY COMMITMENT</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => setCurrentStep(0)}
                className="py-2 items-center"
            >
                <Text className="text-white/30 text-[12px]">Back to reflection</Text>
            </TouchableOpacity>
        </View>
    );
};

export default SecondStep;
