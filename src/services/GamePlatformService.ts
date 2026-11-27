import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GamePlatform, PlatformGame } from '../types';

const STORAGE_KEY = '@nexus/launcher/platforms/v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseGame(raw: unknown): PlatformGame | null {
  if (!isRecord(raw)) {
    return null;
  }
  const id = text(raw.id);
  const uri = text(raw.uri);
  if (!id || !uri) {
    return null;
  }
  return {
    id,
    name: text(raw.name) || uri,
    uri,
    size: typeof raw.size === 'number' ? raw.size : 0,
    modifiedAt: typeof raw.modifiedAt === 'number' ? raw.modifiedAt : 0,
    customLabel: optionalText(raw.customLabel),
    customIconPath: optionalText(raw.customIconPath),
    releaseYear: optionalText(raw.releaseYear),
    genre: optionalText(raw.genre),
    developer: optionalText(raw.developer),
    publisher: optionalText(raw.publisher),
    lastPlayedAt:
      typeof raw.lastPlayedAt === 'number' ? raw.lastPlayedAt : undefined,
  };
}

function parsePlatform(raw: unknown): GamePlatform | null {
  if (!isRecord(raw)) {
    return null;
  }
  const id = text(raw.id);
  const name = text(raw.name);
  const folderUri = text(raw.folderUri);
  if (!id || !name || !folderUri) {
    return null;
  }

  const games = Array.isArray(raw.games)
    ? raw.games
        .map(parseGame)
        .filter((game): game is PlatformGame => game !== null)
    : [];

  return {
    id,
    name,
    emulatorId: text(raw.emulatorId) || 'custom',
    emulatorLabel: text(raw.emulatorLabel) || 'Emulator',
    emulatorPackage: typeof raw.emulatorPackage === 'string' ? raw.emulatorPackage : null,
    extensions: Array.isArray(raw.extensions)
      ? raw.extensions.filter((item): item is string => typeof item === 'string')
      : [],
    folderUri,
    folderName: text(raw.folderName) || 'Folder game',
    games,
    scannedAt: typeof raw.scannedAt === 'number' ? raw.scannedAt : null,
  };
}

export async function loadPlatforms(): Promise<GamePlatform[]> {
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
      .map(parsePlatform)
      .filter((platform): platform is GamePlatform => platform !== null);
  } catch {
    return [];
  }
}

export async function savePlatforms(platforms: GamePlatform[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(platforms));
}
