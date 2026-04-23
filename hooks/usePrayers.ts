import { useEffect, useState } from "react";
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type Prayer = { name: string; time: string; done: boolean };
const defaultPrayers: Prayer[] = [
  { name: "Fajr", time: "05:00 AM", done: false },
  { name: "Dhuhr", time: "12:30 PM", done: false },
  { name: "Asr", time: "04:00 PM", done: false },
  { name: "Maghrib", time: "06:45 PM", done: false },
  { name: "Isha", time: "08:15 PM", done: false },
];

export const usePrayers = (userId: string | null) => {
  const [prayers, setPrayers] = useState<Prayer[]>(defaultPrayers);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPrayers = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/prayers/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch prayers");

      const data = await response.json();
      const mappedPrayers: Prayer[] = defaultPrayers.map((p) => ({
        ...p,
        done: data[p.name]?.done || false,
      }));

      setPrayers(mappedPrayers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePrayer = async (name: string) => {
    if (!userId) return;

    try {
      await fetch(`${BACKEND_URL}/api/prayers/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, prayerName: name }),
      });

      setPrayers((prev) =>
        prev.map((p) => (p.name === name ? { ...p, done: !p.done } : p))
      );
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPrayers();
  }, [userId]);

  return { prayers, togglePrayer, loading };
};