import * as Notifications from "expo-notifications";

export const getDeviceToken = async () => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return null;

    const token = await Notifications.getDevicePushTokenAsync();
    return token.data;
  } catch (error) {
    console.log("Failed to get native push token:", error);
    return null;
  }
};
