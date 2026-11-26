import type { WallpaperColors } from '../types';
import { colors as defaultColors, type LauncherPalette } from './colors';

type Rgb = { r: number; g: number; b: number };

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

function parseHex(value: string | null | undefined): Rgb | null {
  if (!value) {
    return null;
  }
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) {
    return null;
  }
  const int = parseInt(match[1], 16);
  return {
    r: Math.floor(int / 65536),
    g: Math.floor((int % 65536) / 256),
    b: int % 256,
  };
}

function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  const t = Math.min(Math.max(amount, 0), 1);
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function toHex(color: Rgb): string {
  return (
    '#' +
    [color.r, color.g, color.b]
      .map(channel => channel.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function rgba(color: Rgb, alpha: number): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

/**
 * Builds a dark Material You style palette from the colors Android extracts
 * from the system wallpaper. Every value is derived; nothing is invented when
 * the OS cannot provide wallpaper colors.
 */
export function buildLauncherPalette(
  source: WallpaperColors | null,
): LauncherPalette {
  const primarySource =
    parseHex(source?.primary) ?? parseHex(defaultColors.primary) ?? WHITE;
  const secondarySource =
    parseHex(source?.secondary) ?? mix(primarySource, WHITE, 0.16);
  const tertiarySource =
    parseHex(source?.tertiary) ?? mix(secondarySource, WHITE, 0.22);

  // Keep accents legible on dark glass surfaces while preserving the hue.
  const primary = mix(primarySource, WHITE, 0.34);
  const tertiary = mix(tertiarySource, WHITE, 0.24);
  const surface = mix(primarySource, BLACK, 0.9);
  const surfaceElevated = mix(surface, WHITE, 0.07);
  const background = mix(surface, BLACK, 0.55);
  const scrim = mix(surface, BLACK, 0.72);

  return {
    background: toHex(background),
    surface: toHex(surface),
    surfaceElevated: toHex(surfaceElevated),
    primary: toHex(primary),
    tertiary: toHex(tertiary),

    textPrimary: '#F4F5F8',
    textSecondary: toHex(mix(secondarySource, WHITE, 0.62)),
    textMuted: toHex(mix(secondarySource, BLACK, 0.08)),

    success: '#9BD4A8',
    danger: '#F0A6A6',

    white: '#FFFFFF',
    transparent: 'transparent',

    glass: rgba(surface, 0.62),
    glassStrong: rgba(surface, 0.88),
    glassBorder: rgba(WHITE, 0.12),
    glassHighlight: rgba(WHITE, 0.06),

    primarySoft: rgba(primary, 0.16),
    primaryBorder: rgba(primary, 0.42),
    tertiarySoft: rgba(tertiary, 0.16),

    scrimTop: rgba(scrim, 0.62),
    scrimBottom: rgba(scrim, 0.88),
    scrimSide: rgba(scrim, 0.56),
    scrimClear: rgba(scrim, 0),
  };
}
