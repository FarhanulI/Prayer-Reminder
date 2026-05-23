import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import colors from '@/constants/colors.json';

interface SelectionCardProps {
    label: string;
    selected: boolean;
    onPress: () => void;
    icon?: any;
}

export const SelectionCard = ({ label, selected, onPress, icon }: SelectionCardProps) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={`flex-row items-center justify-between px-5 py-4 mb-3 rounded-xl border ${selected
            ? 'bg-gold/10 border-gold'
            : 'bg-emerald-selection border-white/5'
            }`}
    >
        <View className="flex-row items-center">
            {icon && <Ionicons name={icon} size={18} color={selected ? colors.gold : colors['emerald-muted']} className="mr-3" />}
            <Text className={`text-[15px] ${selected ? 'text-gold font-semibold' : 'text-white/70'}`}>
                {label}
            </Text>
        </View>
        {selected && (
            <View className="bg-gold rounded-full p-0.5">
                <Ionicons name="checkmark" size={12} color={colors['emerald-login-bg']} />
            </View>
        )}
    </TouchableOpacity>
);
