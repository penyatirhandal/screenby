import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { NexusNative } from '../services/NexusNative';
import type { LauncherApp } from '../types';

export function useLauncherApps(): {
  apps: LauncherApp[];
  loading: boolean;
  refresh: () => Promise<void>;
  launch: (packageName: string) => Promise<boolean>;
} {
  const [apps, setApps] = useState<LauncherApp[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await NexusNative.getInstalledApps();
      setApps(next);
    } catch {
      setApps([]);
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
        if (state === 'active' && active) {
          refresh();
        }
      },
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, [refresh]);

  const launch = useCallback(async (packageName: string) => {
    try {
      return await NexusNative.launchApp(packageName);
    } catch {
      return false;
    }
  }, []);

  return { apps, loading, refresh, launch };
}
