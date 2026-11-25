import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { Icon } from './Icon';

interface ClockWidgetProps {
  time: string;
  timezone: string;
  /** Responsive font size computed from the available landscape height. */
  size: number;
}

export function ClockWidget({
  time,
  timezone,
  size,
}: ClockWidgetProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[
          styles.time,
          {
            fontSize: size,
            lineHeight: size * 1.04,
            letterSpacing: -size * 0.035,
          },
        ]}
        accessibilityRole="text"
        accessibilityLabel={`Pukul ${time}`}
      >
        {time}
      </Text>

      <View style={styles.timezoneRow}>
        <Icon name="globe" size={14} color={colors.textMuted} />
        <Text style={styles.timezoneText} numberOfLines={1}>
          {timezone}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  time: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  timezoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    paddingLeft: 2,
  },
  timezoneText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
});
