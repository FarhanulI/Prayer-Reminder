import CircularProgress from "@/components/CircularProgress";
import { Card } from "@/components/ui/card";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

interface QuickActionCardProps {
  title: string;
  subtext: string;
  completedCount: number;
  remainingCount: number;
}

const QuickActionCard = ({
  title,
  subtext,
  completedCount,
  remainingCount,
}: QuickActionCardProps) => {
  const navigation = useNavigation<any>();

  return (
    <Card
      variant="large"
      className="flex-row justify-between items-center mb-8"
    >
      <View className="flex-1 pr-4">
        <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1.5">
          {title}
        </Text>
        <Text
          className="text-white text-[28px] font-semibold leading-tight mb-2"
          style={{ fontFamily: "serif" }}
        >
          {subtext}
        </Text>

        <Text className="text-white/30 text-[13px] font-medium">
          Prayed{" "}
          <Text className="text-gold text-[15px] font-bold">
            {completedCount}
          </Text>{" "}
          Salah
        </Text>

        <TouchableOpacity onPress={() => navigation.navigate("History")}>
          <View className="flex-row items-center border bg-gold  px-3 py-2 rounded-md shadow-gold mt-4">
            <Ionicons
              name="stats-chart-outline"
              size={14}
              // color={colors.gold}
            />
            <Text className="text-black text-[7px] font-bold ml-1.5 tracking-widest uppercase">
              Weekly Progress
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <CircularProgress value={completedCount} total={5} />
    </Card>
  );
};

export default QuickActionCard;
