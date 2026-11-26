import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  DESKTOP_WIDGETS,
  loadSettings,
  saveSettings,
} from '../services/LauncherSettingsService';
import type {
  DesktopWidget,
  FontChoice,
  FontSizeChoice,
  LauncherSettings,
} from '../types';

export interface LauncherSettingsController {
  settings: LauncherSettings;
  setFont: (font: FontChoice) => Promise<void>;
  setFontSize: (fontSize: FontSizeChoice) => Promise<void>;
  toggleWidget: (widget: DesktopWidget) => Promise<void>;
}

export function useLauncherSettings(): LauncherSettingsController {
  const [settings, setSettings] = useState<LauncherSettings>({
    ...DEFAULT_SETTINGS,
    desktopWidgets: [...DESKTOP_WIDGETS],
  });
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
      })
      .catch(() => {
        // Corrupted settings fall back to the defaults in memory.
      });
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback(async (patch: Partial<LauncherSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    try {
      await saveSettings(next);
    } catch {
      // Keep the in-memory setting even if persistence fails.
    }
  }, []);

  const toggleWidget = useCallback(
    async (widget: DesktopWidget) => {
      const current = settingsRef.current.desktopWidgets;
      const next = current.includes(widget)
        ? current.filter(item => item !== widget)
        : DESKTOP_WIDGETS.filter(
            item => item === widget || current.includes(item),
          );
      await update({ desktopWidgets: next });
    },
    [update],
  );

  return {
    settings,
    setFont: (font: FontChoice) => update({ font }),
    setFontSize: (fontSize: FontSizeChoice) => update({ fontSize }),
    toggleWidget,
  };
}
