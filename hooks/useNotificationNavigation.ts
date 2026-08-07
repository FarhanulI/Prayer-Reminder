import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";

type NotificationPayload =
  | { type: "ayah"; surahNumber: number; ayahNumber: number; surah: string }
  | { type: "jummah" };

export function useNotificationNavigation() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;

  useEffect(() => {
    const handlePayload = (payload: NotificationPayload) => {
      switch (payload.type) {
        case "ayah":
          navigationRef.current.navigate("Main", {
            screen: "Quran",
          });
          break;
        case "jummah":
          navigationRef.current.navigate("Main", {
            screen: "Home",
          });
          break;
      }
    };

    // Handle tap when app is in foreground or background (not terminated)
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content
          .data as NotificationPayload;
        if (data?.type) {
          handlePayload(data);
        }
      },
    );

    // Handle tap when app was terminated
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content
        .data as NotificationPayload;
      if (data?.type) {
        handlePayload(data);
      }
    });

    return () => subscription.remove();
  }, []);
}
