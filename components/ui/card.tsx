import React from 'react';
import {
  TouchableOpacity,
  View,
  type TouchableOpacityProps,
  type ViewProps,
} from 'react-native';

export type CardVariant =
  | 'default'
  | 'large'
  | 'xl'
  | 'auth'
  | 'authCompact'
  | 'verse'
  | 'highlight'
  | 'compact'
  | 'history'
  | 'quranVerse';

const VARIANT_CLASS: Record<CardVariant, string> = {
  default: 'bg-emerald-dark border border-white/5 rounded-[24px] p-5',
  large: 'bg-emerald-dark border border-white/5 rounded-[32px] p-6',
  xl: 'bg-emerald-dark border border-white/5 rounded-[40px] p-8',
  auth: 'bg-emerald-medium/80 rounded-[32px] p-7 border border-white/5 shadow-2xl',
  authCompact: 'bg-emerald-medium/70 rounded-2xl p-6 border border-white/10',
  verse: 'bg-emerald-verse border border-white/5 rounded-[32px] p-6',
  highlight: 'bg-emerald-dark border border-gold/40 rounded-2xl p-6',
  compact: 'bg-emerald-dark border border-white/5 rounded-2xl p-4',
  history: 'bg-emerald-dark border border-white/5 rounded-[28px] p-5',
  quranVerse: 'rounded-2xl border overflow-hidden relative px-[18px] py-[18px] mb-4',
};

export function cardClassName(variant: CardVariant = 'default', className = '') {
  return [VARIANT_CLASS[variant], className].filter(Boolean).join(' ');
}

type CardProps = ViewProps & {
  variant?: CardVariant;
  className?: string;
  onPress?: TouchableOpacityProps['onPress'];
  activeOpacity?: number;
};

export function Card({
  variant = 'default',
  className = '',
  children,
  onPress,
  activeOpacity = 0.8,
  style,
  ...rest
}: CardProps) {
  const combinedClassName = cardClassName(variant, className);

  if (onPress) {
    return (
      <TouchableOpacity
        className={combinedClassName}
        onPress={onPress}
        activeOpacity={activeOpacity}
        style={style}
        accessibilityRole="button"
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={combinedClassName} style={style} {...rest}>
      {children}
    </View>
  );
}
