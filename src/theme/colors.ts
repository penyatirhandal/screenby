/**
 * Nexus Lock Screen palette (PRD §3.2) plus a few translucent helpers used by the
 * glassmorphism surfaces.
 */
export const colors = {
  background: '#121316',
  surface: '#1F1F22',
  surfaceElevated: '#292A2D',
  primary: '#B0C7F7',
  tertiary: '#E6C279',

  textPrimary: '#F4F5F8',
  textSecondary: '#C4C6CF',
  textMuted: '#8E919B',

  success: '#9BD4A8',
  danger: '#F0A6A6',

  white: '#FFFFFF',
  transparent: 'transparent',

  glass: 'rgba(31, 31, 34, 0.55)',
  glassStrong: 'rgba(31, 31, 34, 0.82)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  glassHighlight: 'rgba(255, 255, 255, 0.06)',

  primarySoft: 'rgba(176, 199, 247, 0.16)',
  primaryBorder: 'rgba(176, 199, 247, 0.42)',
  tertiarySoft: 'rgba(230, 194, 121, 0.16)',

  scrimTop: 'rgba(8, 9, 12, 0.55)',
  scrimBottom: 'rgba(8, 9, 12, 0.82)',
  scrimSide: 'rgba(8, 9, 12, 0.48)',
  scrimClear: 'rgba(8, 9, 12, 0)',
} as const;
