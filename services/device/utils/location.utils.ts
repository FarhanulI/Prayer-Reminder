import * as Location from "expo-location";

export const isLocationChangedSignificantly = (
  loc1: Location.LocationObjectCoords | null | undefined,
  loc2: Location.LocationObjectCoords | null | undefined,
) => {
  if (!loc1 || !loc2) return true;

  const threshold = 0.1; // roughly ~11km
  const latDiff = Math.abs(loc1.latitude - loc2.latitude);
  const lngDiff = Math.abs(loc1.longitude - loc2.longitude);

  return latDiff > threshold || lngDiff > threshold;
};
