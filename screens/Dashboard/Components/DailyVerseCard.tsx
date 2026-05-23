import { Card } from '@/components/ui/card';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import colors from '@/constants/colors.json';

const DailyVerseCard = () => (
    <Card variant="verse" className="mb-8 relative overflow-hidden">
        <FontAwesome5 name="quote-right" size={40} color="rgba(255,255,255,0.03)" className="absolute right-6 top-6" />
        <Text className="text-white/80 text-[15px] leading-7 italic mb-6">
            "And seek help through patience and prayer, and indeed, it is difficult except for the humbly submissive [to Allah]."
        </Text>
        <View className="flex-row justify-between items-center">
            <Text className="text-gold text-[11px] font-bold uppercase tracking-widest">Surah Al-Baqarah 2:45</Text>
            <View className="flex-row">
                <TouchableOpacity className="mr-4">
                    <Feather name="share-2" size={16} color="white" className="opacity-40" />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Feather name="bookmark" size={16} color={colors.gold} />
                </TouchableOpacity>
            </View>
        </View>
    </Card>
);

export default DailyVerseCard;