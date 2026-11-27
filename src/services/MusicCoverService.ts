import AsyncStorage from '@react-native-async-storage/async-storage';
import {NexusNative} from './NexusNative';

const STORAGE_KEY = 'nexus.music-cover.v1';

/** Path of the gallery image the user picked as the music cover. */
export async function loadMusicCover(): Promise<string | null> {
  const path = await AsyncStorage.getItem(STORAGE_KEY);
  if (!path) {
    return null;
  }
  const exists = await NexusNative.fileExists(path).catch(() => false);
  if (!exists) {
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
    return null;
  }
  return path;
}

/** Keeps the picked cover across restarts. */
export async function saveMusicCover(path: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, path);
}
