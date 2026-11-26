import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AddedWidget,
  BuiltinWidget,
  DesktopWidgetItem,
  DesktopWidgetLayout,
  FontChoice,
  FontSizeChoice,
  LauncherSettings,
  WidgetProvider,
} from '../types';

const STORAGE_KEY = '@nexus/launcher/settings/v1';

export const DESKTOP_WIDGETS: BuiltinWidget[] = [
  'clock',
  'date',
  'battery',
  'network',
];

const FONTS: FontChoice[] = ['hack', 'inter', 'arial'];
const SIZES: FontSizeChoice[] = ['small', 'normal', 'large', 'xlarge'];

const DEFAULT_LAYOUT: Record<BuiltinWidget, DesktopWidgetLayout> = {
  clock: {x: 0.05, y: 0.1, width: 0.33, height: 0.68},
  date: {x: 0.42, y: 0.1, width: 0.24, height: 0.22},
  battery: {x: 0.42, y: 0.39, width: 0.24, height: 0.22},
  network: {x: 0.42, y: 0.68, width: 0.24, height: 0.22},
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function sanitizeLayout(value: unknown, fallback: DesktopWidgetLayout) {
  const candidate =
    typeof value === 'object' && value !== null
      ? (value as Partial<DesktopWidgetLayout>)
      : fallback;
  const width = clamp(candidate.width ?? fallback.width, 0.08, 1);
  const height = clamp(candidate.height ?? fallback.height, 0.08, 1);
  const x = clamp(candidate.x ?? fallback.x, 0, 1 - width);
  const y = clamp(candidate.y ?? fallback.y, 0, 1 - height);
  return {x, y, width, height};
}

export function makeBuiltinItem(
  widget: BuiltinWidget,
  layout?: Partial<DesktopWidgetLayout>,
  suffix = '',
): DesktopWidgetItem {
  return {
    id: `builtin-${widget}${suffix ? `-${suffix}` : ''}`,
    kind: 'builtin',
    widget,
    ...sanitizeLayout(layout ?? {}, DEFAULT_LAYOUT[widget]),
  };
}

export function makeAppWidgetItem(
  added: AddedWidget | WidgetProvider,
  layout: Partial<DesktopWidgetLayout>,
  suffix = '',
): DesktopWidgetItem | null {
  if (!('appWidgetId' in added) || added.appWidgetId < 0) {
    return null;
  }
  return {
    id: `app-${added.appWidgetId}${suffix ? `-${suffix}` : ''}`,
    kind: 'appwidget',
    appWidgetId: added.appWidgetId,
    provider: added.provider,
    label: added.label,
    ...sanitizeLayout(layout, {
      x: 0.3,
      y: 0.2,
      width: 0.32,
      height: 0.42,
    }),
  };
}

export function defaultDesktopItems(): DesktopWidgetItem[] {
  return DESKTOP_WIDGETS.map(widget => makeBuiltinItem(widget));
}

function itemsFromLegacy(widgets: unknown): DesktopWidgetItem[] {
  if (!Array.isArray(widgets)) {
    return defaultDesktopItems();
  }
  const allowed = new Set<BuiltinWidget>(DESKTOP_WIDGETS);
  const selected = DESKTOP_WIDGETS.filter(widget => widgets.includes(widget));
  if (selected.length === 0 && widgets.length > 0) {
    return defaultDesktopItems();
  }
  return allowed.size > 0 ? selected.map(widget => makeBuiltinItem(widget)) : [];
}

function sanitizeItems(value: unknown): DesktopWidgetItem[] {
  if (!Array.isArray(value)) {
    return defaultDesktopItems();
  }
  const seen = new Set<string>();
  const result: DesktopWidgetItem[] = [];

  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) {
      continue;
    }
    const candidate = raw as Partial<DesktopWidgetItem> & {
      widget?: unknown;
      appWidgetId?: unknown;
      provider?: unknown;
      label?: unknown;
    };
    const fallbackId =
      candidate.kind === 'appwidget'
        ? `app-${String(candidate.appWidgetId ?? Date.now())}`
        : `builtin-${String(candidate.widget ?? 'clock')}`;
    let id =
      typeof candidate.id === 'string' && candidate.id.length > 0
        ? candidate.id
        : fallbackId;
    if (seen.has(id)) {
      let counter = 2;
      while (seen.has(`${id}-${counter}`)) {
        counter += 1;
      }
      id = `${id}-${counter}`;
    }
    seen.add(id);

    if (candidate.kind === 'appwidget') {
      const appWidgetId =
        typeof candidate.appWidgetId === 'number' &&
        Number.isInteger(candidate.appWidgetId) &&
        candidate.appWidgetId >= 0
          ? candidate.appWidgetId
          : -1;
      if (appWidgetId < 0) {
        continue;
      }
      result.push({
        id,
        kind: 'appwidget',
        appWidgetId,
        provider:
          typeof candidate.provider === 'string' ? candidate.provider : '',
        label: typeof candidate.label === 'string' ? candidate.label : 'Widget',
        ...sanitizeLayout(candidate, {
          x: 0.3,
          y: 0.2,
          width: 0.32,
          height: 0.42,
        }),
      });
      continue;
    }

    if (
      candidate.kind !== 'builtin' ||
      typeof candidate.widget !== 'string' ||
      !DESKTOP_WIDGETS.includes(candidate.widget as BuiltinWidget)
    ) {
      continue;
    }
    const widget = candidate.widget as BuiltinWidget;
    result.push({
      id,
      kind: 'builtin',
      widget,
      ...sanitizeLayout(candidate, DEFAULT_LAYOUT[widget]),
    });
  }

  return result;
}

function sanitizeLegacyWidgets(value: unknown): BuiltinWidget[] {
  if (!Array.isArray(value)) {
    return [...DESKTOP_WIDGETS];
  }
  const seen = new Set<BuiltinWidget>();
  for (const item of value) {
    if (typeof item === 'string' && DESKTOP_WIDGETS.includes(item as BuiltinWidget)) {
      seen.add(item as BuiltinWidget);
    }
  }
  return DESKTOP_WIDGETS.filter(widget => seen.has(widget));
}

function legacyWidgetsFromItems(items: DesktopWidgetItem[]): BuiltinWidget[] {
  const present = new Set(
    items
        .filter(item => item.kind === 'builtin')
        .map(item => (item as {widget: BuiltinWidget}).widget),
  );
  return DESKTOP_WIDGETS.filter(widget => present.has(widget));
}

export async function loadSettings(): Promise<LauncherSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        font: DEFAULT_SETTINGS.font,
        fontSize: DEFAULT_SETTINGS.fontSize,
        desktopWidgets: [...DESKTOP_WIDGETS],
        desktopItems: defaultDesktopItems(),
      };
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('invalid settings');
    }
    const candidate = parsed as Partial<LauncherSettings> & {
      desktopItems?: unknown;
      desktopWidgets?: unknown;
    };
    const hasItems =
      Object.prototype.hasOwnProperty.call(candidate, 'desktopItems') &&
      Array.isArray(candidate.desktopItems);
    const desktopItems = hasItems
      ? sanitizeItems(candidate.desktopItems)
      : itemsFromLegacy(candidate.desktopWidgets);
    return {
      font: FONTS.includes(candidate.font as FontChoice)
        ? (candidate.font as FontChoice)
        : DEFAULT_SETTINGS.font,
      fontSize: SIZES.includes(candidate.fontSize as FontSizeChoice)
        ? (candidate.fontSize as FontSizeChoice)
        : DEFAULT_SETTINGS.fontSize,
      desktopWidgets: hasItems
        ? legacyWidgetsFromItems(desktopItems)
        : sanitizeLegacyWidgets(candidate.desktopWidgets),
      desktopItems,
    };
  } catch {
    return {
      font: DEFAULT_SETTINGS.font,
      fontSize: DEFAULT_SETTINGS.fontSize,
      desktopWidgets: [...DESKTOP_WIDGETS],
      desktopItems: defaultDesktopItems(),
    };
  }
}

export async function saveSettings(
  settings: LauncherSettings,
): Promise<void> {
  const stored: LauncherSettings = {
    font: settings.font,
    fontSize: settings.fontSize,
    desktopWidgets: legacyWidgetsFromItems(settings.desktopItems),
    desktopItems: settings.desktopItems,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export const DEFAULT_SETTINGS: LauncherSettings = {
  font: 'inter',
  fontSize: 'normal',
  desktopWidgets: [...DESKTOP_WIDGETS],
  desktopItems: defaultDesktopItems(),
};
