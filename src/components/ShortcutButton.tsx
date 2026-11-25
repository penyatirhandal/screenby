import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { Icon, type IconName } from './Icon';

interface ShortcutButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  size?: number;
  accessibilityHint?: string;
}

export function ShortcutButton({
  icon,
  label,
  onPress,
  active = false,
  size = 48,
  accessibilityHint,
}: ShortcutButtonProps): React.JSX.Element {
  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ selected: active }}
        android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true }}
        hitSlop={8}
        style={({ pressed }) => [
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          active && styles.buttonActive,
          pressed && styles.buttonPressed,
        ]}
      >
        <Icon
          name={icon}
          size={size * 0.46}
          color={active ? colors.tertiary : colors.textPrimary}
          filled={active}
        />
      </Pressable>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 6,
    minWidth: 58,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  buttonActive: {
    backgroundColor: colors.tertiarySoft,
    borderColor: 'rgba(230, 194, 121, 0.5)',
  },
  buttonPressed: {
    opacity: 0.72,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
});
