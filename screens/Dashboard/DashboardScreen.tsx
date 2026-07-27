import colors from "@/constants/colors.json";
import { useAuthContext } from "@/context/AuthProvider";
import { refreshApplicationData } from "@/features/device.service";
import { usePrayerLock } from "@/hooks/use-prayer-lock/usePrayerLock";
import { useCreateTomorrowPrayerLog } from "@/hooks/useCreateTomorrowPrayerLog";
import { useDashboardData } from "@/hooks/useDashboardData";
import { PrayerLogDocument } from "@/types";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import PrayerLockSetupScreen from "../PrayerLockSetupScreen";
import PrayerOverlayScreen from "../PrayerOverlayScreen/PrayerOverlayScreen";
import BookmarksCard from "./Components/BookmarksCard";
import ContinueReadingCard from "./Components/ContinueReadingCard";
import DailyVerseCard from "./Components/DailyVerseCard";
import Header from "./Components/Header";
import QuickActionCard from "./Components/QuickActionCard";
import UpcomingPrayerCard from "./Components/UpcomingPrayerCard/UpcomingPrayerCard";
import { createPrayerList } from "./Components/UpcomingPrayerCard/utils";

dayjs.extend(isBetween);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrayerEntry {
  name: string;
  time: string;
  rawTime: string;
  end: string;
  isPrayed: boolean;
  skipped: boolean;
  date: string;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Returns true if the prayer window has closed and it was not prayed. */
function isPrayerMissed(prayer: PrayerEntry): boolean {
  if (prayer.isPrayed) return false;
  if (prayer.skipped) return true;
  if (!prayer.end || !prayer.rawTime) return false;

  const cleanEnd = prayer.end.split(" ")[0];
  const cleanRaw = prayer.rawTime.split(" ")[0];
  let endObj = dayjs(`${prayer.date} ${cleanEnd}`);
  const startObj = dayjs(`${prayer.date} ${cleanRaw}`);

  if (endObj.isBefore(startObj)) endObj = endObj.add(1, "day");

  return endObj.isBefore(dayjs());
}

// ---------------------------------------------------------------------------
// DashboardScreen
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthContext();

  const uid = user?.profile?.uid ?? null;

  const {
    data,
    isLoading: loading,
    refetch,
    isFetching,
  } = useDashboardData(uid);

  const { profile, prayerData, yesterdayData } = useMemo(
    () => ({
      profile: data?.profile,
      prayerData: data?.prayerData,
      yesterdayData: data?.yesterdayData,
    }),
    [data],
  );

  const [refreshing, setRefreshing] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayPrayerName, setOverlayPrayerName] = useState("");
  const [overlayPrayerDate, setOverlayPrayerDate] = useState("");
  const [overlayEndTime, setOverlayEndTime] = useState("");
  const [isSkipReminder, setIsSkipReminder] = useState(false);

  // const { visible: eodVisible, dismiss: dismissEod } = useEndOfDayReminder();
  const { mutate: createTomorrowLog } = useCreateTomorrowPrayerLog();

  const [showPermissionSetup, setShowPermissionSetup] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const checkPerms = async () => {
      try {
        const { hasUsageStatsPermission, hasOverlayPermission } =
          await import("../../modules/prayer-lock");
        setShowPermissionSetup(
          !hasUsageStatsPermission() || !hasOverlayPermission(),
        );
      } catch {}
    };
    checkPerms();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") checkPerms();
    });
    return () => sub.remove();
  }, []);

  // Pre-create tomorrow's log when EOD overlay becomes visible.
  // useEffect(() => {
  //   if (eodVisible && uid) {
  //     createTomorrowLog(uid);
  //   }
  // }, [eodVisible, uid, createTomorrowLog]);

  // ---------------------------------------------------------------------------
  // Pull-to-refresh
  // ---------------------------------------------------------------------------
  const onRefresh = useCallback(async () => {
    if (!uid) return;
    setRefreshing(true);
    try {
      await refreshApplicationData(uid);
      await refetch();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [uid, refetch]);

  // ---------------------------------------------------------------------------
  // Prayer list (display)
  // ---------------------------------------------------------------------------

  const prayerList = useMemo<PrayerEntry[]>(
    () => createPrayerList(prayerData),
    [prayerData],
  );

  // ---------------------------------------------------------------------------
  // Prayer list for locking (includes yesterday's Isha)
  // ---------------------------------------------------------------------------

  const lockPrayers = useMemo(() => {
    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    const result: PrayerEntry[] = [];

    if (yesterdayData?.prayers?.isha) {
      const isha = yesterdayData.prayers.isha;
      result.push({
        name: "Isha",
        time: isha.time ?? "",
        rawTime: isha.time ?? "",
        end: isha.end ?? "",
        isPrayed: !!isha.isPrayed,
        skipped: !!isha.skipped,
        date: yesterday,
      });
    }

    prayerList.forEach((p) => result.push({ ...p, time: p.rawTime }));

    return result;
  }, [yesterdayData, prayerList]);

  // ---------------------------------------------------------------------------
  // Overlay handlers
  // ---------------------------------------------------------------------------

  const onShowOverlay = useCallback(
    (prayerName: string, prayerEnd: string, prayerDate: string) => {
      const prayer = lockPrayers.find(
        (p) => p.name === prayerName && p.date === prayerDate,
      );
      setOverlayPrayerName(prayerName);
      setOverlayEndTime(prayerEnd);
      setOverlayPrayerDate(prayerDate);
      setIsSkipReminder(!!prayer?.skipped);
      setOverlayVisible(true);
    },
    [lockPrayers],
  );

  const { markPrayerComplete, snoozeUntilTime } = usePrayerLock({
    uid,
    prayers: lockPrayers,
    onShowOverlay,
  });

  const handlePray = useCallback(
    async (name: string) => {
      const finalName = name || overlayPrayerName;
      const logDate = overlayPrayerDate || dayjs().format("YYYY-MM-DD");

      await markPrayerComplete(finalName, logDate);
      setOverlayVisible(false);

      if (finalName === "Isha" && uid) {
        createTomorrowLog(uid);
      }
    },
    [
      overlayPrayerName,
      overlayPrayerDate,
      markPrayerComplete,
      uid,
      createTomorrowLog,
    ],
  );

  const handleRemindAt = useCallback(
    async (targetTime: string, prayerEndTime: string) => {
      setOverlayVisible(false);
      await snoozeUntilTime(targetTime, prayerEndTime);
    },
    [snoozeUntilTime],
  );

  // ---------------------------------------------------------------------------
  // EOD missed prayers
  // ---------------------------------------------------------------------------

  // const missedPrayers = useMemo(
  //   () => prayerList.filter(isPrayerMissed),
  //   [prayerList],
  // );

  // const handleEodLogPrayer = useCallback(
  //   async (name: string, date?: string) => {
  //     await markPrayerComplete(name, date ?? dayjs().format("YYYY-MM-DD"));

  //     if (name === "Isha" && uid) {
  //       createTomorrowLog(uid);
  //     }

  //     const remaining = prayerList.filter(
  //       (p) => p.name !== name && isPrayerMissed(p),
  //     );
  //     if (remaining.length === 0) dismissEod();
  //   },
  //   [markPrayerComplete, uid, createTomorrowLog, prayerList, dismissEod],
  // );

  // ---------------------------------------------------------------------------
  // Derived counts
  // ---------------------------------------------------------------------------

  const completedCount = useMemo(
    () => prayerList.filter((p) => p.isPrayed).length,
    [prayerList],
  );
  const remainingCount = 5 - completedCount;

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading || isFetching) {
    return (
      <View className="flex-1 bg-emerald-darkest items-center justify-center">
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View className="flex-1 bg-emerald-darkest mb-20">
      {/* End-of-day overlay */}
      {/* <EndOfDayOverlayScreen
        visible={eodVisible}
        missedPrayers={missedPrayers}
        currentPrayer={currentInfo}
        onClose={dismissEod}
        onLogPrayer={handleEodLogPrayer}
      /> */}

      {/* Permission setup modal */}
      <Modal
        visible={showPermissionSetup}
        animationType="slide"
        statusBarTranslucent
      >
        <PrayerLockSetupScreen
          onComplete={() => setShowPermissionSetup(false)}
        />
      </Modal>

      {/* Prayer lock overlay */}
      <PrayerOverlayScreen
        visible={overlayVisible}
        prayerName={overlayPrayerName}
        prayerTime={
          prayerList.find((p) => p.name === overlayPrayerName)?.time ?? ""
        }
        endTime={overlayEndTime}
        onPray={handlePray}
        onRemindAt={handleRemindAt}
        isSkipReminder={isSkipReminder}
      />

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
          />
        }
      >
        <Header profile={profile} />

        <UpcomingPrayerCard
          prayerList={prayerList}
          yesterdayData={yesterdayData as PrayerLogDocument}
          profile={profile}
        />

        <QuickActionCard
          title="Daily Salah"
          subtext="Today's Progress"
          completedCount={completedCount}
          remainingCount={remainingCount}
        />

        <View className="flex-row justify-between mb-8">
          <ContinueReadingCard
            onPress={(lastRead) =>
              navigation.navigate("Quran", {
                surahNumber: lastRead?.surahNumber,
                ayahNumber: lastRead?.ayahNumber,
              })
            }
          />
          <BookmarksCard onPress={() => navigation.navigate("Bookmarks")} />
        </View>

        <View className="mb-10">
          <DailyVerseCard />
        </View>
      </ScrollView>
    </View>
  );
}
