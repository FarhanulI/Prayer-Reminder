import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuthContext } from '../context/AuthProvider';
import { saveOnboardingData } from '../features/device.service';
import { OnboardingData } from '../types';

const OnBoardingScreen = ({ navigation }: any) => {
    const { user } = useAuthContext();
    const [currentStep, setCurrentStep] = useState(0); // 0: Questions, 1: Insight, 2: Commitment
    const [prayerFreq, setPrayerFreq] = useState('');
    const [screenTime, setScreenTime] = useState('');
    const [age, setAge] = useState('');
    const [commitment, setCommitment] = useState('');
    const [loading, setLoading] = useState(false);

    const prayerOptions = ['5 times', '3-4 times', '1-2 times', 'Rarely'];
    const screenTimeOptions = ['< 2h', '2-4h', '4-6h', '6h+'];
    const ageOptions = ['< 18', '18-25', '26-35', '36+'];

    const commitmentOptions = [
        { id: 'all', label: 'I want to pray all 5 daily', icon: 'sunny' },
        { id: 'gradual', label: 'I want to improve gradually', icon: 'trending-up' }
    ];

    const getPrayerStats = () => {
        let prayersPerDay = 0;
        if (prayerFreq === '5 times') prayersPerDay = 5;
        else if (prayerFreq === '3-4 times') prayersPerDay = 3.5;
        else if (prayerFreq === '1-2 times') prayersPerDay = 1.5;
        else prayersPerDay = 0.5;

        let ageNum = 20;
        if (age === '< 18') ageNum = 15;
        else if (age === '18-25') ageNum = 22;
        else if (age === '26-35') ageNum = 30;
        else ageNum = 45;

        let usageNum = 3;
        if (screenTime === '< 2h') usageNum = 1;
        else if (screenTime === '2-4h') usageNum = 3;
        else if (screenTime === '4-6h') usageNum = 5;
        else usageNum = 8;

        const opportunities = 5 - Math.floor(prayersPerDay);

        // Lifetime calculations (Soft version)
        const daysInLife = (ageNum - 12) * 365; // Assuming prayer starts around 12
        const totalPossible = daysInLife * 5;
        const estimatedPrayed = daysInLife * prayersPerDay;
        const estimatedMissed = totalPossible - estimatedPrayed;

        return {
            prayersPerDay,
            opportunities,
            ageNum,
            usageNum,
            estimatedMissed,
            estimatedPrayed
        };
    };

    const handleFinish = async () => {
        if (!user?.uid) return;
        setLoading(true);
        const stats = getPrayerStats();

        const onboardingData: OnboardingData = {
            onboardingCompleted: true,
            profile: {
                age: stats.ageNum,
                dailyPhoneUsage: stats.usageNum
            },
            prayerHabit: {
                averageDaily: stats.prayersPerDay,
                estimatedMissedPerDay: stats.opportunities
            },
            insights: {
                estimatedLifetimeMissed: Math.round(stats.estimatedMissed),
                estimatedLifetimePrayed: Math.round(stats.estimatedPrayed)
            },
            goal: {
                type: commitment === 'all' ? 'improve' : 'improve',
                targetDaily: commitment === 'all' ? 5 : Math.min(5, Math.ceil(stats.prayersPerDay) + 1)
            }
        };

        try {
            await saveOnboardingData(user.uid, onboardingData);
            navigation.navigate('Dashboard');
        } catch (error) {
            console.error("Failed to save onboarding:", error);
        } finally {
            setLoading(false);
        }
    };

    const SelectionCard = ({
        label,
        selected,
        onPress,
        icon
    }: {
        label: string;
        selected: boolean;
        onPress: () => void;
        icon?: any;
    }) => (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className={`flex-row items-center justify-between px-5 py-4 mb-3 rounded-xl border ${selected
                ? 'bg-[#dbb142]/10 border-[#dbb142]'
                : 'bg-[#0f1411] border-white/5'
                }`}
        >
            <View className="flex-row items-center">
                {icon && <Ionicons name={icon} size={18} color={selected ? "#dbb142" : "#88988a"} className="mr-3" />}
                <Text className={`text-[15px] ${selected ? 'text-[#dbb142] font-semibold' : 'text-white/70'}`}>
                    {label}
                </Text>
            </View>
            {selected && (
                <View className="bg-[#dbb142] rounded-full p-0.5">
                    <Ionicons name="checkmark" size={12} color="#101a15" />
                </View>
            )}
        </TouchableOpacity>
    );

    const renderStep0 = () => (
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
                        onPress={() => setPrayerFreq(option as string)}
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

    const renderStep1 = () => {
        const { opportunities } = getPrayerStats();
        return (
            <View>
                <View className="items-center mb-10">
                    <View className="bg-[#dbb142]/10 p-5 rounded-full mb-6 border border-[#dbb142]/20">
                        <Ionicons name="heart-outline" size={40} color="#dbb142" />
                    </View>
                    <Text
                        className="text-white text-3xl text-center mb-4 px-4"
                        style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
                    >
                        Let's improve together
                    </Text>
                    <View className="bg-[#141d17] p-8 rounded-[40px] border border-white/5 w-full">
                        <Text className="text-white/80 text-center text-lg leading-7 mb-6">
                            You're praying around <Text className="text-[#dbb142] font-bold">{prayerFreq}</Text> a day 🤲
                        </Text>
                        <Text className="text-white/60 text-center text-[15px] leading-6 italic">
                            "That means you have <Text className="text-[#dbb142] font-bold">{opportunities} opportunities</Text> daily to grow closer to Allah."
                        </Text>
                    </View>
                </View>

                <View className="items-center mb-8 px-4">
                    <Text
                        className="text-white/80 text-center text-[15px] leading-6 italic"
                        style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
                    >
                        "Indeed, Allah will not change the condition of a people until they change what is in themselves."
                    </Text>
                    <Text className="text-[#dbb142] text-[11px] font-bold mt-2 tracking-widest">
                        SURAH AR-RA'D 13:11
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={() => setCurrentStep(2)}
                    className="bg-[#dbb142] py-4 rounded-full items-center mb-4 active:opacity-90"
                >
                    <Text className="text-[#101a15] font-bold tracking-widest text-[12px]">MY COMMITMENT</Text>
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

    const renderStep2 = () => (
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


    return (
        <LinearGradient colors={['#0d1410', '#060a08']} className="flex-1">
            <ScrollView
                className="flex-1 px-6"
                contentContainerStyle={{ paddingTop: 60, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Progress (Subtle) */}
                <View className="flex-row justify-center mb-8">
                    {[0, 1, 2].map((i) => (
                        <View
                            key={i}
                            className={`h-1 w-8 mx-1 rounded-full ${i === currentStep ? 'bg-[#dbb142]' : 'bg-white/10'}`}
                        />
                    ))}
                </View>

                {currentStep === 0 && renderStep0()}
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}

                {currentStep === 0 && (
                    <Text className="text-white/30 text-[11px] text-center mt-4 px-4">
                        Your answers are private and used only for your personal growth.
                    </Text>
                )}

                {/* Spiritual Quote Footer (Only show on first or last step for clean look) */}
                {currentStep !== 1 && (
                    <View className="items-center mt-12 pb-10">
                        <Text
                            className="text-[#dbb142]/70 text-center text-xl italic leading-7"
                            style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
                        >
                            "Verily, in the remembrance of Allah do hearts find rest."
                        </Text>
                    </View>
                )}
            </ScrollView>
        </LinearGradient>
    );
};

export default OnBoardingScreen;