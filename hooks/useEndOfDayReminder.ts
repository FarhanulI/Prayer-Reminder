import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const EOD_SHOWN_PREFIX = 'eod_summary_shown_';

export function useEndOfDayReminder() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkTime = async () => {
      const now = dayjs();
      // Check if it's past 11:30 PM (23:30)
      if (now.hour() > 23 || (now.hour() === 23 && now.minute() >= 30)) {
        const today = now.format('YYYY-MM-DD');
        const key = `${EOD_SHOWN_PREFIX}${today}`;
        try {
          const shown = await AsyncStorage.getItem(key);
          if (!shown) {
            setVisible(true);
          }
        } catch (e) {
          console.error('[useEndOfDayReminder] Error reading from AsyncStorage', e);
        }
      }
    };

    // Check on mount
    checkTime();

    // Check when app comes to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkTime();
      }
    });

    // Check periodically in case they leave app open
    const interval = setInterval(() => {
      checkTime();
    }, 60000); // Check every minute

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, []);

  const dismiss = async () => {
    setVisible(false);
    const today = dayjs().format('YYYY-MM-DD');
    const key = `${EOD_SHOWN_PREFIX}${today}`;
    try {
      await AsyncStorage.setItem(key, 'true');
    } catch (e) {
      console.error('[useEndOfDayReminder] Error writing to AsyncStorage', e);
    }
  };

  return {
    visible,
    dismiss,
  };
}
