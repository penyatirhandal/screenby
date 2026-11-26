import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  DesktopWidget,
  FontChoice,
  FontSizeChoice,
  LauncherSettings,
} from '../types';

const STORAGE_KEY = '@nexus/launcher/settings/v1';

export const DESKTOP_WIDGETS: DesktopWidget[] = [
  'clock',
  'date',
  'battery',
  'network',
];

export const DEFAULT_SETTINGS: LauncherSettings = {
  font: 'inter',
  fontSize: 'normal',
  desktopWidgets: [...DESKTOP_WIDGETS],
};

const FONTS: FontChoice[] = ['hack', 'inter', 'arial'];
const SIZES: FontSizeChoice[] = ['small', 'normal', 'large', 'xlarge'];

function sanitizeWidgets(value: unknown): DesktopWidget[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_SETTINGS.desktopWidgets];
  }
  const allowed = new Set<DesktopWidget>(DESKTOP_WIDGETS);
  const seen = new Set<DesktopWidget>();
  for (const item of value) {
    if (typeof item === 'string' && allowed.has(item as DesktopWidget)) {
      seen.add(item as DesktopWidget);
    }
  }
  // Preserve the fixed dashboard order regardless of stored order.
  return DESKTOP_WIDGETS.filter(widget => seen.has(widget));
}

export async function loadSettings(): Promise<LauncherSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS, desktopWidgets: [...DESKTOP_WIDGETS] };
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_SETTINGS, desktopWidgets: [...DESKTOP_WIDGETS] };
    }
    const candidate = parsed as Partial<LauncherSettings>;
    return {
      font: FONTS.includes(candidate.font as FontChoice)
        ? (candidate.font as FontChoice)
        : DEFAULT_SETTINGS.font,
      fontSize: SIZES.includes(candidate.fontSize as FontSizeChoice)
        ? (candidate.fontSize as FontSizeChoice)
        : DEFAULT_SETTINGS.fontSize,
      desktopWidgets: sanitizeWidgets(candidate.desktopWidgets),
    };
  } catch {
    return { ...DEFAULT_SETTINGS, desktopWidgets: [...DESKTOP_WIDGETS] };
  }
}

export async function saveSettings(
  settings: LauncherSettings,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
