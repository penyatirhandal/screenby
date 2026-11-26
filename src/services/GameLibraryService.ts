import AsyncStorage from '@react-native-async-storage/async-storage';
import { NexusNative } from './NexusNative';
import type { LauncherApp, PinnedGame } from '../types';

const STORAGE_KEY = '@nexus/launcher/games/v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function parseGame(raw: unknown): PinnedGame | null {
  if (!isRecord(raw)) {
    return null;
  }
  const packageName = optionalString(raw.packageName);
  const label = optionalString(raw.label);
  if (!packageName || !label) {
    return null;
  }

  return {
    packageName,
    label,
    icon: typeof raw.icon === 'string' ? raw.icon : null,
    customLabel: optionalString(raw.customLabel),
    customIconPath: optionalString(raw.customIconPath),
    releaseYear: optionalString(raw.releaseYear),
    genre: optionalString(raw.genre),
    developer: optionalString(raw.developer),
    publisher: optionalString(raw.publisher),
    pinnedAt: typeof raw.pinnedAt === 'number' ? raw.pinnedAt : Date.now(),
    lastPlayedAt:
      typeof raw.lastPlayedAt === 'number' ? raw.lastPlayedAt : undefined,
  };
}

export async function loadGames(): Promise<PinnedGame[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
        .map(parseGame)
        .filter((game): game is PinnedGame => game !== null);
  } catch {
    return [];
  }
}

export async function saveGames(games: PinnedGame[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

/**
 * Drops entries whose package was uninstalled and synchronises OS labels/icons.
 * Custom labels and custom icons are deliberately preserved.
 */
export async function syncGames(
  games: PinnedGame[],
  installed: LauncherApp[],
): Promise<PinnedGame[]> {
  const byPackage = new Map(installed.map(app => [app.packageName, app]));
  const next: PinnedGame[] = [];

  for (const game of games) {
    const app = byPackage.get(game.packageName);
    if (!app) {
      if (game.customIconPath) {
        await NexusNative.deleteFile(game.customIconPath).catch(() => false);
      }
      continue;
    }

    let customIconPath = game.customIconPath;
    if (customIconPath) {
      const exists = await NexusNative.fileExists(customIconPath).catch(
        () => false,
      );
      if (!exists) {
        customIconPath = undefined;
      }
    }

    next.push({ ...game, label: app.label, icon: app.icon, customIconPath });
  }

  await saveGames(next);
  return next;
}

export async function pinGame(app: LauncherApp): Promise<PinnedGame[]> {
  const games = await loadGames();
  if (games.some(game => game.packageName === app.packageName)) {
    return games;
  }
  const next = [
    ...games,
    {
      packageName: app.packageName,
      label: app.label,
      icon: app.icon,
      pinnedAt: Date.now(),
    },
  ];
  await saveGames(next);
  return next;
}

export async function unpinGame(packageName: string): Promise<PinnedGame[]> {
  const games = await loadGames();
  const removed = games.find(game => game.packageName === packageName);
  const next = games.filter(game => game.packageName !== packageName);
  await saveGames(next);
  if (removed?.customIconPath) {
    await NexusNative.deleteFile(removed.customIconPath).catch(() => false);
  }
  return next;
}

export async function updateGame(
  packageName: string,
  patch: Partial<PinnedGame>,
): Promise<PinnedGame[]> {
  const games = await loadGames();
  const next = games.map(game =>
    game.packageName === packageName ? { ...game, ...patch } : game,
  );
  await saveGames(next);
  return next;
}
