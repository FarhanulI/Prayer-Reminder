import * as Location from "expo-location";
import { serverTimestamp } from "firebase/firestore";
import { setUserMerged } from "../repositories/user.repository";

export const saveUserDeviceInfo = async (
  uid: string,
  data: {
    deviceToken?: string | null;
    location: Location.LocationObjectCoords | null;
  },
) => {
  await setUserMerged(uid, {
    deviceToken: data.deviceToken ?? null,
    location: data.location ?? null,
    updatedAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  });
};
