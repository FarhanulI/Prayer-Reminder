import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";

export const useCountdown = (countdownTarget: string, isPrayed?: boolean, onZero?: () => void) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [currentTime, setCurrentTime] = useState(dayjs());
  const hasTriggeredZero = useRef(false);

  useEffect(() => {
    hasTriggeredZero.current = false;
  }, [countdownTarget]);

  useEffect(() => {
    const calculate = () => {
      const currentNow = dayjs();
      setCurrentTime(currentNow);

      if (isPrayed) {
        setTimeLeft("");
        return;
      }

      const target = dayjs(countdownTarget);
      const diffSec = target.diff(currentNow, "second");

      if (diffSec > 0) {
        const h = String(Math.floor(diffSec / 3600)).padStart(2, "0");
        const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
        const s = String(diffSec % 60).padStart(2, "0");

        if (h === "00") {
          setTimeLeft(`${m}:${s}`);
        } else {
          setTimeLeft(`${h}:${m}:${s}`);
        }
      } else {
        setTimeLeft("00:00");
        if (!hasTriggeredZero.current) {
          hasTriggeredZero.current = true;
          onZero?.();
        }
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [countdownTarget, isPrayed, onZero]);

  return { timeLeft, currentTime };
};
