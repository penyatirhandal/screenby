import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BatteryState, NetworkState } from '../types';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { batteryIcon, Icon, type IconName } from './Icon';

interface StatusBarProps {
  battery: BatteryState | null;
  network: NetworkState | null;
  onOpenWallpaper: () => void;
}

interface NetworkPresentation {
  icon: IconName;
  label: string;
}

function presentNetwork(network: NetworkState | null): NetworkPresentation {
  if (!network) {
    return { icon: 'signalOff', label: 'Memeriksa' };
  }
  if (!network.connected || network.type === 'none') {
    return { icon: 'signalOff', label: 'Offline' };
  }
  switch (network.type) {
    case 'wifi':
      return { icon: 'wifi', label: 'Wi-Fi' };
    case 'cellular':
      return {
        icon: 'signal',
        label: network.cellularGeneration
          ? `${network.cellularGeneration} · Seluler`
          : 'Seluler',
      };
    case 'ethernet':
      return { icon: 'signal', label: 'Ethernet' };
    case 'vpn':
      return { icon: 'globe', label: 'VPN' };
    default:
      return { icon: 'signalOff', label: 'Offline' };
  }
}

export function StatusBar({
  battery,
  network,
  onOpenWallpaper,
}: StatusBarProps): React.JSX.Element {
  const connection = presentNetwork(network);
  const level = battery?.level ?? -1;

  return (
    <View style={styles.row}>
      <View
        style={styles.pill}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Koneksi ${connection.label}`}
      >
        <Icon
          name={connection.icon}
          size={16}
          color={network?.connected ? colors.textSecondary : colors.textMuted}
        />
        <Text style={styles.networkText} numberOfLines={1}>
          {connection.label}
        </Text>
        {network?.connected && !network.validated ? (
          <View style={styles.warningDot} />
        ) : null}
      </View>

      <View style={styles.rightGroup}>
        <View
          style={styles.pill}
          accessible
          accessibilityRole="text"
          accessibilityLabel={
            level >= 0 ? `Baterai ${level} persen` : 'Baterai tidak diketahui'
          }
        >
          <Icon
            name={batteryIcon(level, battery?.charging ?? false)}
            size={17}
            color={battery?.charging ? colors.tertiary : colors.textSecondary}
          />
          <Text style={styles.batteryText}>
            {level >= 0 ? `${level}%` : '--%'}
          </Text>
        </View>

        <Pressable
          onPress={onOpenWallpaper}
          accessibilityRole="button"
          accessibilityLabel="Atur wallpaper"
          hitSlop={8}
          android_ripple={{ color: 'rgba(255,255,255,0.14)', borderless: true }}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Icon name="wallpaper" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    maxWidth: 220,
  },
  networkText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.3,
    color: colors.textSecondary,
  },
  warningDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.tertiary,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batteryText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
