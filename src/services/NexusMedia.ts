import {NativeEventEmitter, NativeModules, Platform} from 'react-native';
import type {NowPlayingState} from '../types';

interface NexusMediaInterface {
  getNowPlaying(): Promise<NowPlayingState>;
  control(action: 'play' | 'pause' | 'playPause' | 'next' | 'previous'): Promise<boolean>;
  isNotificationAccessGranted(): Promise<boolean>;
  openNotificationAccessSettings(): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const nativeModule = NativeModules.NexusMedia as NexusMediaInterface | undefined;
let emitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter | null {
  if (Platform.OS !== 'android' || !nativeModule) {
    return null;
  }
  emitter ??= new NativeEventEmitter(nativeModule);
  return emitter;
}

export const NexusMedia = {
  isAvailable(): boolean {
    return Platform.OS === 'android' && nativeModule != null;
  },

  getNowPlaying(): Promise<NowPlayingState> {
    return nativeModule
      ? nativeModule.getNowPlaying()
      : Promise.resolve({
          hasSession: false,
          playing: false,
          title: null,
          artist: null,
          album: null,
          albumArtPath: null,
          packageName: null,
        });
  },

  control(
    action: 'play' | 'pause' | 'playPause' | 'next' | 'previous',
  ): Promise<boolean> {
    return nativeModule
      ? nativeModule.control(action)
      : Promise.resolve(false);
  },

  isNotificationAccessGranted(): Promise<boolean> {
    return nativeModule
      ? nativeModule.isNotificationAccessGranted()
      : Promise.resolve(false);
  },

  openNotificationAccessSettings(): void {
    nativeModule?.openNotificationAccessSettings();
  },
};

/** Emits whenever the track, artwork or playback state changes. */
export function subscribeToMedia(listener: (state: NowPlayingState) => void): () => void {
  const subscription = getEmitter()?.addListener('NexusMedia', (...args) => {
    listener(args[0] as unknown as NowPlayingState);
  });
  return () => subscription?.remove();
}
