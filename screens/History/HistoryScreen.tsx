/* eslint-disable react/no-unescaped-entities */
import { useFocusEffect } from "@react-navigation/native";
import dayjs from "dayjs";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Skeleton from "@/components/Skeleton";
import { Card } from "@/components/ui/card";
import colors from "@/constants/colors.json";
import { useAuthContext } from "@/context/AuthProvider";
import { StreakWeekDayEntry, useStreaks } from "@/hooks/useStreaks";
import { PrayerCollection } from "@/types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateSelectorRow from "./components/DateSelectorRow";
import { PRAYERS } from "./constants";
import EditPrayerModal from "./modals/EditPrayerModal";

type PrayerName = (typeof PRAYERS)[number];
type PrayerKey = keyof PrayerCollection;

type WeekDayEntry = StreakWeekDayEntry;

interface DaySummary {
  key: string;
  date: dayjs.Dayjs;
  isToday: boolean;
  dailyCompleted: number;
}

const PRAYER_KEYS: readonly PrayerKey[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

const PRAYER_ICON_NAMES: Record<
  PrayerName,
  React.ComponentProps<typeof Ionicons>["name"]
> = {
  Fajr: "partly-sunny",
  Dhuhr: "sunny",
  Asr: "sunny-outline",
  Maghrib: "moon-outline",
  Isha: "moon",
};

const HORIZONTAL_CARD_SKELETON_COUNT = 3;
const PRAYER_LIST_SKELETON_COUNT = 5;

function countCompletedPrayers(prayers?: PrayerCollection | null): number {
  if (!prayers) return 0;

  let completed = 0;
  for (const key of PRAYER_KEYS) {
    if (prayers[key]?.isPrayed) {
      completed += 1;
    }
  }

  return completed;
}

const DayProgressCard = memo(function DayProgressCard({
  daySummary,
  onEdit,
}: {
  daySummary: DaySummary;
  onEdit: () => void;
}) {
  const { date, isToday, dailyCompleted } = daySummary;

  return (
    <Card
      className={`mr-4 items-center justify-center w-[110px] ${isToday ? "border-gold/30" : ""}`}
    >
      <Text
        className={`text-[12px] font-bold uppercase tracking-widest mb-1 ${isToday ? "text-gold" : "text-white/60"}`}
      >
        {date.format("ddd")}
      </Text>

      <TouchableOpacity
        onPress={onEdit}
        className="absolute top-3 right-3 p-1 bg-white/5 rounded-full"
      >
        <Ionicons name="pencil" size={10} color={colors.gold} />
      </TouchableOpacity>

      {isToday ? (
        <Text className="text-gold text-[9px] font-bold uppercase tracking-widest mb-2">
          (TODAY)
        </Text>
      ) : (
        <Text className="text-white/30 text-[9px] uppercase tracking-widest mb-3">
          {date.format("MMM DD")}
        </Text>
      )}

      <View className="w-14 h-14 rounded-full border-4 border-white/5 items-center justify-center my-2">
        <View
          className={`absolute w-14 h-14 rounded-full border-4 ${dailyCompleted > 0 ? "border-gold" : "border-transparent"} ${dailyCompleted < 5 ? "border-t-transparent" : ""}`}
        />
        <Text className="text-white text-xs font-bold">{dailyCompleted}/5</Text>
      </View>

      <View className="flex-row mt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <View
            key={i}
            className={`w-1.5 h-1.5 rounded-full mx-0.5 ${i < dailyCompleted ? "bg-gold" : "bg-white/10"}`}
          />
        ))}
      </View>
    </Card>
  );
});

const PrayerHistoryRow = memo(function PrayerHistoryRow({
  prayerName,
  dayStatuses,
}: {
  prayerName: PrayerName;
  dayStatuses: readonly { key: string; isDone: boolean }[];
}) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <View className="flex-row items-center">
        <View className="bg-white/5 p-2 rounded-lg mr-3 w-10 h-10 items-center justify-center">
          <Ionicons
            name={PRAYER_ICON_NAMES[prayerName]}
            size={18}
            color="#9ca3af"
          />
        </View>
        <Text className="text-white font-bold uppercase tracking-widest text-sm w-[80px]">
          {prayerName}
        </Text>
      </View>

      <View className="flex-row items-center">
        {dayStatuses.map((status) => (
          <View
            key={status.key}
            className={`w-2 h-2 rounded-full mx-1 ${status.isDone ? "bg-gold" : "bg-white/5"}`}
          />
        ))}
      </View>
    </View>
  );
});

export default function HistoryScreen() {
  const { user } = useAuthContext();

  const [currentDate, setCurrentDate] = useState(dayjs());
  const {
    data: weekData = [],
    isLoading: loading,
    refetch,
  } = useStreaks(user?.profile?.uid, currentDate);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<WeekDayEntry | null>(null);

  // Ref for the horizontal ScrollView to run the scroll-hint animation
  const horizontalScrollRef = useRef<ScrollView>(null);
  const scrollHintAnimated = useRef(new Animated.Value(0)).current;
  const scrollHintSequenceRef = useRef<Animated.CompositeAnimation | null>(
    null,
  );

  const todayKey = dayjs().format("YYYY-MM-DD");

  const daySummaries = useMemo<DaySummary[]>(() => {
    return weekData.map((day) => {
      const key = day.date.format("YYYY-MM-DD");

      return {
        key,
        date: day.date,
        isToday: key === todayKey,
        dailyCompleted: countCompletedPrayers(day.data?.prayers),
      };
    });
  }, [todayKey, weekData]);

  const prayerStatusesByName = useMemo(() => {
    const statuses: Record<PrayerName, { key: string; isDone: boolean }[]> = {
      Fajr: [],
      Dhuhr: [],
      Asr: [],
      Maghrib: [],
      Isha: [],
    };

    for (const day of weekData) {
      const dayKey = day.date.format("YYYY-MM-DD");
      statuses.Fajr.push({
        key: `${dayKey}-fajr`,
        isDone: Boolean(day.data?.prayers?.fajr?.isPrayed),
      });
      statuses.Dhuhr.push({
        key: `${dayKey}-dhuhr`,
        isDone: Boolean(day.data?.prayers?.dhuhr?.isPrayed),
      });
      statuses.Asr.push({
        key: `${dayKey}-asr`,
        isDone: Boolean(day.data?.prayers?.asr?.isPrayed),
      });
      statuses.Maghrib.push({
        key: `${dayKey}-maghrib`,
        isDone: Boolean(day.data?.prayers?.maghrib?.isPrayed),
      });
      statuses.Isha.push({
        key: `${dayKey}-isha`,
        isDone: Boolean(day.data?.prayers?.isha?.isPrayed),
      });
    }

    return statuses;
  }, [weekData]);

  const weekStartStr = useMemo(
    () =>
      weekData.length > 0
        ? weekData[0].date.format("MMM DD").toUpperCase()
        : "",
    [weekData],
  );

  const weekEndStr = useMemo(() => {
    const lastDay = weekData.at(-1);
    return lastDay ? lastDay.date.format("MMM DD, YYYY").toUpperCase() : "";
  }, [weekData]);

  const openEditModal = useCallback((day: WeekDayEntry) => {
    setSelectedDay(day);
    setEditModalVisible(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();

      // Scroll-hint animation: scroll right then back to start
      const scrollHint = () => {
        horizontalScrollRef.current?.scrollTo({ x: 0, animated: false });

        scrollHintSequenceRef.current = Animated.sequence([
          Animated.delay(600),
          Animated.timing(scrollHintAnimated, {
            toValue: 110,
            duration: 550,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.delay(250),
          Animated.timing(scrollHintAnimated, {
            toValue: 0,
            duration: 500,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
          }),
        ]);

        scrollHintSequenceRef.current.start();
      };

      scrollHint();

      return () => {
        scrollHintSequenceRef.current?.stop();
        scrollHintAnimated.stopAnimation();
        scrollHintAnimated.setValue(0);
      };
    }, [refetch, scrollHintAnimated]),
  );

  // Drive the horizontal ScrollView's scroll offset from the animated value
  useEffect(() => {
    const listenerId = scrollHintAnimated.addListener(({ value }) => {
      horizontalScrollRef.current?.scrollTo({ x: value, animated: false });
    });
    return () => scrollHintAnimated.removeListener(listenerId);
  }, [scrollHintAnimated]);

  const handlePrevWeek = useCallback(() => {
    setCurrentDate((prev) => prev.subtract(7, "day"));
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentDate((prev) => prev.add(7, "day"));
  }, []);

  return (
    <ScrollView
      className="flex-1 px-6 bg-emerald-darkest"
      contentContainerStyle={{ paddingTop: 10, paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header Row */}
      {/* <View className="flex-row justify-between items-center mb-6">
          <Text className="text-white text-xl font-bold" style={{ fontFamily: 'serif' }}>Weekly Progress</Text>
          {loading ? (
            <Skeleton width={80} height={20} borderRadius={4} />
          ) : (
            <Text className="text-gold text-[12px] font-bold uppercase tracking-widest">{overallPercentage}% OVERALL</Text>
          )}
        </View> */}

      <DateSelectorRow
        handlePrevWeek={handlePrevWeek}
        handleNextWeek={handleNextWeek}
        weekStartStr={weekStartStr}
        weekEndStr={weekEndStr}
        loading={loading}
      />

      {/* Daily Progress Cards (Horizontal Scroll) */}
      <View className="mb-8">
        <View className="flex-row items-center justify-end mb-2 pr-2">
          <Text className="text-white/40 text-[10px] uppercase tracking-widest mr-1">
            Swipe
          </Text>
          <Ionicons
            name="swap-horizontal"
            size={12}
            color="rgba(255,255,255,0.4)"
          />
        </View>
        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 20 }}
          scrollEventThrottle={16}
        >
          {loading
            ? Array.from({ length: HORIZONTAL_CARD_SKELETON_COUNT }).map(
                (_, index) => (
                  <Card
                    key={`day-skeleton-${index}`}
                    className="mr-4 items-center justify-center w-[110px]"
                  >
                    <Skeleton
                      width={30}
                      height={12}
                      borderRadius={4}
                      className="mb-1"
                    />
                    <Skeleton
                      width={40}
                      height={10}
                      borderRadius={4}
                      className="mb-3"
                    />
                    <Skeleton
                      width={56}
                      height={56}
                      borderRadius={28}
                      className="my-2"
                    />
                    <View className="flex-row mt-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton
                          key={i}
                          width={6}
                          height={6}
                          borderRadius={3}
                          className="mx-0.5"
                        />
                      ))}
                    </View>
                  </Card>
                ),
              )
            : daySummaries.map((daySummary, index) => (
                <DayProgressCard
                  key={daySummary.key}
                  daySummary={daySummary}
                  onEdit={() => openEditModal(weekData[index])}
                />
              ))}
        </ScrollView>
      </View>

      {/* Detailed Prayer Logs List */}
      <Card variant="history">
        {loading
          ? Array.from({ length: PRAYER_LIST_SKELETON_COUNT }).map((_, idx) => (
              <View
                key={idx}
                className="flex-row items-center justify-between mb-5"
              >
                <View className="flex-row items-center">
                  <Skeleton
                    width={40}
                    height={40}
                    borderRadius={8}
                    className="mr-3"
                  />
                  <Skeleton width={60} height={14} borderRadius={4} />
                </View>
                <View className="flex-row items-center">
                  {[...Array(7)].map((_, dIdx) => (
                    <Skeleton
                      key={dIdx}
                      width={8}
                      height={8}
                      borderRadius={4}
                      className="mx-1"
                    />
                  ))}
                </View>
              </View>
            ))
          : PRAYERS.map((prayerName) => (
              <PrayerHistoryRow
                key={prayerName}
                prayerName={prayerName}
                dayStatuses={prayerStatusesByName[prayerName]}
              />
            ))}
      </Card>

      <ImageBackground
        source={require("@/assets/images/bgOverlay.png")}
        className="bg-emerald-dark border border-white/5 rounded-2xl mb-8 overflow-hidden mt-6"
        imageStyle={{ opacity: 0.3 }}
      >
        <View className="p-2 items-center">
          <MaterialCommunityIcons
            name="format-quote-open"
            size={32}
            color={`${colors.gold}99`}
            style={{ marginBottom: 12 }}
          />
          <Text
            className="text-white text-[16px] italic text-center leading-8 mb-4"
            style={{
              fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
            }}
          >
            “Indeed, I am Allah. There is no deity except Me, so worship Me and
            establish prayer for My remembrance"
          </Text>
          <Text className="text-gold text-xs font-bold uppercase tracking-widest">
            — Surah Taha, verse 14
          </Text>
        </View>
      </ImageBackground>

      <EditPrayerModal
        editModalVisible={editModalVisible}
        setEditModalVisible={setEditModalVisible}
        selectedDay={selectedDay}
        refetch={refetch}
      />
    </ScrollView>
  );
}
