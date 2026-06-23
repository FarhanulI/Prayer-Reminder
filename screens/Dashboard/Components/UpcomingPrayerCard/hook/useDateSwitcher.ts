import { useState, useEffect, useRef, useMemo } from "react";
import { Animated } from "react-native";
import { UserDocument } from "@/types";
import { getEnglishDateString, getHijriDateString } from "../utils";

export const useDateSwitcher = (profile: UserDocument | null | undefined) => {
  const [currentDateIndex, setCurrentDateIndex] = useState(0); // 0 = Gregorian, 1 = Hijri
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  // Memoize Gregorian/English Date
  const englishDate = useMemo(() => {
    return getEnglishDateString(profile?.date?.gregorian);
  }, [profile?.date?.gregorian]);

  // Memoize Hijri Date
  const hijriDate = useMemo(() => {
    return getHijriDateString(profile?.date?.hijri);
  }, [profile?.date?.hijri]);

  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: -12,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isMounted) {
          setCurrentDateIndex((prev) => (prev === 0 ? 1 : 0));
          translateYAnim.setValue(12);
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]).start();
        }
      });
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fadeAnim, translateYAnim]);

  return {
    currentDateIndex,
    fadeAnim,
    translateYAnim,
    englishDate,
    hijriDate,
  };
};
