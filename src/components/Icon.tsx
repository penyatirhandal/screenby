import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { fonts } from '../theme/typography';

/**
 * Subset of Material Symbols bundled with the app. Codepoints are reduced to their
 * UTF-16 glyphs at runtime; keeping the map here also makes the icon set auditable.
 */
const GLYPHS = {
  signal: 0xe202,
  signalOff: 0xe1d0,
  wifi: 0xe63e,
  wifiOff: 0xe648,
  calendar: 0xebcc,
  swipeUp: 0xeacf,
  lock: 0xe899,
  flashlightOn: 0xf00b,
  flashlightOff: 0xf00a,
  camera: 0xe412,
  wallpaper: 0xe1bc,
  image: 0xe3f4,
  close: 0xe5cd,
  check: 0xe668,
  zoomIn: 0xe8ff,
  zoomOut: 0xe900,
  reset: 0xf053,
  trash: 0xe92e,
  globe: 0xe80b,
  gallery: 0xe413,
  bolt: 0xea0b,
  batteryFull: 0xe1a5,
  batteryCharging: 0xe1a3,
  battery0: 0xebdc,
  battery1: 0xf09c,
  battery2: 0xf09d,
  battery3: 0xf09e,
  battery4: 0xf09f,
  battery5: 0xf0a0,
  battery6: 0xf0a1,
} as const;

export type IconName = keyof typeof GLYPHS;

export function batteryIcon(level: number, charging: boolean): IconName {
  if (charging) {
    return 'batteryCharging';
  }
  if (level < 0 || level >= 96) {
    return 'batteryFull';
  }
  if (level >= 82) {
    return 'battery6';
  }
  if (level >= 66) {
    return 'battery5';
  }
  if (level >= 50) {
    return 'battery4';
  }
  if (level >= 34) {
    return 'battery3';
  }
  if (level >= 18) {
    return 'battery2';
  }
  if (level >= 6) {
    return 'battery1';
  }
  return 'battery0';
}

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
  style?: StyleProp<TextStyle>;
}

export function Icon({
  name,
  size = 22,
  color = '#FFFFFF',
  filled = false,
  style,
}: IconProps): React.JSX.Element {
  return (
    <Text
      allowFontScaling={false}
      style={[
        styles.iconText,
        {
          fontFamily: filled ? fonts.iconFilled : fonts.icon,
          fontSize: size,
          lineHeight: Math.ceil(size * 1.15),
          color,
        },
        style,
      ]}
    >
      {String.fromCodePoint(GLYPHS[name])}
    </Text>
  );
}

const styles = StyleSheet.create({
  iconText: {
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
