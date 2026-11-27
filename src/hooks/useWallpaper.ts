import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadWallpapers,
  persistCrop,
  pickWallpaper,
  removeWallpaper,
} from '../services/WallpaperService';
import { NexusNative } from '../services/NexusNative';
import type {
  CropState,
  Wallpaper,
  WallpaperSet,
  WallpaperSlot,
} from '../types';

export interface WallpaperController {
  wallpapers: WallpaperSet;
  loading: boolean;
  choose: (slot: WallpaperSlot) => Promise<Wallpaper | null>;
  saveCrop: (slot: WallpaperSlot, crop: CropState) => Promise<void>;
  remove: (slot: WallpaperSlot) => Promise<void>;
}

const EMPTY: WallpaperSet = { home: null, lock: null };

function otherSlot(slot: WallpaperSlot): WallpaperSlot {
  return slot === 'home' ? 'lock' : 'home';
}

export function useWallpaper(): WallpaperController {
  const [wallpapers, setWallpapers] = useState<WallpaperSet>(EMPTY);
  const [loading, setLoading] = useState(true);
  const wallpapersRef = useRef(wallpapers);
  wallpapersRef.current = wallpapers;

  useEffect(() => {
    let mounted = true;

    loadWallpapers()
      .then(stored => {
        if (mounted) {
          setWallpapers(stored);
        }
      })
      .catch(() => {
        // A missing native bridge or corrupted storage must not break the launcher.
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

  const choose = useCallback(async (slot: WallpaperSlot) => {
    const previous = wallpapersRef.current[slot];
    const other = wallpapersRef.current[otherSlot(slot)];
    const next = await pickWallpaper(slot);
    if (!next) {
      return null;
    }

    setWallpapers(current => ({ ...current, [slot]: next }));

    // The native importer removes stale files for the same slot. A legacy
    // shared file is deleted here once neither screen references it anymore.
    if (previous && previous.path !== next.path && other?.path !== previous.path) {
      await NexusNative.deleteFile(previous.path).catch(() => false);
    }

    return next;
  }, []);

  const saveCrop = useCallback(
    async (slot: WallpaperSlot, crop: CropState) => {
      const current = wallpapersRef.current[slot];
      if (!current) {
        return;
      }
      const next = await persistCrop(slot, current, crop);
      setWallpapers(previous => ({ ...previous, [slot]: next }));
    },
    [],
  );

  const remove = useCallback(async (slot: WallpaperSlot) => {
    const current = wallpapersRef.current[slot];
    const other = wallpapersRef.current[otherSlot(slot)];
    await removeWallpaper(slot, current, other);
    setWallpapers(previous => ({ ...previous, [slot]: null }));
  }, []);

  return { wallpapers, loading, choose, saveCrop, remove };
}
