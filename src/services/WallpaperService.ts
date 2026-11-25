import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import type { CropState, Wallpaper } from '../types';
import { DEFAULT_CROP, sanitizeCrop } from '../utils/smartCrop';
import { NexusNative } from './NexusNative';

const STORAGE_KEY = '@nexus/lock-screen/wallpaper/v1';

function parseWallpaper(raw: string): Wallpaper | null {
  try {
    const parsed = JSON.parse(raw) as Partial<Wallpaper>;
    if (
      typeof parsed.path !== 'string' ||
      typeof parsed.width !== 'number' ||
      typeof parsed.height !== 'number' ||
      parsed.width <= 0 ||
      parsed.height <= 0
    ) {
      return null;
    }
    return {
      path: parsed.path,
      width: parsed.width,
      height: parsed.height,
      crop: sanitizeCrop(parsed.crop),
    };
  } catch {
    return null;
  }
}

/**
 * Loads the persisted wallpaper. A wallpaper whose file disappeared (cache clean,
 * uninstall leftovers, ...) is dropped so the UI can fall back gracefully.
 */
export async function loadWallpaper(): Promise<Wallpaper | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const wallpaper = parseWallpaper(raw);
    if (!wallpaper) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const exists = await NexusNative.fileExists(wallpaper.path);
    if (!exists) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return wallpaper;
  } catch {
    return null;
  }
}

/**
 * Opens the system photo picker and imports the chosen image into app-private storage.
 * Returns null when the user cancels.
 */
export async function pickWallpaper(): Promise<Wallpaper | null> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    includeBase64: false,
    quality: 1,
  });

  if (result.didCancel) {
    return null;
  }

  if (result.errorCode) {
    throw new Error(result.errorMessage ?? 'Galeri tidak dapat dibuka.');
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new Error('Tidak ada gambar yang dipilih.');
  }

  const imported = await NexusNative.saveWallpaper(asset.uri);
  const wallpaper: Wallpaper = {
    path: imported.path,
    width: imported.width,
    height: imported.height,
    crop: { ...DEFAULT_CROP },
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(wallpaper));
  return wallpaper;
}

export async function persistCrop(
  wallpaper: Wallpaper,
  crop: CropState,
): Promise<Wallpaper> {
  const next: Wallpaper = { ...wallpaper, crop: sanitizeCrop(crop) };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function removeWallpaper(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  try {
    await NexusNative.clearWallpapers();
  } catch {
    // The stored reference is already gone; leftover files are harmless.
  }
}

/** React Native Image needs a URI with the file scheme. */
export function wallpaperUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}
