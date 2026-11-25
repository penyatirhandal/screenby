import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BatteryState, PluggedSource } from '../types';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { batteryIcon, Icon } from './Icon';

interface BatteryCardProps {
  battery: BatteryState | null;
  width: number;
}

function statusLabel(battery: BatteryState | null): string {
  if (!battery) {
    return 'Menunggu data sistem';
  }
  switch (battery.status) {
    case 'charging':
      return 'Mengisi daya';
    case 'full':
      return 'Terisi penuh';
    case 'not_charging':
      return 'Tidak mengisi';
    case 'discharging':
      return 'Sisa daya';
    default:
      return 'Status tidak diketahui';
  }
}

function sourceLabel(plugged: PluggedSource): string | null {
  switch (plugged) {
    case 'ac':
      return 'Adaptor';
    case 'usb':
      return 'USB';
    case 'wireless':
      return 'Nirkabel';
    default:
      return null;
  }
}

export function BatteryCard({
  battery,
  width,
}: BatteryCardProps): React.JSX.Element {
  const level = battery?.level ?? -1;
  const charging = battery?.charging ?? false;
  const source = battery ? sourceLabel(battery.plugged) : null;
  const progress = Math.max(0, Math.min(level, 100));

  return (
    <View
      style={[styles.card, { width }]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={
        battery
          ? `Baterai ${level} persen, ${statusLabel(battery)}`
          : 'Informasi baterai belum tersedia'
      }
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Icon
            name={batteryIcon(level, charging)}
            size={20}
            color={charging ? colors.tertiary : colors.primary}
          />
        </View>
        <Text style={styles.label}>DAYA BATERAI</Text>
      </View>

      <View style={styles.valueRow}>
        <Text
          allowFontScaling={false}
          style={[styles.value, charging && styles.valueCharging]}
        >
          {level >= 0 ? level : '--'}
        </Text>
        <Text style={styles.percent}>%</Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${progress}%`,
              backgroundColor: charging ? colors.tertiary : colors.primary,
            },
          ]}
        />
      </View>

      <View style={styles.statusRow}>
        <Icon
          name={charging ? 'bolt' : 'batteryFull'}
          size={15}
          color={charging ? colors.tertiary : colors.textMuted}
        />
        <Text style={styles.statusText}>{statusLabel(battery)}</Text>
        {source ? (
          <>
            <View style={styles.dot} />
            <Text style={styles.sourceText}>{source}</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 24,
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.textMuted,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  value: {
    fontFamily: fonts.displayBold,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -2,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  valueCharging: {
    color: colors.tertiary,
  },
  percent: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 17,
    color: colors.textSecondary,
    marginLeft: 3,
    marginBottom: 8,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    marginTop: 6,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  statusText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    marginHorizontal: 1,
  },
  sourceText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
});
