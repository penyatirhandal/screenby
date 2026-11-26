import type { FontChoice, FontSizeChoice, LauncherSettings } from '../types';

/**
 * Font families are bundled as Android assets:
 * android/app/src/main/assets/fonts/<name>.ttf
 *
 * The regular/bold slots are mutated by Settings so every component that reads
 * `fonts.*` picks up the new family on the next render.
 */
export const FONT_OPTIONS: Record<
  FontChoice,
  { label: string; regular: string; bold: string }
> = {
  hack: {
    label: 'Hack',
    regular: 'Hack-Regular',
    bold: 'Hack-Bold',
  },
  inter: {
    label: 'Inter',
    regular: 'Inter',
    bold: 'Inter',
  },
  arial: {
    label: 'Arial (Liberation Sans)',
    regular: 'LiberationSans-Regular',
    bold: 'LiberationSans-Bold',
  },
};

export const FONT_SIZE_OPTIONS: Record<
  FontSizeChoice,
  { label: string; scale: number }
> = {
  small: { label: 'Kecil', scale: 0.9 },
  normal: { label: 'Normal', scale: 1 },
  large: { label: 'Besar', scale: 1.12 },
  xlarge: { label: 'Sangat Besar', scale: 1.25 },
};

export const fonts: Record<string, string> = {
  display: FONT_OPTIONS.inter.bold,
  displayBold: FONT_OPTIONS.inter.bold,
  displaySemiBold: FONT_OPTIONS.inter.bold,
  displayMedium: FONT_OPTIONS.inter.regular,

  body: FONT_OPTIONS.inter.regular,
  bodyMedium: FONT_OPTIONS.inter.regular,
  bodySemiBold: FONT_OPTIONS.inter.bold,
  bodyBold: FONT_OPTIONS.inter.bold,

  icon: 'MaterialSymbolsOutlined',
  iconFilled: 'MaterialSymbolsFilled',
};

export const typography = {
  scale: 1,
  /** Scales a design fontSize by the user's chosen preset. */
  scaled(size: number): number {
    return Math.max(8, Math.round(size * this.scale));
  },
};

export function applyTypography(settings: LauncherSettings): void {
  const option = FONT_OPTIONS[settings.font];
  fonts.display = option.bold;
  fonts.displayBold = option.bold;
  fonts.displaySemiBold = option.bold;
  fonts.displayMedium = option.regular;
  fonts.body = option.regular;
  fonts.bodyMedium = option.regular;
  fonts.bodySemiBold = option.bold;
  fonts.bodyBold = option.bold;
  typography.scale = FONT_SIZE_OPTIONS[settings.fontSize].scale;
}

export const letterSpacing = {
  tight: -1,
  wide: 1.6,
} as const;
