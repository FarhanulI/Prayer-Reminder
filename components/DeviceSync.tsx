import { useAuthContext } from "@/context/AuthProvider";
import { getDeviceToken, getLocation, saveUserDeviceInfo } from "@/features/device.service";
import { useEffect } from "react";

export const DeviceSync = () => {
    const { user } = useAuthContext();


    useEffect(() => {
        const sync = async () => {
            if (user?.profile?.uid) {
                try {
                    const [token, location] = await Promise.all([
                        getDeviceToken(),
                        getLocation(),
                    ]);


                    await saveUserDeviceInfo(user?.profile?.uid, {
                        deviceToken: token,
                        location: location?.coords || null
                    });
                    console.log("Device & Location synced to Firestore");
                } catch (err) {
                    console.error("Sync error:", err);
                }
            }
        };

        sync();
    }, [user?.profile?.uid]);

    return null; // This component doesn't render anything
};