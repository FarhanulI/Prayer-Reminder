import React, { memo } from "react";
import { ImageBackground, Text } from "react-native";
import { styles } from "../styles";
import { HadithCardProps } from "../types";

const HadithCard = memo(function HadithCard({
  hadithText,
  hadithSource,
}: HadithCardProps) {
  return (
    <ImageBackground
      className="p-10"
      source={require("@/assets/images/bgOverlay.png")}
      style={styles.hadithCard}
      imageStyle={styles.hadithCardImage}
    >
      <Text style={styles.hadithText}>{hadithText}</Text>
      <Text style={styles.hadithSourceText}>— {hadithSource}</Text>
    </ImageBackground>
  );
});

export default HadithCard;
