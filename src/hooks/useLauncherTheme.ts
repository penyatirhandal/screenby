import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { NexusNative } from '../services/NexusNative';
import type { WallpaperColors } from '../types';
import { buildLauncherPalette } from '../theme/dynamicColor';
import type { LauncherPalette } from '../theme/colors';

export interface LauncherThemeController {
  palette: LauncherPalette;
  source: WallpaperColors | null;
  refresh: () => Promise<void>;
}

/**
 * Reads the wallpaper-derived colors Android exposes on Android 12+ and falls
 * back to the PRD palette when the OS cannot provide them.
 */
export function useLauncherTheme(): LauncherThemeController {
  const [source, setSource] = useState<WallpaperColors | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await NexusNative.getWallpaperColors();
      setSource(next);
    } catch {
      setSource(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    refresh().catch(() => undefined);

    const subscription = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (active && state === 'active') {
          refresh().catch(() => undefined);
        }
      },
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, [refresh]);

  return { palette: buildLauncherPalette(source), source, refresh };
}
