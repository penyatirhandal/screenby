import {useCallback, useEffect, useRef, useState} from 'react';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  makeAppWidgetItem,
  makeBuiltinItem,
  saveSettings,
} from '../services/LauncherSettingsService';
import {NexusWidgets} from '../services/NexusWidgets';
import type {
  AddedWidget,
  BuiltinWidget,
  DesktopWidgetItem,
  DesktopWidgetLayout,
  FontChoice,
  FontSizeChoice,
  GameIconSize,
  LauncherSettings,
  RotationLockMode,
} from '../types';

export interface LauncherSettingsController {
  settings: LauncherSettings;
  /** False until AsyncStorage has been read; prevents applying default values too early. */
  loaded: boolean;
  setFont: (font: FontChoice) => Promise<void>;
  setFontSize: (fontSize: FontSizeChoice) => Promise<void>;
  setGameIconSize: (size: GameIconSize) => Promise<void>;
  setRotationLock: (mode: RotationLockMode) => Promise<void>;
  setDesktopItems: (items: DesktopWidgetItem[]) => Promise<void>;
  addBuiltinWidget: (
    widget: BuiltinWidget,
    layout: Partial<DesktopWidgetLayout>,
  ) => Promise<void>;
  addAppWidget: (
    added: AddedWidget,
    layout: Partial<DesktopWidgetLayout>,
  ) => Promise<void>;
  updateWidget: (
    id: string,
    patch: Partial<DesktopWidgetLayout>,
  ) => Promise<void>;
  removeWidget: (id: string) => Promise<void>;
}

export function useLauncherSettings(): LauncherSettingsController {
  const [settings, setSettings] = useState<LauncherSettings>({
    ...DEFAULT_SETTINGS,
    desktopItems: [...DEFAULT_SETTINGS.desktopItems],
  });
  const [loaded, setLoaded] = useState(false);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let active = true;
    loadSettings()
      .then(next => {
        if (active) {
          settingsRef.current = next;
          setSettings(next);
        }
        setLoaded(true);
      })
      .catch(() => {
        // Corrupted settings fall back to the defaults in memory.
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback(async (patch: Partial<LauncherSettings>) => {
    const next = {...settingsRef.current, ...patch};
    settingsRef.current = next;
    setSettings(next);
    try {
      await saveSettings(next);
    } catch {
      // Keep the in-memory setting even if persistence fails.
    }
  }, []);

  const setDesktopItems = useCallback(
    async (items: DesktopWidgetItem[]) => update({desktopItems: items}),
    [update],
  );

  const addBuiltinWidget = useCallback(
    async (widget: BuiltinWidget, layout: Partial<DesktopWidgetLayout>) => {
      const suffix = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
      const next = [
        ...settingsRef.current.desktopItems,
        makeBuiltinItem(widget, layout, suffix),
      ];
      await setDesktopItems(next);
    },
    [setDesktopItems],
  );

  const addAppWidget = useCallback(
    async (added: AddedWidget, layout: Partial<DesktopWidgetLayout>) => {
      const item = makeAppWidgetItem(added, layout);
      if (!item) {
        return;
      }
      await setDesktopItems([...settingsRef.current.desktopItems, item]);
    },
    [setDesktopItems],
  );

  const updateWidget = useCallback(
    async (id: string, patch: Partial<DesktopWidgetLayout>) => {
      const next = settingsRef.current.desktopItems.map(item =>
        item.id === id ? ({...item, ...patch} as DesktopWidgetItem) : item,
      );
      await setDesktopItems(next);
    },
    [setDesktopItems],
  );

  const removeWidget = useCallback(
    async (id: string) => {
      const target = settingsRef.current.desktopItems.find(
        item => item.id === id,
      );
      if (target?.kind === 'appwidget') {
        await NexusWidgets.deleteWidget(target.appWidgetId).catch(() => false);
      }
      await setDesktopItems(
        settingsRef.current.desktopItems.filter(item => item.id !== id),
      );
    },
    [setDesktopItems],
  );

  return {
    settings,
    loaded,
    setFont: (font: FontChoice) => update({font}),
    setFontSize: (fontSize: FontSizeChoice) => update({fontSize}),
    setGameIconSize: (gameIconSize: GameIconSize) => update({gameIconSize}),
    setRotationLock: (rotationLock: RotationLockMode) => update({rotationLock}),
    setDesktopItems,
    addBuiltinWidget,
    addAppWidget,
    updateWidget,
    removeWidget,
  };
}
