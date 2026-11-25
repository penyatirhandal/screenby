import { useCallback, useEffect, useState } from 'react';
import {
  loadWallpaper,
  persistCrop,
  pickWallpaper,
  removeWallpaper,
} from '../services/WallpaperService';
import type { CropState, Wallpaper } from '../types';

export interface WallpaperController {
  wallpaper: Wallpaper | null;
  loading: boolean;
  choose: () => Promise<Wallpaper | null>;
  saveCrop: (crop: CropState) => Promise<void>;
  remove: () => Promise<void>;
}

export function useWallpaper(): WallpaperController {
  const [wallpaper, setWallpaper] = useState<Wallpaper | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    loadWallpaper()
      .then(stored => {
        if (mounted) {
          setWallpaper(stored);
        }
      })
      .catch(() => {
        // A missing native bridge or corrupted storage must not break the lock screen.
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const choose = useCallback(async () => {
    const next = await pickWallpaper();
    if (next) {
      setWallpaper(next);
    }
    return next;
  }, []);

  const saveCrop = useCallback(
    async (crop: CropState) => {
      if (!wallpaper) {
        return;
      }
      const next = await persistCrop(wallpaper, crop);
      setWallpaper(next);
    },
    [wallpaper],
  );

  const remove = useCallback(async () => {
    await removeWallpaper();
    setWallpaper(null);
  }, []);

  return { wallpaper, loading, choose, saveCrop, remove };
}
