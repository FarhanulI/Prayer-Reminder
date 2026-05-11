import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    Platform,
    ScrollView,
    Text,
    View
} from 'react-native';
import { useAuthContext } from '../../context/AuthProvider';
import { saveOnboardingData } from '../../features/device.service';
import { OnboardingData } from '../../types';
import FirstStep from './components/FirstStep';
import SecondStep from './components/SecondStep';
import ThirdStep from './components/ThirdStep';

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
            navigation.replace('Main');
        } catch (error) {
            console.error("Failed to save onboarding:", error);
        } finally {
            setLoading(false);
        }
    };


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

                {currentStep === 0 && (
                    <FirstStep
                        prayerFreq={prayerFreq}
                        setPrayerFreq={setPrayerFreq}
                        screenTime={screenTime}
                        setScreenTime={setScreenTime}
                        age={age}
                        setAge={setAge}
                        setCurrentStep={setCurrentStep}
                        prayerOptions={prayerOptions}
                        screenTimeOptions={screenTimeOptions}
                        ageOptions={ageOptions}
                    />
                )}
                {currentStep === 1 && (
                    <SecondStep
                        prayerFreq={prayerFreq}
                        opportunities={getPrayerStats().opportunities}
                        setCurrentStep={setCurrentStep}
                    />
                )}
                {currentStep === 2 && (
                    <ThirdStep
                        commitment={commitment}
                        setCommitment={setCommitment}
                        handleFinish={handleFinish}
                        loading={loading}
                        setCurrentStep={setCurrentStep}
                        commitmentOptions={commitmentOptions}
                    />
                )}

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