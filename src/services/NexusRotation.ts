import { NativeModules, Platform } from 'react-native';
import type { RotationLockMode } from '../types';

interface NexusRotationInterface {
  canWriteSettings(): Promise<boolean>;
  openWriteSettings(): void;
  setRotationLock(mode: RotationLockMode): Promise<boolean>;
}

const nativeModule = NativeModules.NexusRotation as
  | NexusRotationInterface
  | undefined;

/**
 * System-wide rotation lock. Changing Android's rotation settings affects every
 * app, not just the launcher, so the OS requires the special WRITE_SETTINGS grant.
 */
export const NexusRotation = {
  isAvailable(): boolean {
    return Platform.OS === 'android' && nativeModule != null;
  },

  canWriteSettings(): Promise<boolean> {
    return nativeModule
      ? nativeModule.canWriteSettings()
      : Promise.resolve(false);
  },

  openWriteSettings(): void {
    nativeModule?.openWriteSettings();
  },

  setRotationLock(mode: RotationLockMode): Promise<boolean> {
    return nativeModule
      ? nativeModule.setRotationLock(mode)
      : Promise.resolve(false);
  },
};
