import { Card } from "@/components/ui/card";
import { CATEGORY_ENCOURAGEMENTS, CATEGORY_MESSAGES, STREAK_MILESTONES, StreakCategory, getMilestoneForStreak } from "@/constants/milestones";
import { UserStreaks } from "@/features/streaks.service";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import colors from "@/constants/colors.json";

interface StreaksOverviewProps {
    streaks: UserStreaks | null;
}

const StreakCard = ({
    type,
    count,
    title,
    color,
    icon,
    nextMilestone,
    encouragement,
    meaning
}: {
    type: string;
    count: number;
    title: string;
    color: string;
    icon: string;
    nextMilestone: any;
    encouragement: string;
    meaning: string;
}) => {
    const progress = nextMilestone ? (count / nextMilestone.days) * 100 : 100;

    return (
        <Card className="rounded-3xl mb-4">
            <View className="flex-row items-center mb-4">
                <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: `${color}15` }}>
                    <Ionicons name={icon as any} size={24} color={color} />
                </View>

                <View className="flex-1">
                    <View className="flex-row justify-between items-end mb-1">
                        <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{type}</Text>
                        <Text className="text-white font-bold text-lg">{count} <Text className="text-white/40 text-xs">Days</Text></Text>
                    </View>
                    
                    <Text className="text-white font-semibold text-sm">{title}</Text>
                </View>
            </View>

            {/* Motivational Messaging */}
            <View className="bg-white/5 rounded-xl p-3 mb-4 border border-white/5">
                <Text className="text-gold text-[10px] font-bold uppercase tracking-widest mb-1.5 flex-row items-center">
                    <Ionicons name="information-circle" size={10} color={colors.gold} /> Why it matters
                </Text>
                <Text className="text-white/80 text-xs font-medium mb-2 leading-relaxed" style={{ fontStyle: 'italic' }}>
                    "{meaning}"
                </Text>
                <View className="h-[1px] bg-white/5 w-full mb-2" />
                <Text className="text-white/60 text-[11px] leading-relaxed">
                    {encouragement}
                </Text>
            </View>

            {/* Progress to next milestone */}
            <View className="h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                <View 
                    className="h-full rounded-full" 
                    style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: color }} 
                />
            </View>
            {nextMilestone ? (
                <Text className="text-white/40 text-[10px] font-medium text-right">
                    {nextMilestone.days - count} more days to strengthen your habit
                </Text>
            ) : (
                <Text className="text-white/40 text-[10px] font-medium text-right">
                    Keep going for a stronger connection
                </Text>
            )}
        </Card>
    );
};

const StreaksOverview = ({ streaks }: StreaksOverviewProps) => {
    if (!streaks) return null;

    const categories: { key: StreakCategory; label: string }[] = [
        { key: "perfect", label: "Excellence Stage (5/5)" },
        { key: "strong", label: "Strength Stage (4+/5)" },
        { key: "growth", label: "Growth Stage (3+/5)" },
    ];

    return (
        <View className="mb-10">
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white text-lg font-semibold" style={{ fontFamily: 'serif' }}>Spiritual Journey</Text>
                <View className="bg-gold/10 px-3 py-1 rounded-full">
                    <Text className="text-gold text-[10px] font-bold">JOURNEY STAGES</Text>
                </View>
            </View>

            {categories.map((cat) => {
                const data = streaks[cat.key] || { current: 0, max: 0 };
                const currentMilestone = getMilestoneForStreak(cat.key, data.current);
                const nextMilestone = STREAK_MILESTONES[cat.key].find(m => m.days > data.current);

                return (
                    <StreakCard
                        key={cat.key}
                        type={cat.label}
                        count={data.current}
                        title={currentMilestone?.title || "Just Starting"}
                        icon={currentMilestone?.icon || "flash-outline"}
                        color={currentMilestone?.color || (cat.key === 'perfect' ? colors.gold : cat.key === 'strong' ? colors.success : colors['blue-accent'])}
                        nextMilestone={nextMilestone}
                        meaning={CATEGORY_MESSAGES[cat.key]}
                        encouragement={CATEGORY_ENCOURAGEMENTS[cat.key]}
                    />
                );
            })}
        </View>
    );
};

export default StreaksOverview;
