import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type {
  BatteryState,
  ImportedWallpaper,
  LauncherApp,
  NetworkState,
  PickedFolder,
  PlatformGame,
  WallpaperColors,
  WallpaperSlot,
} from '../types';

interface NexusNativeInterface {
  getBatteryStatus(): Promise<BatteryState>;
  getNetworkStatus(): Promise<NetworkState>;
  isFlashlightAvailable(): Promise<boolean>;
  toggleFlashlight(): Promise<boolean>;
  openCamera(): Promise<boolean>;
  exitLockScreen(): Promise<boolean>;
  saveWallpaper(uri: string, slot: WallpaperSlot): Promise<ImportedWallpaper>;
  clearWallpaper(slot: WallpaperSlot): Promise<boolean>;
  fileExists(path: string): Promise<boolean>;
  getInstalledApps(): Promise<LauncherApp[]>;
  launchApp(packageName: string): Promise<boolean>;
  getWallpaperColors(): Promise<WallpaperColors | null>;
  importGameIcon(uri: string): Promise<ImportedWallpaper>;
  saveMusicCover(uri: string): Promise<ImportedWallpaper>;
  pickGameFolder(): Promise<PickedFolder>;
  scanGameFolder(
    folderUri: string,
    extensions: string[],
  ): Promise<PlatformGame[]>;
  launchGameFile(
    fileUri: string,
    emulatorPackage: string | null,
  ): Promise<boolean>;
  deleteFile(path: string): Promise<boolean>;
  uninstallApp(packageName: string): Promise<boolean>;
  setSystemWallpaper(path: string): Promise<boolean>;
  consumeScreenLock(): Promise<boolean>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const nativeModule = NativeModules.NexusNative as
  | NexusNativeInterface
  | undefined;

export const isNativeAvailable =
  Platform.OS === 'android' && nativeModule != null;

let emitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter | null {
  if (!nativeModule) {
    return null;
  }
  if (!emitter) {
    emitter = new NativeEventEmitter(nativeModule as never);
  }
  return emitter;
}

function unavailable<T>(): Promise<T> {
  return Promise.reject(new Error('Fitur native hanya tersedia di Android.'));
}

export const NexusNative = {
  isAvailable(): boolean {
    return isNativeAvailable;
  },

  getBatteryStatus(): Promise<BatteryState> {
    return nativeModule ? nativeModule.getBatteryStatus() : unavailable();
  },

  getNetworkStatus(): Promise<NetworkState> {
    return nativeModule ? nativeModule.getNetworkStatus() : unavailable();
  },

  isFlashlightAvailable(): Promise<boolean> {
    return nativeModule
      ? nativeModule.isFlashlightAvailable()
      : Promise.resolve(false);
  },

  toggleFlashlight(): Promise<boolean> {
    return nativeModule ? nativeModule.toggleFlashlight() : unavailable();
  },

  openCamera(): Promise<boolean> {
    return nativeModule ? nativeModule.openCamera() : unavailable();
  },

  exitLockScreen(): Promise<boolean> {
    return nativeModule ? nativeModule.exitLockScreen() : unavailable();
  },

  saveWallpaper(uri: string, slot: WallpaperSlot): Promise<ImportedWallpaper> {
    return nativeModule
      ? nativeModule.saveWallpaper(uri, slot)
      : unavailable();
  },

  clearWallpaper(slot: WallpaperSlot): Promise<boolean> {
    return nativeModule
      ? nativeModule.clearWallpaper(slot)
      : Promise.resolve(false);
  },

  fileExists(path: string): Promise<boolean> {
    return nativeModule
      ? nativeModule.fileExists(path)
      : Promise.resolve(false);
  },

  getInstalledApps(): Promise<LauncherApp[]> {
    return nativeModule
      ? nativeModule.getInstalledApps()
      : Promise.resolve([]);
  },

  launchApp(packageName: string): Promise<boolean> {
    return nativeModule
      ? nativeModule.launchApp(packageName)
      : Promise.resolve(false);
  },

  getWallpaperColors(): Promise<WallpaperColors | null> {
    return nativeModule
      ? nativeModule.getWallpaperColors()
      : Promise.resolve(null);
  },

  importGameIcon(uri: string): Promise<ImportedWallpaper> {
    return nativeModule ? nativeModule.importGameIcon(uri) : unavailable();
  },

  saveMusicCover(uri: string): Promise<ImportedWallpaper> {
    return nativeModule ? nativeModule.saveMusicCover(uri) : unavailable();
  },

  pickGameFolder(): Promise<PickedFolder> {
    return nativeModule ? nativeModule.pickGameFolder() : unavailable();
  },

  scanGameFolder(
    folderUri: string,
    extensions: string[],
  ): Promise<PlatformGame[]> {
    return nativeModule
      ? nativeModule.scanGameFolder(folderUri, extensions)
      : Promise.resolve([]);
  },

  launchGameFile(
    fileUri: string,
    emulatorPackage: string | null,
  ): Promise<boolean> {
    return nativeModule
      ? nativeModule.launchGameFile(fileUri, emulatorPackage)
      : Promise.resolve(false);
  },

  deleteFile(path: string): Promise<boolean> {
    return nativeModule
      ? nativeModule.deleteFile(path)
      : Promise.resolve(false);
  },

  uninstallApp(packageName: string): Promise<boolean> {
    return nativeModule
      ? nativeModule.uninstallApp(packageName)
      : Promise.resolve(false);
  },

  setSystemWallpaper(path: string): Promise<boolean> {
    return nativeModule
      ? nativeModule.setSystemWallpaper(path)
      : Promise.resolve(false);
  },

  consumeScreenLock(): Promise<boolean> {
    return nativeModule
      ? nativeModule.consumeScreenLock()
      : Promise.resolve(false);
  },
};

export function subscribeToBattery(
  listener: (state: BatteryState) => void,
): () => void {
  const subscription = getEmitter()?.addListener('NexusBattery', (...args) => {
    listener(args[0] as unknown as BatteryState);
  });
  return () => subscription?.remove();
}

export function subscribeToNetwork(
  listener: (state: NetworkState) => void,
): () => void {
  const subscription = getEmitter()?.addListener('NexusNetwork', (...args) => {
    listener(args[0] as unknown as NetworkState);
  });
  return () => subscription?.remove();
}

/** Notifies JS when the Android screen turns off or on. */
export function subscribeToScreenEvents(
  onScreenOff: () => void,
  onScreenOn: () => void,
): () => void {
  const emitterInstance = getEmitter();
  const off = emitterInstance?.addListener('NexusScreenOff', onScreenOff);
  const on = emitterInstance?.addListener('NexusScreenOn', onScreenOn);
  return () => {
    off?.remove();
    on?.remove();
  };
}
