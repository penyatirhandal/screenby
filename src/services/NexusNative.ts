import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type { BatteryState, ImportedWallpaper, NetworkState } from '../types';

interface NexusNativeInterface {
  getBatteryStatus(): Promise<BatteryState>;
  getNetworkStatus(): Promise<NetworkState>;
  isFlashlightAvailable(): Promise<boolean>;
  toggleFlashlight(): Promise<boolean>;
  openCamera(): Promise<boolean>;
  exitLockScreen(): Promise<boolean>;
  saveWallpaper(uri: string): Promise<ImportedWallpaper>;
  clearWallpapers(): Promise<boolean>;
  fileExists(path: string): Promise<boolean>;
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

  saveWallpaper(uri: string): Promise<ImportedWallpaper> {
    return nativeModule ? nativeModule.saveWallpaper(uri) : unavailable();
  },

  clearWallpapers(): Promise<boolean> {
    return nativeModule
      ? nativeModule.clearWallpapers()
      : Promise.resolve(false);
  },

  fileExists(path: string): Promise<boolean> {
    return nativeModule
      ? nativeModule.fileExists(path)
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
