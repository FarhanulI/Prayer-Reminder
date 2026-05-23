import { Card } from '@/components/ui/card';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Platform,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import colors from '@/constants/colors.json';
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
                <View className="bg-gold/10 p-5 rounded-full mb-6 border border-gold/20">
                    <MaterialCommunityIcons name="shield-check-outline" size={40} color={colors.gold} />
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

            <Card variant="large" className="mb-10">
                {commitmentOptions.map((option) => (
                    <SelectionCard
                        key={option.id}
                        label={option.label}
                        icon={option.icon}
                        selected={commitment === option.id}
                        onPress={() => setCommitment(option.id)}
                    />
                ))}
            </Card>

            <TouchableOpacity
                onPress={handleFinish}
                disabled={!commitment || loading}
                className={`py-4 rounded-full items-center mb-4 ${commitment ? 'bg-gold' : 'bg-gold/30'}`}
            >
                {loading ? (
                    <ActivityIndicator color={colors['emerald-login-bg']} />
                ) : (
                    <Text className="text-emerald-login-bg font-bold tracking-widest text-[12px]">BEGIN JOURNEY</Text>
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
