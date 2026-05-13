import { useFocusEffect } from "@react-navigation/native";
import dayjs from "dayjs";
import React, { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import Skeleton from "@/components/Skeleton";
import { useAuthContext } from "@/context/AuthProvider";
import { useStreaks } from "@/hooks/useStreaks";
import { PrayerCollection } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import DateSelectorRow from "./components/DateSelectorRow";
import { PRAYERS } from "./constants";
import EditPrayerModal from "./modals/EditPrayerModal";

export default function HistoryScreen() {
  const { user } = useAuthContext();

  const [currentDate, setCurrentDate] = useState(dayjs());
  const { data: weekData = [], isLoading: loading, refetch } = useStreaks(user?.uid, currentDate);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handlePrevWeek = () => {
    setCurrentDate((prev) => prev.subtract(7, 'day'));
  };

  const handleNextWeek = () => {
    setCurrentDate((prev) => prev.add(7, 'day'));
  };

  // Calculate overall weekly progress
  const totalPossible = 7 * 5; // 7 days * 5 prayers
  let totalCompleted = 0;

  weekData.forEach((day) => {
    if (day.data) {
      if (day.data.fajr?.isPrayed) totalCompleted++;
      if (day.data.dhuhr?.isPrayed) totalCompleted++;
      if (day.data.asr?.isPrayed) totalCompleted++;
      if (day.data.maghrib?.isPrayed) totalCompleted++;
      if (day.data.isha?.isPrayed) totalCompleted++;
    }
  });

  const overallPercentage = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  // Format date range (e.g. OCT 23 - OCT 29, 2023)
  const weekStartStr = weekData.length > 0 ? weekData[0].date.format('MMM DD').toUpperCase() : '';
  const weekEndStr = weekData.length > 0 ? weekData[6].date.format('MMM DD, YYYY').toUpperCase() : '';

  return (
    <View className="flex-1 bg-[#0d1410]">
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Row */}
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-white text-xl font-bold" style={{ fontFamily: 'serif' }}>Weekly Progress</Text>
          {loading ? (
            <Skeleton width={80} height={20} borderRadius={4} />
          ) : (
            <Text className="text-[#dbb142] text-[12px] font-bold uppercase tracking-widest">{overallPercentage}% OVERALL</Text>
          )}
        </View>

        <DateSelectorRow
          handlePrevWeek={handlePrevWeek}
          handleNextWeek={handleNextWeek}
          weekStartStr={weekStartStr}
          weekEndStr={weekEndStr}
          loading={loading}
        />

        {/* Daily Progress Cards (Horizontal Scroll) */}
        <View className="mb-8">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
            {loading ? (
              [...Array(3)].map((_, index) => (
                <View
                  key={index}
                  className="bg-[#141d17] border border-white/5 rounded-[24px] p-5 mr-4 items-center justify-center w-[110px]"
                >
                  <Skeleton width={30} height={12} borderRadius={4} className="mb-1" />
                  <Skeleton width={40} height={10} borderRadius={4} className="mb-3" />
                  <Skeleton width={56} height={56} borderRadius={28} className="my-2" />
                  <View className="flex-row mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} width={6} height={6} borderRadius={3} className="mx-0.5" />
                    ))}
                  </View>
                </View>
              ))
            ) : (
              weekData.map((day, index) => {
                const isToday = day.date.isSame(dayjs(), 'day');

                let dailyCompleted = 0;
                if (day.data) {
                  if (day.data.fajr?.isPrayed) dailyCompleted++;
                  if (day.data.dhuhr?.isPrayed) dailyCompleted++;
                  if (day.data.asr?.isPrayed) dailyCompleted++;
                  if (day.data.maghrib?.isPrayed) dailyCompleted++;
                  if (day.data.isha?.isPrayed) dailyCompleted++;
                }

                return (
                  <View
                    key={index}
                    className={`bg-[#141d17] border border-white/5 rounded-[24px] p-5 mr-4 items-center justify-center w-[110px] ${isToday ? 'border-[#dbb142]/30' : ''}`}
                  >
                    <Text className={`text-[12px] font-bold uppercase tracking-widest mb-1 ${isToday ? 'text-[#dbb142]' : 'text-white/60'}`}>
                      {day.date.format('ddd')}
                    </Text>

                    <TouchableOpacity
                      onPress={() => {
                        setSelectedDay(day);
                        setEditModalVisible(true);
                      }}
                      className="absolute top-3 right-3 p-1 bg-white/5 rounded-full"
                    >
                      <Ionicons name="pencil" size={10} color="#dbb142" />
                    </TouchableOpacity>
                    {isToday && (
                      <Text className="text-[#dbb142] text-[9px] font-bold uppercase tracking-widest mb-2">(TODAY)</Text>
                    )}
                    {!isToday && <Text className="text-white/30 text-[9px] uppercase tracking-widest mb-3">{day.date.format('MMM DD')}</Text>}

                    {/* Circle Progress */}
                    <View className="w-14 h-14 rounded-full border-4 border-white/5 items-center justify-center my-2">
                      <View
                        className={`absolute w-14 h-14 rounded-full border-4 ${dailyCompleted > 0 ? 'border-[#dbb142]' : 'border-transparent'} ${dailyCompleted < 5 ? 'border-t-transparent' : ''}`}
                      />
                      <Text className="text-white text-xs font-bold">{dailyCompleted}/5</Text>
                    </View>

                    {/* Dots under circle */}
                    <View className="flex-row mt-2">
                      {[...Array(5)].map((_, i) => (
                        <View
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full mx-0.5 ${i < dailyCompleted ? 'bg-[#dbb142]' : 'bg-white/10'}`}
                        />
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Detailed Prayer Logs List */}
        <View className="bg-[#141d17] border border-white/5 rounded-[28px] p-5">
          {loading ? (
            [...Array(5)].map((_, idx) => (
              <View key={idx} className="flex-row items-center justify-between mb-5">
                <View className="flex-row items-center">
                  <Skeleton width={40} height={40} borderRadius={8} className="mr-3" />
                  <Skeleton width={60} height={14} borderRadius={4} />
                </View>
                <View className="flex-row items-center">
                  {[...Array(7)].map((_, dIdx) => (
                    <Skeleton key={dIdx} width={8} height={8} borderRadius={4} className="mx-1" />
                  ))}
                </View>
              </View>
            ))
          ) : (
            PRAYERS.map((prayerName, idx) => {
              const prayerKey = prayerName.toLowerCase() as keyof PrayerCollection;

              return (
                <View key={idx} className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="bg-white/5 p-2 rounded-lg mr-3 w-10 h-10 items-center justify-center">
                      <Ionicons
                        name={prayerName === 'Fajr' ? 'partly-sunny' : prayerName === 'Dhuhr' ? 'sunny' : prayerName === 'Asr' ? 'sunny-outline' : prayerName === 'Maghrib' ? 'moon-outline' : 'moon'}
                        size={18}
                        color="#9ca3af"
                      />
                    </View>
                    <Text className="text-white font-bold uppercase tracking-widest text-sm w-[80px]">{prayerName}</Text>
                  </View>

                  {/* 7 dots for the 7 days of the week */}
                  <View className="flex-row items-center">
                    {weekData.map((day, dIdx) => {
                      const isDone = day.data?.[prayerKey]?.isPrayed;
                      return (
                        <View
                          key={dIdx}
                          className={`w-2 h-2 rounded-full mx-1 ${isDone ? 'bg-[#dbb142]' : 'bg-white/5'}`}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

      <EditPrayerModal
        editModalVisible={editModalVisible}
        setEditModalVisible={setEditModalVisible}
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
        refetch={refetch}
      />
    </View>
  );
}
