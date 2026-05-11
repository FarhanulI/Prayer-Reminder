import React from 'react';
import {
    Platform,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SelectionCard } from './SelectionCard';

interface FirstStepProps {
    prayerFreq: string;
    setPrayerFreq: (val: string) => void;
    screenTime: string;
    setScreenTime: (val: string) => void;
    age: string;
    setAge: (val: string) => void;
    setCurrentStep: (step: number) => void;
    prayerOptions: string[];
    screenTimeOptions: string[];
    ageOptions: string[];
}

const FirstStep = ({
    prayerFreq,
    setPrayerFreq,
    screenTime,
    setScreenTime,
    age,
    setAge,
    setCurrentStep,
    prayerOptions,
    screenTimeOptions,
    ageOptions
}: FirstStepProps) => {

    return (
        <View>
            {/* Title Section */}
            <View className="items-center mb-8">
                <Text
                    className="text-white text-3xl text-center mb-3"
                    style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
                >
                    A Moment for Reflection
                </Text>
                <Text className="text-white/50 text-center text-[14px] leading-5 px-6">
                    Take a breath and look within. Honesty with yourself is the first step toward peace.
                </Text>
            </View>

            {/* Step 01 Container */}
            <View className="bg-[#141d17] rounded-[32px] p-6 mb-6 border border-white/5">
                <View className="flex-row items-center mb-5">
                    <View className="bg-[#dbb142]/20 px-2 py-1 rounded-md border border-[#dbb142]/30 mr-3">
                        <Text className="text-[#dbb142] text-[10px] font-bold uppercase tracking-tighter">Step 01</Text>
                    </View>
                    <Text
                        className="text-white text-lg font-medium"
                        style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
                    >
                        How often do you pray daily?
                    </Text>
                </View>

                {prayerOptions.map((option) => (
                    <SelectionCard
                        key={option}
                        label={option}
                        selected={prayerFreq === option}
                        onPress={() => setPrayerFreq(option)}
                    />
                ))}
            </View>

            {/* Step 02 Container */}
            <View className="bg-[#141d17] rounded-[32px] p-6 mb-6 border border-white/5">
                <View className="flex-row items-center mb-5">
                    <View className="bg-[#dbb142]/20 px-2 py-1 rounded-md border border-[#dbb142]/30 mr-3">
                        <Text className="text-[#dbb142] text-[10px] font-bold uppercase tracking-tighter">Step 02</Text>
                    </View>
                    <Text
                        className="text-white text-lg font-medium"
                        style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
                    >
                        How many hours do you use your phone daily?
                    </Text>
                </View>

                {screenTimeOptions.map((option) => (
                    <SelectionCard
                        key={option}
                        label={option}
                        selected={screenTime === option}
                        onPress={() => setScreenTime(option)}
                    />
                ))}
            </View>

            {/* Step 03 Container (Age) */}
            <View className="bg-[#141d17] rounded-[32px] p-6 mb-8 border border-white/5">
                <View className="flex-row items-center mb-5">
                    <View className="bg-[#dbb142]/20 px-2 py-1 rounded-md border border-[#dbb142]/30 mr-3">
                        <Text className="text-[#dbb142] text-[10px] font-bold uppercase tracking-tighter">Step 03</Text>
                    </View>
                    <Text
                        className="text-white text-lg font-medium"
                        style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
                    >
                        What is your age range?
                    </Text>
                </View>

                {ageOptions.map((option) => (
                    <SelectionCard
                        key={option}
                        label={option}
                        selected={age === option}
                        onPress={() => setAge(option)}
                    />
                ))}
            </View>

            <TouchableOpacity
                onPress={() => setCurrentStep(1)}
                className="bg-[#dbb142] py-4 rounded-full items-center mb-4 active:opacity-90"
            >
                <Text className="text-[#101a15] font-bold tracking-widest text-[12px]">CONTINUE</Text>
            </TouchableOpacity>
        </View>
    );
};

export default FirstStep;