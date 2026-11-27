import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import type { CropState, Wallpaper, WallpaperSet, WallpaperSlot } from '../types';
import { DEFAULT_CROP, sanitizeCrop } from '../utils/smartCrop';
import { NexusNative } from './NexusNative';

const LEGACY_STORAGE_KEY = '@nexus/lock-screen/wallpaper/v1';

/** Home and Lock Screen keep independent wallpaper references. */
export const WALLPAPER_STORAGE_KEYS: Record<WallpaperSlot, string> = {
  home: '@nexus/lock-screen/wallpaper/home/v2',
  lock: '@nexus/lock-screen/wallpaper/lock/v2',
};

function parseWallpaper(raw: string | null): Wallpaper | null {
  if (!raw) {
    return null;
  }
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

async function readStoredWallpaper(key: string): Promise<Wallpaper | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const wallpaper = parseWallpaper(raw);
    if (!raw) {
      return null;
    }
    if (!wallpaper) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    const exists = await NexusNative.fileExists(wallpaper.path);
    if (!exists) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return wallpaper;
  } catch {
    return null;
  }
}

async function writeWallpaper(
  slot: WallpaperSlot,
  wallpaper: Wallpaper,
): Promise<void> {
  await AsyncStorage.setItem(
    WALLPAPER_STORAGE_KEYS[slot],
    JSON.stringify(wallpaper),
  );
}

/**
 * Loads both wallpaper slots. The first run after upgrading from the shared
 * wallpaper build copies the old image into both slots so nothing disappears.
 */
export async function loadWallpapers(): Promise<WallpaperSet> {
  const [home, lock] = await Promise.all([
    readStoredWallpaper(WALLPAPER_STORAGE_KEYS.home),
    readStoredWallpaper(WALLPAPER_STORAGE_KEYS.lock),
  ]);

  if (home || lock) {
    return { home, lock };
  }

  const legacy = await readStoredWallpaper(LEGACY_STORAGE_KEY);
  if (!legacy) {
    return { home: null, lock: null };
  }

  try {
    await Promise.all([
      writeWallpaper('home', legacy),
      writeWallpaper('lock', legacy),
      AsyncStorage.removeItem(LEGACY_STORAGE_KEY),
    ]);
  } catch {
    // The in-memory result is still usable even if persistence fails.
  }

  return { home: legacy, lock: legacy };
}

/**
 * Opens the system photo picker and imports the chosen image into the requested
 * slot. Returns null when the user cancels.
 */
export async function pickWallpaper(
  slot: WallpaperSlot,
): Promise<Wallpaper | null> {
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

  const imported = await NexusNative.saveWallpaper(asset.uri, slot);
  const wallpaper: Wallpaper = {
    path: imported.path,
    width: imported.width,
    height: imported.height,
    crop: { ...DEFAULT_CROP },
  };

  await writeWallpaper(slot, wallpaper);
  return wallpaper;
}

export async function persistCrop(
  slot: WallpaperSlot,
  wallpaper: Wallpaper,
  crop: CropState,
): Promise<Wallpaper> {
  const next: Wallpaper = { ...wallpaper, crop: sanitizeCrop(crop) };
  await writeWallpaper(slot, next);
  return next;
}

/**
 * Removes one slot. A file that is still referenced by the other slot (the
 * legacy shared wallpaper) is kept so the other screen does not go blank.
 */
export async function removeWallpaper(
  slot: WallpaperSlot,
  previous: Wallpaper | null,
  other: Wallpaper | null,
): Promise<void> {
  await AsyncStorage.removeItem(WALLPAPER_STORAGE_KEYS[slot]);

  if (previous && previous.path !== other?.path) {
    await NexusNative.deleteFile(previous.path).catch(() => false);
  }

  try {
    await NexusNative.clearWallpaper(slot);
  } catch {
    // The stored reference is already gone; leftover files are harmless.
  }
}

/** React Native Image needs a URI with the file scheme. */
export function wallpaperUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}
