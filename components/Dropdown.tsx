import { Card } from "@/components/ui/card";
import colors from "@/constants/colors.json";
import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View, TextInput } from "react-native";

import Skeleton from "./Skeleton";

export type DropdownOption = { id: number, name: string, key: string };

interface DropdownProps {
  label?: string;
  value: string | undefined;
  options: DropdownOption[] | undefined;
  onSelect: (value: DropdownOption) => void;
  containerStyle?: string;
  isLoading?: boolean;
  renderTrigger?: (value: string | undefined, isOpen: boolean, toggleDropdown: () => void) => React.ReactNode;
  searchable?: boolean;
}

export default function Dropdown({ label, value, options, onSelect, containerStyle, isLoading, renderTrigger, searchable = false }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const [dropdownWidth, setDropdownWidth] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const buttonRef = useRef<View>(null);

  const toggleDropdown = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setSearchQuery("");
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
      {!renderTrigger && label && <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">{label}</Text>}
      {isLoading && !renderTrigger ? (
        <Skeleton height={48} borderRadius={12} className="w-full" />
      ) : (
        <View ref={buttonRef} collapsable={false}>
          {renderTrigger ? (
            renderTrigger(value, isOpen, toggleDropdown)
          ) : (
            <Card
              onPress={toggleDropdown}
              activeOpacity={0.7}
              className="rounded-xl flex-row justify-between items-center px-4 py-3.5"
            >
              <Text className="text-gold text-sm" numberOfLines={1}>{value}</Text>
              <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.gold} />
            </Card>
          )}
        </View>
      )}

      <Modal visible={isOpen} transparent animationType="none" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        />
        {/* Menu List positioned absolute within the Modal overlay */}
        <View
          className="absolute bg-emerald-dropdown rounded-xl border border-white/10 shadow-2xl overflow-hidden mt-4"
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
          {searchable && (
            <View className="px-4 py-3 border-b border-white/5 flex-row items-center">
              <Feather name="search" size={16} color="#a5b4a5" />
              <TextInput
                placeholder="Search..."
                placeholderTextColor="#a5b4a5"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-2 text-white text-sm p-0"
                autoFocus
              />
            </View>
          )}
          <ScrollView bounces={false} style={{ maxHeight: 250 }} keyboardShouldPersistTaps="handled">
            {options && options.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())).map((item, index, filteredOptions) => (
              <TouchableOpacity
                key={item.id}
                className={`px-4 py-4 ${index !== filteredOptions.length - 1 ? 'border-b border-white/5' : ''} ${item.name === value ? 'bg-gold/10' : ''}`}
                onPress={() => {
                  onSelect(item);
                  setIsOpen(false);
                }}
              >
                <Text className={`text-sm ${item.name === value ? 'text-gold font-bold' : 'text-white/70'}`}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
