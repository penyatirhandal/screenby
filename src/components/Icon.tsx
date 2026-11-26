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

  apps: 0xe5c3,
  search: 0xef7a,
  play: 0xe037,
  pause: 0xe034,
  skipNext: 0xe044,
  skipPrevious: 0xe045,
  musicNote: 0xe405,
  edit: 0xf097,
  pin: 0xf10d,
  back: 0xe5c4,
  settings: 0xe8b8,
  esports: 0xea28,
  chevronLeft: 0xe314,
  chevronRight: 0xe315,
  forward: 0xe5c8,
  favorite: 0xe87e,
  star: 0xf09a,
  home: 0xe9b2,
  more: 0xe5d4,
  add: 0xe145,
  font: 0xe167,
  palette: 0xe40a,
  textFields: 0xe262,
  schedule: 0xefd6,
  gamepad: 0xe338,
  android: 0xe859,
  grid: 0xe9b0,
  info: 0xe88e,
  person: 0xf0d3,
  gamepadAlt: 0xe30f,
  tune: 0xe429,
  autoAwesome: 0xe65f,
  download: 0xf090,
  help: 0xe8fd,
  logout: 0xe9ba,
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
