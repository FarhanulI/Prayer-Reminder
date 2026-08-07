import * as Location from "expo-location";

export const getLocation =
  async (): Promise<Location.LocationObject | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!location) return null;
      return location;
    } catch (error) {
      console.log("Failed to get location:", error);
      return null;
    }
  };
