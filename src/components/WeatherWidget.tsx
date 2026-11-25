import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { Icon } from './Icon';

interface WeatherWidgetProps {
  date: string;
}

/**
 * Date + weather chip from the PRD layout. Real-time weather is explicitly a future
 * feature, so this chip only renders date information coming from the device clock.
 */
export function WeatherWidget({ date }: WeatherWidgetProps): React.JSX.Element {
  return (
    <View
      style={styles.chip}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Tanggal ${date}`}
    >
      <Icon name="calendar" size={15} color={colors.primary} />
      <Text style={styles.text} numberOfLines={1}>
        {date}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 13,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  text: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    letterSpacing: 0.2,
    color: colors.textSecondary,
  },
});
