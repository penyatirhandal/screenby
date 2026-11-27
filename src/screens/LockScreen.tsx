import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  batteryIcon,
  Icon,
  type IconName,
} from '../components/Icon';
import { SwipeUpUnlock } from '../components/SwipeUpUnlock';
import { WallpaperBackdrop } from '../components/WallpaperBackdrop';
import { Focusable } from '../gamepad/GamepadProvider';
import { useBattery } from '../hooks/useBattery';
import { useClock } from '../hooks/useClock';
import { useFlashlight } from '../hooks/useFlashlight';
import { useNetwork } from '../hooks/useNetwork';
import { NexusNative } from '../services/NexusNative';
import { withAlpha } from '../theme/colorUtils';
import { useLauncherPalette } from '../theme/ThemeContext';
import { useTypography } from '../theme/TypographyContext';
import type { NetworkState, Wallpaper } from '../types';
import { computeCoverLayout } from '../utils/smartCrop';

interface LockScreenProps {
  wallpaper: Wallpaper | null;
  onUnlock: () => void;
  onOpenSettings: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function presentNetwork(network: NetworkState | null): {
  icon: IconName;
  label: string;
} {
  if (!network || !network.connected || network.type === 'none') {
    return { icon: 'signalOff', label: 'Offline' };
  }
  if (network.type === 'wifi') {
    return { icon: 'wifi', label: 'Wi-Fi' };
  }
  if (network.type === 'vpn') {
    return { icon: 'globe', label: 'VPN' };
  }
  if (network.type === 'cellular') {
    return {
      icon: 'signal',
      label: network.cellularGeneration ?? 'Seluler',
    };
  }
  return { icon: 'signal', label: 'Ethernet' };
}

export function LockScreen({
  wallpaper,
  onUnlock,
  onOpenSettings,
}: LockScreenProps): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const clock = useClock();
  const battery = useBattery();
  const network = useNetwork();
  const flashlight = useFlashlight();

  const [imageFailed, setImageFailed] = useState(false);
  const compact = height < 400;
  const clockSize = clamp(height * 0.24, 62, 150);

  const wallpaperLayout = useMemo(() => {
    if (!wallpaper) {
      return null;
    }
    return computeCoverLayout(
      wallpaper.width,
      wallpaper.height,
      width,
      height,
      wallpaper.crop,
    );
  }, [wallpaper, width, height]);

  useEffect(() => {
    setImageFailed(false);
  }, [wallpaper?.path]);

  const handleFlashlight = useCallback(async () => {
    if (flashlight.available === false) {
      Alert.alert(
        'Senter tidak tersedia',
        'Perangkat ini tidak memiliki lampu kilat.',
      );
      return;
    }
    try {
      await flashlight.toggle();
    } catch {
      Alert.alert('Senter tidak dapat digunakan', 'Silakan coba lagi.');
    }
  }, [flashlight]);

  const handleCamera = useCallback(async () => {
    try {
      await NexusNative.openCamera();
    } catch {
      Alert.alert('Kamera tidak tersedia', 'Silakan coba lagi.');
    }
  }, []);

  const connection = presentNetwork(network);
  const level = battery?.level ?? -1;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.background }]}>
      <WallpaperBackdrop
        wallpaper={wallpaper}
        layout={wallpaperLayout}
        failed={imageFailed}
        onError={() => setImageFailed(true)}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          withAlpha(palette.background, 0.56),
          withAlpha(palette.background, 0.12),
          withAlpha(palette.background, 0.88),
        ]}
        locations={[0, 0.36, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: Math.max(12, insets.top + 8),
            paddingBottom: Math.max(10, insets.bottom + 8),
            paddingHorizontal: Math.max(20, insets.left + 16),
          },
        ]}
      >
        <View style={styles.statusRow}>
          <View style={styles.statusChip}>
            <Icon
              name={connection.icon}
              size={scaled(14)}
              color={network?.connected ? palette.primary : palette.textMuted}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: palette.textSecondary,
                  fontFamily: fonts.body,
                  fontSize: scaled(11),
                },
              ]}
              numberOfLines={1}
            >
              {connection.label}
            </Text>
          </View>
          <View style={styles.statusChip}>
            <Icon
              name={batteryIcon(level, battery?.charging ?? false)}
              size={scaled(15)}
              color={battery?.charging ? palette.tertiary : palette.primary}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: palette.textSecondary,
                  fontFamily: fonts.body,
                  fontSize: scaled(11),
                },
              ]}
            >
              {level >= 0 ? `${level}%` : '--%'}
            </Text>
          </View>
          <Focusable
            id="lock:settings"
            onPress={onOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Atur wallpaper"
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: palette.glass, borderColor: palette.glassBorder },
              pressed && styles.pressed,
            ]}
          >
            <Icon name="wallpaper" size={scaled(18)} color={palette.textSecondary} />
          </Focusable>
        </View>

        <View style={styles.mainRow}>
          <View style={styles.clockColumn}>
            <Text
              style={[
                styles.date,
                {
                  color: palette.primary,
                  fontFamily: fonts.bodySemiBold,
                  fontSize: scaled(compact ? 12 : 14),
                },
              ]}
              numberOfLines={1}
            >
              {clock.date}
            </Text>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[
                styles.time,
                {
                  color: palette.textPrimary,
                  fontFamily: fonts.displayBold,
                  fontSize: scaled(clockSize),
                  lineHeight: scaled(clockSize) * 1.02,
                },
              ]}
              accessibilityLabel={`Pukul ${clock.time}`}
            >
              {clock.time}
            </Text>
            <Text
              style={[
                styles.timezone,
                {
                  color: palette.textMuted,
                  fontFamily: fonts.body,
                  fontSize: scaled(11),
                },
              ]}
            >
              {clock.timezone}
            </Text>
          </View>

          <View
            style={[
              styles.batteryCard,
              {
                backgroundColor: withAlpha(palette.background, 0.52),
                borderColor: palette.glassBorder,
              },
            ]}
          >
            <Icon
              name={batteryIcon(level, battery?.charging ?? false)}
              size={scaled(30)}
              color={palette.tertiary}
            />
            <Text
              style={[
                styles.batteryValue,
                {
                  color: palette.textPrimary,
                  fontFamily: fonts.displayBold,
                  fontSize: scaled(34),
                },
              ]}
            >
              {level >= 0 ? `${level}%` : '--%'}
            </Text>
            <Text
              style={[
                styles.batteryLabel,
                {
                  color: palette.textMuted,
                  fontFamily: fonts.body,
                  fontSize: scaled(11),
                },
              ]}
            >
              {battery?.charging ? 'Mengisi daya' : 'Sisa daya'}
            </Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.shortcutSlot}>
            <Focusable
              id="lock:flashlight"
              onPress={handleFlashlight}
              accessibilityRole="button"
              accessibilityLabel={
                flashlight.enabled ? 'Matikan senter' : 'Nyalakan senter'
              }
              style={({ pressed }) => [
                styles.shortcut,
                { backgroundColor: palette.glass, borderColor: palette.glassBorder },
                pressed && styles.pressed,
              ]}
            >
              <Icon
                name={flashlight.enabled ? 'flashlightOn' : 'flashlightOff'}
                size={scaled(20)}
                color={flashlight.enabled ? palette.tertiary : palette.textSecondary}
              />
              <Text
                style={[
                  styles.shortcutLabel,
                  {
                    color: palette.textSecondary,
                    fontFamily: fonts.body,
                    fontSize: scaled(10),
                  },
                ]}
              >
                Senter
              </Text>
            </Focusable>
          </View>

          <View style={styles.swipeSlot}>
            <Focusable
              id="lock:unlock"
              priority={1}
              onPress={onUnlock}
              ringRadius={21}
            >
              <SwipeUpUnlock
                onUnlock={onUnlock}
                compact={compact}
                label="Geser ke atas untuk membuka"
                icon="lock"
                accessibilityLabel="Buka launcher"
              />
            </Focusable>
          </View>

          <View style={[styles.shortcutSlot, styles.shortcutEnd]}>
            <Focusable
              id="lock:camera"
              onPress={handleCamera}
              accessibilityRole="button"
              accessibilityLabel="Buka kamera"
              style={({ pressed }) => [
                styles.shortcut,
                { backgroundColor: palette.glass, borderColor: palette.glassBorder },
                pressed && styles.pressed,
              ]}
            >
              <Icon
                name="camera"
                size={scaled(20)}
                color={palette.textSecondary}
              />
              <Text
                style={[
                  styles.shortcutLabel,
                  {
                    color: palette.textSecondary,
                    fontFamily: fonts.body,
                    fontSize: scaled(10),
                  },
                ]}
              >
                Kamera
              </Text>
            </Focusable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderColor: 'rgba(255,255,255,0.14)',
    maxWidth: 180,
  },
  statusText: {
    maxWidth: 120,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginLeft: 'auto',
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    paddingVertical: 6,
  },
  clockColumn: {
    flexShrink: 1,
    gap: 2,
  },
  date: {
    letterSpacing: 0.6,
  },
  time: {
    fontVariant: ['tabular-nums'],
    letterSpacing: -3,
  },
  timezone: {
    letterSpacing: 0.5,
  },
  batteryCard: {
    width: 210,
    minHeight: 150,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  batteryValue: {
    fontVariant: ['tabular-nums'],
  },
  batteryLabel: {
    letterSpacing: 0.5,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    gap: 12,
  },
  shortcutSlot: {
    width: 82,
    alignItems: 'flex-start',
  },
  shortcutEnd: {
    alignItems: 'flex-end',
  },
  shortcut: {
    width: 72,
    height: 54,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  shortcutLabel: {
    textAlign: 'center',
  },
  swipeSlot: {
    flex: 1,
    maxWidth: 460,
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
});
