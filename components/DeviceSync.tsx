import { useAuthContext } from "@/context/AuthProvider";
import { refreshApplicationData } from "@/features/device.service";
import { useEffect, useRef } from "react";

export const DeviceSync = () => {
    const { user } = useAuthContext();
    const syncingRef = useRef(false);

    useEffect(() => {
        const sync = async () => {
            if (!user?.profile?.uid) return;
            if (syncingRef.current) return;

            syncingRef.current = true;
            try {
                await refreshApplicationData(user.profile.uid);
            } catch (err) {
                console.error("Sync error:", err);
            } finally {
                syncingRef.current = false;
            }
        };

        sync();
    }, [user?.profile?.uid]);

    return null; // This component doesn't render anything
};