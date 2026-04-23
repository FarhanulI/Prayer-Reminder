import { useEffect, useState } from "react";
import * as Location from "expo-location";
import dayjs from "dayjs";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type PrayerTime = {
  name: string;
  time: Date;
};

export const usePrayerTimes = (userId: string | null) => {
  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [nextPrayer, setNextPrayer] = useState<PrayerTime | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  // 📍 Get GPS + send to backend
  const setupLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;

    await fetch(`${BACKEND_URL}/api/users/${userId}/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: latitude, lng: longitude }),
    });
  };

  // 📡 Fetch prayer times
  const fetchPrayerTimes = async () => {
    if (!userId) return;

    const res = await fetch(`${BACKEND_URL}/api/prayer-times/${userId}`);
    const data = await res.json();

    const formatted: PrayerTime[] = [
      { name: "Fajr", time: new Date(data.fajr) },
      { name: "Dhuhr", time: new Date(data.dhuhr) },
      { name: "Asr", time: new Date(data.asr) },
      { name: "Maghrib", time: new Date(data.maghrib) },
      { name: "Isha", time: new Date(data.isha) },
    ];

    setPrayers(formatted);
  };

  // ⏱ Calculate next prayer
  const calculateNextPrayer = () => {
    const now = new Date();

    const upcoming = prayers.find((p) => p.time > now);
    setNextPrayer(upcoming || prayers[0]);
  };

  // ⏳ Countdown logic
  const updateCountdown = () => {
    if (!nextPrayer) return;

    const now = dayjs();
    const target = dayjs(nextPrayer.time);

    const diff = target.diff(now, "second");

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    setCountdown(`${hours}h ${minutes}m ${seconds}s`);
  };

  useEffect(() => {
    setupLocation();
    fetchPrayerTimes();
  }, [userId]);

  useEffect(() => {
    calculateNextPrayer();
  }, [prayers]);

  useEffect(() => {
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextPrayer]);

  return { prayers, nextPrayer, countdown };
};