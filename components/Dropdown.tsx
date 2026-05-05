import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

import Skeleton from "./Skeleton";

export type DropdownOption = { id: number, name: string, key: string };

interface DropdownProps {
  label: string;
  value: string | undefined;
  options: DropdownOption[] | undefined;
  onSelect: (value: DropdownOption) => void;
  containerStyle?: string;
  isLoading?: boolean;
}

export default function Dropdown({ label, value, options, onSelect, containerStyle, isLoading }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const [dropdownWidth, setDropdownWidth] = useState(0);
  const buttonRef = useRef<View>(null);

  const toggleDropdown = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      // Measure the position of the button to place the menu correctly in the Modal
      buttonRef.current?.measure((x, y, width, height, pageX, pageY) => {
        setDropdownTop(pageY + height);
        setDropdownLeft(pageX);
        setDropdownWidth(width);
        setIsOpen(true);
      });
    }
  };

  return (
    <View className={containerStyle}>
      <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">{label}</Text>
      {isLoading ? (
        <Skeleton height={48} borderRadius={12} className="w-full" />
      ) : (
        <View ref={buttonRef} collapsable={false}>
          <TouchableOpacity
            className="bg-[#141d17] border border-white/5 rounded-xl flex-row justify-between items-center px-4 py-3.5"
            onPress={toggleDropdown}
            activeOpacity={0.7}
          >
            <Text className="text-[#dbb142] text-sm" numberOfLines={1}>{value}</Text>
            <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="#dbb142" />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={isOpen} transparent animationType="none" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          {/* Menu List positioned absolute within the Modal overlay */}
          <View
            className="absolute bg-[#1a251e] rounded-xl border border-white/10 shadow-2xl overflow-hidden"
            style={{
              top: dropdownTop + 6,
              left: dropdownLeft,
              width: dropdownWidth,
              elevation: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 15
            }}
          >
            <ScrollView bounces={false} style={{ maxHeight: 250 }}>
              {options && options.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  className={`px-4 py-4 ${index !== options.length - 1 ? 'border-b border-white/5' : ''} ${item.key === value ? 'bg-[#dbb142]/10' : ''}`}
                  onPress={() => {
                    onSelect(item);
                    setIsOpen(false);
                  }}
                >
                  <Text className={`text-sm ${item.key === value ? 'text-[#dbb142] font-bold' : 'text-white/70'}`}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
