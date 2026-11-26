jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  const mock = {
    getItem: jest.fn(async (key: string) => store[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    clear: jest.fn(async () => {
      store = {};
    }),
    __store: store,
  };
  return {__esModule: true, default: mock};
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  defaultDesktopItems,
  loadSettings,
  saveSettings,
} from '../src/services/LauncherSettingsService';

const STORAGE_KEY = '@nexus/launcher/settings/v1';

function builtinItems() {
  return [
    {
      id: 'builtin-clock',
      kind: 'builtin' as const,
      widget: 'clock' as const,
      x: 0.05,
      y: 0.1,
      width: 0.33,
      height: 0.68,
    },
    {
      id: 'builtin-date',
      kind: 'builtin' as const,
      widget: 'date' as const,
      x: 0.42,
      y: 0.1,
      width: 0.24,
      height: 0.22,
    },
    {
      id: 'builtin-battery',
      kind: 'builtin' as const,
      widget: 'battery' as const,
      x: 0.42,
      y: 0.39,
      width: 0.24,
      height: 0.22,
    },
    {
      id: 'builtin-network',
      kind: 'builtin' as const,
      widget: 'network' as const,
      x: 0.42,
      y: 0.68,
      width: 0.24,
      height: 0.22,
    },
  ];
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('fresh installs use the music widget instead of battery', () => {
  const widgets = defaultDesktopItems()
    .filter(item => item.kind === 'builtin')
    .map(item => (item as {widget: string}).widget);
  expect(widgets).toEqual(['clock', 'date', 'music', 'network']);
});

test('migrates a legacy default battery widget to music', async () => {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      font: 'inter',
      fontSize: 'normal',
      desktopWidgets: ['clock', 'date', 'battery', 'network'],
      desktopItems: builtinItems(),
    }),
  );

  const settings = await loadSettings();
  const widgets = settings.desktopItems
    .filter(item => item.kind === 'builtin')
    .map(item => (item as {widget: string}).widget);
  expect(widgets).toContain('music');
  expect(widgets).not.toContain('battery');
});

test('keeps a manually placed battery widget', async () => {
  const items = builtinItems().map(item =>
    item.widget === 'battery' ? {...item, x: 0.1, y: 0.7} : item,
  );
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      font: 'inter',
      fontSize: 'normal',
      desktopWidgets: ['clock', 'date', 'battery', 'network'],
      desktopItems: items,
    }),
  );

  const settings = await loadSettings();
  const widgets = settings.desktopItems
    .filter(item => item.kind === 'builtin')
    .map(item => (item as {widget: string}).widget);
  expect(widgets).toContain('battery');
  expect(widgets).not.toContain('music');
});

test('migration is idempotent after saving', async () => {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      font: 'inter',
      fontSize: 'normal',
      desktopWidgets: ['clock', 'date', 'battery', 'network'],
      desktopItems: builtinItems(),
    }),
  );

  const first = await loadSettings();
  await saveSettings(first);
  const second = await loadSettings();
  expect(second.desktopItems).toEqual(first.desktopItems);
});
