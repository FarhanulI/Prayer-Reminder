import { DocumentData } from "firebase/firestore";
import React from "react";
import { Image, Text, View } from "react-native";

interface HeaderProps {
  profile: DocumentData | null | undefined;
}

export default function Header({ profile }: HeaderProps) {
  return (
    <View className="flex-row justify-between items-center mb-8">
      <View>
        <Text className="text-gold text-[11px] font-bold uppercase tracking-widest">
          Assalamu Alaikum
        </Text>
        <Text className="text-white text-xl font-bold">
          {profile?.profile?.name || "User"}
        </Text>
      </View>

      <View className="w-10 h-10 rounded-full bg-emerald-soft items-center justify-center overflow-hidden border border-white/10">
        {profile?.profile?.photoURL ? (
          <Image
            source={{ uri: profile?.profile?.photoURL }}
            className="w-full h-full"
          />
        ) : (
          <Text className="text-gold font-bold">
            {profile?.profile?.name?.charAt(0) || "U"}
          </Text>
        )}
      </View>
    </View>
  );
}
