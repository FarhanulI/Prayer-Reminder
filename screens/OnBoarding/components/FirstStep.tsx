import { Card } from '@/components/ui/card';
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
            <Card variant="large" className="mb-6">
                <View className="flex-row items-center mb-5">
                    <View className="bg-gold/20 px-2 py-1 rounded-md border border-gold/30 mr-3">
                        <Text className="text-gold text-[10px] font-bold uppercase tracking-tighter">Step 01</Text>
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
            </Card>

            {/* Step 02 Container */}
            <Card variant="large" className="mb-6">
                <View className="flex-row items-center mb-5">
                    <View className="bg-gold/20 px-2 py-1 rounded-md border border-gold/30 mr-3">
                        <Text className="text-gold text-[10px] font-bold uppercase tracking-tighter">Step 02</Text>
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
            </Card>

            {/* Step 03 Container (Age) */}
            <Card variant="large" className="mb-8">
                <View className="flex-row items-center mb-5">
                    <View className="bg-gold/20 px-2 py-1 rounded-md border border-gold/30 mr-3">
                        <Text className="text-gold text-[10px] font-bold uppercase tracking-tighter">Step 03</Text>
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
            </Card>

            <TouchableOpacity
                onPress={() => setCurrentStep(1)}
                className="bg-gold py-4 rounded-full items-center mb-4 active:opacity-90"
            >
                <Text className="text-emerald-login-bg font-bold tracking-widest text-[12px]">CONTINUE</Text>
            </TouchableOpacity>
        </View>
    );
};

export default FirstStep;