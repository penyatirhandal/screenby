import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FontChoice, FontSizeChoice, LauncherSettings } from '../types';

const STORAGE_KEY = '@nexus/launcher/settings/v1';

export const DEFAULT_SETTINGS: LauncherSettings = {
  font: 'inter',
  fontSize: 'normal',
};

const FONTS: FontChoice[] = ['hack', 'inter', 'arial'];
const SIZES: FontSizeChoice[] = ['small', 'normal', 'large', 'xlarge'];

export async function loadSettings(): Promise<LauncherSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_SETTINGS };
    }
    const candidate = parsed as Partial<LauncherSettings>;
    return {
      font: FONTS.includes(candidate.font as FontChoice)
        ? (candidate.font as FontChoice)
        : DEFAULT_SETTINGS.font,
      fontSize: SIZES.includes(candidate.fontSize as FontSizeChoice)
        ? (candidate.fontSize as FontSizeChoice)
        : DEFAULT_SETTINGS.fontSize,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(
  settings: LauncherSettings,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
