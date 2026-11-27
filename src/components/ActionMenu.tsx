import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { Focusable } from '../gamepad/GamepadProvider';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { colors } from '../theme/colors';
import { useLauncherPalette } from '../theme/ThemeContext';
import { useTypography } from '../theme/TypographyContext';
import type { IconName } from './Icon';
import { Icon } from './Icon';

export interface MenuOption {
  label: string;
  icon?: IconName;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionMenuProps {
  visible: boolean;
  title?: string;
  options: MenuOption[];
  onClose: () => void;
}

export function ActionMenu({
  visible,
  title,
  options,
  onClose,
}: ActionMenuProps): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  const reduceMotion = useReduceMotion();
  const enter = useRef(new Animated.Value(0)).current;
  // The menu opens beneath the finger that long-pressed a card. Ignore the
  // release of that same gesture so it cannot immediately activate an option.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!visible) {
      setReady(false);
      return;
    }
    const timer = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      enter.setValue(0);
      return;
    }
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    enter.setValue(0);
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [enter, reduceMotion, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        disabled={!ready}
      >
        <Pressable style={styles.panelHost} onPress={() => undefined}>
          <Animated.View
            style={[
              styles.panel,
              {
                backgroundColor: palette.glassStrong,
                borderColor: palette.glassBorder,
                opacity: enter,
                transform: [
                  {
                    scale: enter.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1],
                    }),
                  },
                ],
              },
            ]}
            accessibilityRole="menu"
          >
          {title ? (
            <Text
              style={[
                styles.title,
                {
                  color: palette.textMuted,
                  fontSize: scaled(11),
                  fontFamily: fonts.bodyBold,
                },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}
          {options.map(option => (
            <Focusable
              key={option.label}
              id={`menu:${option.label}`}
              enabled={visible && ready}
              layer={10}
              style={({ pressed }) => [
                styles.option,
                pressed && styles.optionPressed,
              ]}
              onPress={() => {
                onClose();
                option.onPress();
              }}
              disabled={!ready}
              accessibilityRole="menuitem"
              accessibilityLabel={option.label}
            >
              {option.icon ? (
                <Icon
                  name={option.icon}
                  size={scaled(18)}
                  color={
                    option.destructive ? palette.danger : palette.primary
                  }
                />
              ) : null}
              <Text
                style={[
                  styles.optionText,
                  {
                    color: option.destructive
                      ? palette.danger
                      : palette.textPrimary,
                    fontSize: scaled(15),
                    fontFamily: fonts.body,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Focusable>
          ))}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scrimBottom,
    padding: 24,
  },
  panelHost: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    width: 280,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
    gap: 2,
  },
  title: {
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  optionPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  optionText: {
    flexShrink: 1,
  },
});
