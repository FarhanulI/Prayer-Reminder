import React from 'react';
import { Text, View } from 'react-native';

const VerseCard = ({ number, arabic, english }: { number: number, arabic: string, english: string }) => (
    <View className="bg-[#141d17] border border-white/5 rounded-2xl p-5 mb-4">
        <View className="bg-[#1a291f] w-7 h-7 rounded items-center justify-center mb-4">
            <Text className="text-[#dbb142] text-[11px] font-bold">{number}</Text>
        </View>

        <View className="mb-6">
            <Text className="text-white text-right text-[26px]" style={{ fontFamily: 'serif', lineHeight: 44 }}>{arabic}</Text>
        </View>

        <Text className="text-white/60 text-sm italic leading-6">{english}</Text>
    </View>
);

export default VerseCard