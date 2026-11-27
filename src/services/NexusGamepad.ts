import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type { GamepadEvent } from '../gamepad/types';

interface NexusGamepadInterface {
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const nativeModule = NativeModules.NexusGamepad as
  | NexusGamepadInterface
  | undefined;

export const isGamepadAvailable =
  Platform.OS === 'android' && nativeModule != null;

/** Subscribes to gamepad keys and analog axes emitted by MainActivity. */
export function subscribeToGamepad(
  listener: (event: GamepadEvent) => void,
): () => void {
  if (!nativeModule) {
    return () => undefined;
  }
  const emitter = new NativeEventEmitter(nativeModule as never);
  const subscription = emitter.addListener('NexusGamepad', payload => {
    listener(payload as GamepadEvent);
  });
  return () => subscription.remove();
}
