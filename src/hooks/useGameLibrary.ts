import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  loadGames,
  pinGame,
  syncGames,
  unpinGame,
  updateGame,
} from '../services/GameLibraryService';
import { NexusNative } from '../services/NexusNative';
import type { LauncherApp, PinnedGame } from '../types';

export interface GameLibraryController {
  games: PinnedGame[];
  loading: boolean;
  pin: (app: LauncherApp) => Promise<void>;
  unpin: (packageName: string) => Promise<void>;
  edit: (packageName: string, patch: Partial<PinnedGame>) => Promise<void>;
  recordPlay: (packageName: string) => Promise<void>;
}

export function useGameLibrary(): GameLibraryController {
  const [games, setGames] = useState<PinnedGame[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [stored, installed] = await Promise.all([
        loadGames(),
        NexusNative.getInstalledApps(),
      ]);
      setGames(await syncGames(stored, installed));
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    refresh();

    const subscription = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (active && state === 'active') {
          refresh();
        }
      },
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, [refresh]);

  const pin = useCallback(async (app: LauncherApp) => {
    setGames(await pinGame(app));
  }, []);

  const unpin = useCallback(async (packageName: string) => {
    setGames(await unpinGame(packageName));
  }, []);

  const edit = useCallback(
    async (packageName: string, patch: Partial<PinnedGame>) => {
      setGames(await updateGame(packageName, patch));
    },
    [],
  );

  const recordPlay = useCallback(async (packageName: string) => {
    const next = await updateGame(packageName, { lastPlayedAt: Date.now() });
    setGames(next);
  }, []);

  return { games, loading, pin, unpin, edit, recordPlay };
}
