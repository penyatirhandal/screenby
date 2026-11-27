import {useCallback, useEffect, useState} from 'react';
import {
  extensionsForApp,
  isKnownEmulator,
  type EmulatorOption,
} from '../constants/emulators';
import {
  loadPlatforms,
  savePlatforms,
} from '../services/GamePlatformService';
import {NexusNative} from '../services/NexusNative';
import type {GameMetadata, GamePlatform, PlatformInput} from '../types';

export interface GamePlatformsController {
  platforms: GamePlatform[];
  emulatorOptions: EmulatorOption[];
  loading: boolean;
  add: (input: PlatformInput) => Promise<GamePlatform>;
  update: (id: string, patch: Partial<PlatformInput>) => Promise<void>;
  updateGame: (
    platformId: string,
    gameId: string,
    patch: Partial<GameMetadata>,
  ) => Promise<void>;
  refreshGames: (id: string) => Promise<number>;
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Every option must be backed by an APK that is currently installed. */
function buildOptions(
  installed: {label: string; packageName: string}[],
): EmulatorOption[] {
  return installed
    .filter(app => Boolean(app.packageName))
    .map(app => ({
      id: `installed:${app.packageName}`,
      label: app.label,
      packageName: app.packageName,
      extensions: extensionsForApp(app.label, app.packageName),
    }))
    .sort((a, b) => {
      const aKnown = isKnownEmulator(a.label, a.packageName) ? 0 : 1;
      const bKnown = isKnownEmulator(b.label, b.packageName) ? 0 : 1;
      if (aKnown !== bKnown) {
        return aKnown - bKnown;
      }
      return a.label.localeCompare(b.label);
    });
}

/** Keeps user-created emulator platforms and the ROMs found in their folders. */
export function useGamePlatforms(): GamePlatformsController {
  const [platforms, setPlatforms] = useState<GamePlatform[]>([]);
  const [emulatorOptions, setEmulatorOptions] = useState<EmulatorOption[]>(
    buildOptions([]),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadPlatforms(),
      NexusNative.getInstalledApps().catch(() => []),
    ])
      .then(([stored, installed]) => {
        if (!active) {
          return;
        }
        setPlatforms(stored);
        setEmulatorOptions(buildOptions(installed));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const add = useCallback(async (input: PlatformInput) => {
    const platform: GamePlatform = {
      ...input,
      id: newId(),
      games: [],
      scannedAt: null,
    };
    const next = [...(await loadPlatforms()), platform];
    await savePlatforms(next);
    setPlatforms(next);
    return platform;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<PlatformInput>) => {
    const stored = await loadPlatforms();
    const next = stored.map(platform => {
      if (platform.id !== id) {
        return platform;
      }
      const folderChanged =
        patch.folderUri !== undefined && patch.folderUri !== platform.folderUri;
      const extensionsChanged =
        patch.extensions !== undefined &&
        patch.extensions.join('|') !== platform.extensions.join('|');
      return {
        ...platform,
        ...patch,
        ...(folderChanged || extensionsChanged
          ? {games: [] as typeof platform.games, scannedAt: null}
          : {}),
      };
    });
    await savePlatforms(next);
    setPlatforms(next);
  }, []);

  const updateGame = useCallback(
    async (
      platformId: string,
      gameId: string,
      patch: Partial<GameMetadata>,
    ) => {
      const stored = await loadPlatforms();
      const next = stored.map(platform =>
        platform.id !== platformId
          ? platform
          : {
              ...platform,
              games: platform.games.map(game =>
                game.id === gameId ? {...game, ...patch} : game,
              ),
            },
      );
      await savePlatforms(next);
      setPlatforms(next);
    },
    [],
  );

  const refreshGames = useCallback(async (id: string) => {
    const stored = await loadPlatforms();
    const platform = stored.find(item => item.id === id);
    if (!platform) {
      return 0;
    }
    const scanned = await NexusNative.scanGameFolder(
      platform.folderUri,
      platform.extensions.length > 0
        ? platform.extensions
        : ['iso', 'bin', 'cue', 'chd', 'zip'],
    );
    const previous = new Map(platform.games.map(game => [game.id, game]));
    const games = scanned.map(game => {
      const saved = previous.get(game.id);
      if (!saved) {
        return game;
      }
      return {
        ...game,
        customLabel: saved.customLabel,
        customIconPath: saved.customIconPath,
        releaseYear: saved.releaseYear,
        genre: saved.genre,
        developer: saved.developer,
        publisher: saved.publisher,
        lastPlayedAt: saved.lastPlayedAt,
      };
    });
    const next = stored.map(item =>
      item.id === id
        ? {...item, games, scannedAt: Date.now()}
        : item,
    );
    await savePlatforms(next);
    setPlatforms(next);
    return games.length;
  }, []);

  return {
    platforms,
    emulatorOptions,
    loading,
    add,
    update,
    updateGame,
    refreshGames,
  };
}

/** Resolves the option used when a saved platform is edited. */
export function findEmulatorOption(
  options: EmulatorOption[],
  platform: GamePlatform,
): EmulatorOption | undefined {
  return (
    options.find(option => option.packageName === platform.emulatorPackage) ??
    options.find(option => option.id === platform.emulatorId)
  );
}
