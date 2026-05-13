import { useAuthContext } from '@/context/AuthProvider';
import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { updateUserStreaks } from '../../../features/streaks.service';
import { PRAYERS } from '../constants';

interface EditPrayerModalProps {
    editModalVisible: boolean;
    setEditModalVisible: (visible: boolean) => void;
    selectedDay: any;
    setSelectedDay: (day: any) => void;
    refetch: () => void;
}

const PRAYER_METADATA: Record<string, { label: string, icon: string }> = {
    Fajr: { label: "Dawn", icon: "partly-sunny" },
    Dhuhr: { label: "Noon", icon: "sunny" },
    Asr: { label: "Afternoon", icon: "sunny-outline" },
    Maghrib: { label: "Sunset", icon: "moon-outline" },
    Isha: { label: "Night", icon: "moon" }
};

const EditPrayerModal = ({ editModalVisible, setEditModalVisible, selectedDay, setSelectedDay, refetch }: EditPrayerModalProps) => {
    const { user } = useAuthContext();
    const [updating, setUpdating] = useState(false);
    const [localPrayers, setLocalPrayers] = useState<Record<string, boolean>>({});

    // Initialize local state from selectedDay
    useEffect(() => {
        const initial: Record<string, boolean> = {};
        PRAYERS.forEach(p => {
            initial[p.toLowerCase()] = selectedDay?.data?.[p.toLowerCase()]?.isPrayed || false;
        });
        setLocalPrayers(initial);
    }, [selectedDay, editModalVisible]);

    const handleToggleLocal = (prayerName: string) => {
        const prayerKey = prayerName.toLowerCase();
        setLocalPrayers(prev => ({
            ...prev,
            [prayerKey]: !prev[prayerKey]
        }));
    };

    const handleSaveChanges = async () => {
        if (!user?.uid || !selectedDay) return;

        setUpdating(true);
        try {
            const dateStr = selectedDay.date.format('YYYY-MM-DD');
            const logRef = doc(db, "users", user.uid, "prayer_logs", dateStr);

            const updateData: Record<string, any> = {};
            PRAYERS.forEach(prayer => {
                const prayerKey = prayer.toLowerCase();
                const newStatus = localPrayers[prayerKey];
                const oldStatus = selectedDay.data?.[prayerKey]?.isPrayed || false;

                if (newStatus !== oldStatus) {
                    updateData[`${prayerKey}.isPrayed`] = newStatus;
                    updateData[`${prayerKey}.status`] = newStatus ? "completed" : null;
                    updateData[`${prayerKey}.completedAt`] = newStatus ? serverTimestamp() : null;
                    updateData[`${prayerKey}.skipped`] = false;
                    updateData[`${prayerKey}.skippedAt`] = null;
                }
            });

            if (Object.keys(updateData).length > 0) {
                try {
                    await updateDoc(logRef, updateData);
                } catch (err: any) {
                    if (err.code === 'not-found') {
                        // Create document if it doesn't exist
                        const fullDoc: Record<string, any> = {};
                        PRAYERS.forEach(prayer => {
                            const prayerKey = prayer.toLowerCase();
                            fullDoc[prayerKey] = {
                                isPrayed: localPrayers[prayerKey],
                                status: localPrayers[prayerKey] ? "completed" : null,
                                completedAt: localPrayers[prayerKey] ? serverTimestamp() : null,
                                skipped: false,
                                skippedAt: null,
                            };
                        });
                        await setDoc(logRef, fullDoc, { merge: true });
                    } else {
                        throw err;
                    }
                }
            }

            // Update streaks for this day
            await updateUserStreaks(user.uid, dateStr);

            refetch();
            setEditModalVisible(false);
        } catch (error) {
            console.error("Error saving changes:", error);
            Alert.alert("Error", "Failed to save changes");
        } finally {
            setUpdating(false);
        }
    };

    if (!selectedDay) return null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={editModalVisible}
            onRequestClose={() => setEditModalVisible(false)}
        >
            <View className="flex-1 bg-[#0d1410]">
                {/* Header */}
                <View className="flex-row justify-between items-center px-6 pt-14 pb-6 border-b border-white/5">
                    <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                        <Ionicons name="close" size={24} color="#dbb142" />
                    </TouchableOpacity>
                    <View className="items-center flex-1">
                        <Text className="text-[#dbb142] text-xl font-bold text-center" style={{ fontFamily: 'serif' }}>
                            {selectedDay.date.format('dddd, MMM DD')}
                        </Text>
                    </View>
                </View>

                <ScrollView className="flex-1 px-6 pt-8">
                    <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center mb-2">Weekly Progress</Text>
                    <Text className="text-white/60 text-sm text-center mb-8 px-4">
                        Update your prayer records for {selectedDay.date.format('MMMM D, YYYY')}.
                    </Text>

                    <View className="space-y-4">
                        {PRAYERS.map((prayer) => {
                            const prayerKey = prayer.toLowerCase();
                            const isPrayed = localPrayers[prayerKey] || false;
                            const meta = PRAYER_METADATA[prayer];
                            const prayerTime = selectedDay.data?.[prayerKey]?.time || "--:--";

                            return (
                                <TouchableOpacity
                                    key={prayer}
                                    onPress={() => handleToggleLocal(prayer)}
                                    className={`flex-row items-center justify-between p-5 rounded-2xl border ${isPrayed ? 'bg-[#141d17] border-[#dbb142]/20' : 'bg-[#141d17] border-white/5'
                                        } mb-4`}
                                >
                                    <View className="flex-row items-center flex-1">
                                        <View className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${isPrayed ? 'bg-[#dbb142]/10' : 'bg-white/5'}`}>
                                            <Ionicons
                                                name={meta.icon as any}
                                                size={20}
                                                color={isPrayed ? '#dbb142' : '#9ca3af'}
                                            />
                                        </View>
                                        <View>
                                            <Text className={`font-bold text-base ${isPrayed ? 'text-[#dbb142]' : 'text-white'}`}>
                                                {prayer}
                                            </Text>
                                            <Text className="text-white/40 text-[10px] font-bold">
                                                {meta.label} • {prayerTime}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="flex-row items-center">
                                        {!isPrayed && (
                                            <View className="bg-red-500/10 px-2 py-0.5 rounded-md mr-3 border border-red-500/20">
                                                <Text className="text-red-400 text-[8px] font-bold uppercase tracking-tighter">Missed</Text>
                                            </View>
                                        )}
                                        <Switch
                                            value={isPrayed}
                                            onValueChange={() => handleToggleLocal(prayer)}
                                            trackColor={{ false: "#1f2937", true: "#dbb142" }}
                                            thumbColor={isPrayed ? "#ffffff" : "#4b5563"}
                                            ios_backgroundColor="#1f2937"
                                        />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* Bottom Action */}
                <View className="px-6 pb-12 pt-4">
                    <TouchableOpacity
                        onPress={handleSaveChanges}
                        disabled={updating}
                        className={`py-4 rounded-2xl items-center shadow-lg flex-row justify-center ${updating ? 'bg-gray-600' : 'bg-[#dbb142] shadow-[#dbb142]/20'}`}
                    >
                        <Ionicons name={updating ? "sync" : "save-outline"} size={18} color="#0d1410" className="mr-2" />
                        <Text className="text-[#0d1410] font-bold uppercase tracking-widest text-sm ml-2">
                            {updating ? "Saving..." : "Save Changes"}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setEditModalVisible(false)}
                        disabled={updating}
                        className="mt-6 self-center"
                    >
                        <Text className="text-white/40 text-xs font-bold underline">Cancel & Discard</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default EditPrayerModal;