import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Platform,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SelectionCard } from './SelectionCard';

interface ThirdStepProps {
    commitment: string;
    setCommitment: (val: string) => void;
    handleFinish: () => void;
    loading: boolean;
    setCurrentStep: (step: number) => void;
    commitmentOptions: { id: string; label: string; icon: any }[];
}

const ThirdStep = ({
    commitment,
    setCommitment,
    handleFinish,
    loading,
    setCurrentStep,
    commitmentOptions
}: ThirdStepProps) => {
    return (
        <View>
            <View className="items-center mb-10">
                <View className="bg-[#dbb142]/10 p-5 rounded-full mb-6 border border-[#dbb142]/20">
                    <MaterialCommunityIcons name="shield-check-outline" size={40} color="#dbb142" />
                </View>
                <Text
                    className="text-white text-3xl text-center mb-4"
                    style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
                >
                    Final Commitment
                </Text>
                <Text className="text-white/50 text-center text-[15px] leading-5 px-8">
                    Choose a path that feels right for your soul today.
                </Text>
            </View>

            <View className="bg-[#141d17] rounded-[32px] p-6 mb-10 border border-white/5">
                {commitmentOptions.map((option) => (
                    <SelectionCard
                        key={option.id}
                        label={option.label}
                        icon={option.icon}
                        selected={commitment === option.id}
                        onPress={() => setCommitment(option.id)}
                    />
                ))}
            </View>

            <TouchableOpacity
                onPress={handleFinish}
                disabled={!commitment || loading}
                className={`py-4 rounded-full items-center mb-4 ${commitment ? 'bg-[#dbb142]' : 'bg-[#dbb142]/30'}`}
            >
                {loading ? (
                    <ActivityIndicator color="#101a15" />
                ) : (
                    <Text className="text-[#101a15] font-bold tracking-widest text-[12px]">BEGIN JOURNEY</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => setCurrentStep(1)}
                className="py-2 items-center"
            >
                <Text className="text-white/30 text-[12px]">Go back</Text>
            </TouchableOpacity>
        </View>
    );
};

export default ThirdStep;
