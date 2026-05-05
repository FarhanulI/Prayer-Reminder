import React from 'react';
import { View, Text } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';

interface ForbiddenTime {
  label: string;
  subLabel: string;
  start: string;
  end: string;
  description: string;
  icon: any;
  iconType: 'feather' | 'ionicons' | 'material';
}

const ForbiddenTimeItem = ({ item, isLast }: { item: ForbiddenTime; isLast: boolean }) => {
  const formatTime = (time: string) => {
    if (!time) return '--:--';
    return dayjs(`2000-01-01 ${time}`).format('hh:mm A');
  };

  const IconComponent = item.iconType === 'feather' ? Feather : item.iconType === 'ionicons' ? Ionicons : MaterialCommunityIcons;

  return (
    <View className="flex-row">
      {/* Timeline Left Part */}
      <View className="items-center mr-4">
        <View className="w-10 h-10 rounded-full border border-[#dbb142] items-center justify-center bg-[#141d17]">
          <IconComponent name={item.icon} size={18} color="#dbb142" />
        </View>
        {!isLast && <View className="w-[1px] flex-1 bg-[#dbb142]/30 my-1" />}
      </View>

      {/* Card Right Part */}
      <View className="flex-1 bg-[#141d17] border border-white/5 rounded-2xl p-4 mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <View>
            <Text className="text-white font-bold text-[15px]">{item.label}</Text>
            <Text className="text-white/60 text-[13px] font-medium">{item.subLabel}</Text>
          </View>
          <View className="bg-[#dbb142]/10 px-3 py-1 rounded-full border border-[#dbb142]/20">
            <Text className="text-[#dbb142] text-[10px] font-bold uppercase tracking-widest">Forbidden</Text>
          </View>
        </View>

        <Text className="text-[#dbb142] font-bold text-[13px] mb-3">
          {formatTime(item.start)} — {formatTime(item.end)}
        </Text>

        <Text className="text-white/40 text-[12px] leading-5">
          {item.description}
        </Text>
      </View>
    </View>
  );
};

export default function ForbiddenTimesSection({ sunTimings, prayerTimes }: any) {
  if (!sunTimings || !prayerTimes) return null;

  const addMinutes = (time: string, mins: number) => {
    if (!time) return '';
    const [hr, mm] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hr, mm + mins);
    return date.toTimeString().slice(0, 5);
  };

  const forbiddenTimes: ForbiddenTime[] = [
    {
      label: "Sunrise",
      subLabel: "(Shuruq)",
      start: sunTimings.sunrise || '',
      end: addMinutes(sunTimings.sunrise || '', 20),
      description: "The period from when the sun begins to rise until it has risen to the height of a spear (approximately 15-20 minutes after sunrise).",
      icon: "sunrise",
      iconType: 'feather'
    },
    {
      label: "Zenith",
      subLabel: "(Zawwal)",
      start: addMinutes(prayerTimes?.dhuhr?.time || '', -10),
      end: prayerTimes?.dhuhr?.time || '',
      description: "When the sun is at its highest point in the sky. This is a brief period just before the time of Dhuhr begins.",
      icon: "sunny-outline",
      iconType: 'ionicons'
    },
    {
      label: "Sunset",
      subLabel: "(Ghurub)",
      start: addMinutes(prayerTimes?.maghrib?.time || '', -15),
      end: prayerTimes?.maghrib?.time || '',
      description: "When the sun starts to set until it has completely disappeared. Note: The obligatory Maghrib prayer is excluded from this prohibition once the sun has set.",
      icon: "weather-sunset-down",
      iconType: 'material'
    }
  ];

  return (
    <View className="mt-4">
      {forbiddenTimes.map((item, index) => (
        <ForbiddenTimeItem 
          key={index} 
          item={item} 
          isLast={index === forbiddenTimes.length - 1} 
        />
      ))}
    </View>
  );
}
