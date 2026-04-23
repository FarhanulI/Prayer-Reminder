import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
}

export const Button = ({ title, ...props }: ButtonProps) => {
  return (
    <TouchableOpacity className="bg-[#D4A373] p-4 rounded-xl items-center mb-3" {...props}>
      <Text className="text-white font-bold text-lg">{title}</Text>
    </TouchableOpacity>
  );
};
