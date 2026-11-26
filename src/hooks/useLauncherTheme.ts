import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { NexusNative } from '../services/NexusNative';
import type { WallpaperColors } from '../types';
import { buildLauncherPalette } from '../theme/dynamicColor';
import type { LauncherPalette } from '../theme/colors';

/**
 * Reads the wallpaper-derived colors Android exposes on Android 12+ and falls
 * back to the PRD palette when the OS cannot provide them.
 */
export function useLauncherTheme(): LauncherPalette {
  const [source, setSource] = useState<WallpaperColors | null>(null);

  useEffect(() => {
    let active = true;

    const load = () => {
      NexusNative.getWallpaperColors()
        .then(next => {
          if (active) {
            setSource(next);
          }
        })
        .catch(() => {
          if (active) {
            setSource(null);
          }
        });
    };

    load();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        load();
      }
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return buildLauncherPalette(source);
}
