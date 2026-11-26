import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from '../services/LauncherSettingsService';
import type { FontChoice, FontSizeChoice, LauncherSettings } from '../types';

export interface LauncherSettingsController {
  settings: LauncherSettings;
  setFont: (font: FontChoice) => Promise<void>;
  setFontSize: (fontSize: FontSizeChoice) => Promise<void>;
}

export function useLauncherSettings(): LauncherSettingsController {
  const [settings, setSettings] = useState<LauncherSettings>({
    ...DEFAULT_SETTINGS,
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

  return {
    settings,
    setFont: (font: FontChoice) => update({ font }),
    setFontSize: (fontSize: FontSizeChoice) => update({ fontSize }),
  };
}
