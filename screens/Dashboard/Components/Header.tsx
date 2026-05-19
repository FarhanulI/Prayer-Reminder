import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { DocumentData } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';

interface HeaderProps {
    profile: DocumentData | null | undefined;
}

export default function Header({ profile }: HeaderProps) {
    const [currentDateIndex, setCurrentDateIndex] = useState(0); // 0 = Gregorian, 1 = Hijri
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const translateYAnim = useRef(new Animated.Value(0)).current;

    // Format English Date (e.g., "Mon, 18 May")
    const getEnglishDate = () => {
        if (profile?.date?.gregorian) {
            const greg = profile.date.gregorian;
            const weekdayShort = greg.weekday?.en ? greg.weekday.en.substring(0, 3) : '';
            const monthShort = greg.month?.en ? greg.month.en.substring(0, 3) : '';
            return `${weekdayShort ? weekdayShort + ', ' : ''}${greg.day} ${monthShort}`;
        }
        return dayjs().format("ddd, D MMM");
    };

    // Format Hijri Date in English letters and numbers (e.g., "18 Dhu al-Qi'dah 1447")
    const getHijriDate = () => {
        if (profile?.date?.hijri) {
            const hijri = profile.date.hijri;
            const day = hijri.day;
            const year = hijri.year;
            const monthEn = hijri.month?.en || '';
            return `${day} ${monthEn} ${year}`;
        }

        try {
            const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            const formatted = formatter.format(new Date());
            const dayMatch = formatted.match(/\d+/);
            const yearMatch = formatted.match(/\d{4}/);
            const day = dayMatch ? dayMatch[0] : '18';
            const year = yearMatch ? yearMatch[0] : '1447';
            const month = formatted.replace(day, '').replace(year, '').replace('AH', '').replace(/[,]/g, '').trim();
            return `${day} ${month} ${year}`;
        } catch (e) {
            return "18 Dhu al-Qi'dah 1447";
        }
    };

    const englishDate = getEnglishDate();
    const hijriDate = getHijriDate();

    useEffect(() => {
        const interval = setInterval(() => {
            // Slide up & fade out
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(translateYAnim, {
                    toValue: -12,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Change date index
                setCurrentDateIndex((prev) => (prev === 0 ? 1 : 0));
                // Reset translateY to bottom for the next item to slide up
                translateYAnim.setValue(12);

                // Slide in & fade in
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(translateYAnim, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ]).start();
            });
        }, 4000); // Transition every 4 seconds

        return () => clearInterval(interval);
    }, [fadeAnim, translateYAnim]);

    return (
        <View className="flex-row justify-between items-center mb-8">
            <View>
                <Text className="text-white/40 text-[11px] font-bold uppercase tracking-widest">Assalamu Alaikum</Text>
                <Text className="text-white text-xl font-bold">{profile?.name || "User"}</Text>
            </View>

            {/* Elegant glassmorphic pill showing English & Arabic Hijri dates with calendar icon */}
            <View className="bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 flex-row items-center">
                <Ionicons name="calendar-outline" size={14} color="#dbb142" className="mr-2" />
                <View className=" overflow-hidden justify-center min-w-[140px]">
                    <Animated.View
                        style={{
                            opacity: fadeAnim,
                            transform: [{ translateY: translateYAnim }],
                        }}
                    >
                        <Text className="text-white text-[11px] font-bold tracking-wide text-center">
                            {currentDateIndex === 0 ? englishDate : hijriDate}
                        </Text>
                    </Animated.View>
                </View>
            </View>
        </View>
    );
}

