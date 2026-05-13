import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import dayjs from 'dayjs';

/**
 * Individual prayer time card in the horizontal row.
 */
const PrayerTimeItem = ({ name, time, isActive }: { name: string; time: string; isActive?: boolean }) => (
  <View className={`items-center justify-center p-3 rounded-2xl border ${isActive ? 'bg-[#dbb142]/10 border-[#dbb142]' : 'bg-[#141d17] border-white/5'} mr-3 w-[85px]`}>
    <Text className={`text-[10px] uppercase font-bold mb-1 ${isActive ? 'text-[#dbb142]' : 'text-white/40'}`}>{name}</Text>
    <Text className={`text-[13px] font-semibold ${isActive ? 'text-white' : 'text-white/70'}`}>{time}</Text>
  </View>
);

interface PrayerTimesRowProps {
  prayerList: Array<{
    name: string;
    time: string;
  }>;
  currentInfo: {
    name: string;
    date: string;
  } | null;
  loading: boolean;
}

const PrayerTimesRow: React.FC<PrayerTimesRowProps> = ({ prayerList, currentInfo, loading }) => {
  return (
    <View className="mb-8">
      <Text className="text-white text-lg font-semibold mb-4" style={{ fontFamily: 'serif' }}>Today's Prayer Times</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {loading ? (
          [...Array(5)].map((_, i) => (
            <View key={i} className="bg-[#141d17] border border-white/5 rounded-2xl p-3 mr-3 w-[85px] items-center">
              <View className="bg-white/5 w-10 h-3 rounded mb-2" />
              <View className="bg-white/5 w-14 h-4 rounded" />
            </View>
          ))
        ) : (
          prayerList.map((p, i) => (
            <PrayerTimeItem
              key={i}
              name={p.name}
              time={p.time}
              isActive={currentInfo?.name === p.name && currentInfo?.date === dayjs().format("YYYY-MM-DD")}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default PrayerTimesRow;
