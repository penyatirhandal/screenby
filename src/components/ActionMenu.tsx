import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
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
        <Pressable
          style={[
            styles.panel,
            {
              backgroundColor: palette.glassStrong,
              borderColor: palette.glassBorder,
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
            <Pressable
              key={option.label}
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
            </Pressable>
          ))}
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
