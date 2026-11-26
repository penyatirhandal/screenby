import {NativeModules, Platform} from 'react-native';
import type {AddedWidget, WidgetProvider} from '../types';

interface NexusWidgetInterface {
  getWidgetProviders(): Promise<WidgetProvider[]>;
  addWidget(provider: string): Promise<AddedWidget>;
  deleteWidget(appWidgetId: number): Promise<boolean>;
  updateWidgetSize(
    appWidgetId: number,
    widthPx: number,
    heightPx: number,
  ): Promise<boolean>;
}

const nativeModule = NativeModules.NexusWidget as
  | NexusWidgetInterface
  | undefined;

function unavailable<T>(): Promise<T> {
  return Promise.reject(new Error('Widget Android hanya tersedia di perangkat.'));
}

export const NexusWidgets = {
  isAvailable(): boolean {
    return Platform.OS === 'android' && nativeModule != null;
  },

  getWidgetProviders(): Promise<WidgetProvider[]> {
    return nativeModule
      ? nativeModule.getWidgetProviders()
      : Promise.resolve([]);
  },

  addWidget(provider: string): Promise<AddedWidget> {
    return nativeModule ? nativeModule.addWidget(provider) : unavailable();
  },

  deleteWidget(appWidgetId: number): Promise<boolean> {
    return nativeModule
      ? nativeModule.deleteWidget(appWidgetId)
      : Promise.resolve(false);
  },

  updateWidgetSize(
    appWidgetId: number,
    widthPx: number,
    heightPx: number,
  ): Promise<boolean> {
    return nativeModule
      ? nativeModule.updateWidgetSize(appWidgetId, widthPx, heightPx)
      : Promise.resolve(false);
  },
};
