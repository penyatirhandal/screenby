import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { NexusNative } from '../src/services/NexusNative';
import {
  loadWallpapers,
  persistCrop,
  pickWallpaper,
  removeWallpaper,
  WALLPAPER_STORAGE_KEYS,
} from '../src/services/WallpaperService';
import type { Wallpaper } from '../src/types';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store[key] ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn(async (key: string) => {
        delete store[key];
      }),
      clear: jest.fn(async () => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
    },
  };
});

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('../src/services/NexusNative', () => ({
  NexusNative: {
    fileExists: jest.fn(),
    saveWallpaper: jest.fn(),
    deleteFile: jest.fn(),
    clearWallpaper: jest.fn(),
  },
}));

const LEGACY_STORAGE_KEY = '@nexus/lock-screen/wallpaper/v1';

function makeWallpaper(path: string): Wallpaper {
  return {
    path,
    width: 1920,
    height: 1080,
    crop: { fx: 0.5, fy: 0.5, zoom: 1 },
  };
}

async function storeWallpaper(key: string, wallpaper: Wallpaper): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(wallpaper));
}

describe('wallpaper slots', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    (NexusNative.fileExists as jest.Mock).mockResolvedValue(true);
    (NexusNative.deleteFile as jest.Mock).mockResolvedValue(true);
    (NexusNative.clearWallpaper as jest.Mock).mockResolvedValue(true);
  });

  it('migrates the legacy shared wallpaper into both slots', async () => {
    const legacy = makeWallpaper('/files/legacy.jpg');
    await storeWallpaper(LEGACY_STORAGE_KEY, legacy);

    const result = await loadWallpapers();

    expect(result.home).toEqual(legacy);
    expect(result.lock).toEqual(legacy);
    expect(await AsyncStorage.getItem(WALLPAPER_STORAGE_KEYS.home)).toBe(
      JSON.stringify(legacy),
    );
    expect(await AsyncStorage.getItem(WALLPAPER_STORAGE_KEYS.lock)).toBe(
      JSON.stringify(legacy),
    );
    expect(await AsyncStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  it('loads different images for Home and Lock Screen', async () => {
    const home = makeWallpaper('/files/home.jpg');
    const lock = makeWallpaper('/files/lock.jpg');
    await storeWallpaper(WALLPAPER_STORAGE_KEYS.home, home);
    await storeWallpaper(WALLPAPER_STORAGE_KEYS.lock, lock);

    const result = await loadWallpapers();

    expect(result.home?.path).toBe(home.path);
    expect(result.lock?.path).toBe(lock.path);
  });

  it('imports a picked image only into the requested slot', async () => {
    const home = makeWallpaper('/files/home.jpg');
    const lock = makeWallpaper('/files/lock-new.jpg');
    await storeWallpaper(WALLPAPER_STORAGE_KEYS.home, home);
    (launchImageLibrary as jest.Mock).mockResolvedValue({
      assets: [{ uri: 'content://photo/lock' }],
    });
    (NexusNative.saveWallpaper as jest.Mock).mockResolvedValue({
      path: lock.path,
      width: lock.width,
      height: lock.height,
    });

    const picked = await pickWallpaper('lock');

    expect(NexusNative.saveWallpaper).toHaveBeenCalledWith(
      'content://photo/lock',
      'lock',
    );
    expect(picked?.path).toBe(lock.path);
    expect(await AsyncStorage.getItem(WALLPAPER_STORAGE_KEYS.home)).toBe(
      JSON.stringify(home),
    );
    const storedLock = JSON.parse(
      (await AsyncStorage.getItem(WALLPAPER_STORAGE_KEYS.lock)) ?? 'null',
    ) as Wallpaper;
    expect(storedLock.path).toBe(lock.path);
  });

  it('updates crop data without touching the other slot', async () => {
    const home = makeWallpaper('/files/home.jpg');
    const lock = makeWallpaper('/files/lock.jpg');
    await storeWallpaper(WALLPAPER_STORAGE_KEYS.home, home);
    await storeWallpaper(WALLPAPER_STORAGE_KEYS.lock, lock);

    await persistCrop('home', home, { fx: 0.2, fy: 0.8, zoom: 1.4 });

    const storedHome = JSON.parse(
      (await AsyncStorage.getItem(WALLPAPER_STORAGE_KEYS.home)) ?? 'null',
    ) as Wallpaper;
    expect(storedHome.crop).toEqual({ fx: 0.2, fy: 0.8, zoom: 1.4 });
    expect(await AsyncStorage.getItem(WALLPAPER_STORAGE_KEYS.lock)).toBe(
      JSON.stringify(lock),
    );
  });

  it('keeps a legacy file that the other slot still references', async () => {
    const legacy = makeWallpaper('/files/legacy.jpg');

    await removeWallpaper('home', legacy, legacy);

    expect(NexusNative.deleteFile).not.toHaveBeenCalled();
    expect(NexusNative.clearWallpaper).toHaveBeenCalledWith('home');
    expect(await AsyncStorage.getItem(WALLPAPER_STORAGE_KEYS.home)).toBeNull();
  });

  it('deletes the image once no slot references it anymore', async () => {
    const legacy = makeWallpaper('/files/legacy.jpg');

    await removeWallpaper('lock', legacy, null);

    expect(NexusNative.deleteFile).toHaveBeenCalledWith(legacy.path);
    expect(NexusNative.clearWallpaper).toHaveBeenCalledWith('lock');
    expect(await AsyncStorage.getItem(WALLPAPER_STORAGE_KEYS.lock)).toBeNull();
  });
});
