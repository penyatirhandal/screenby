export interface EmulatorPreset {
  id: string;
  label: string;
  packageNames: string[];
  keywords: string[];
  extensions: string[];
}

/** Used when an installed app is not recognised as a known emulator. */
export const DEFAULT_EXTENSIONS = ['iso', 'bin', 'cue', 'chd', 'zip'];

/**
 * Only used to label and pre-fill extensions for apps that are already
 * installed. It is no longer a source of selectable emulator entries.
 */
export const EMULATOR_PRESETS: EmulatorPreset[] = [
  {
    id: 'ps1',
    label: 'PlayStation 1',
    packageNames: ['com.epse', 'com.retroarch'],
    keywords: ['epsxe', 'epse', 'psx', 'playstation 1', 'duckstation'],
    extensions: ['iso', 'bin', 'cue', 'chd', 'pbp', 'zip'],
  },
  {
    id: 'ps2',
    label: 'PlayStation 2',
    packageNames: ['xyz.aethersx2.android'],
    keywords: ['aethersx2', 'pcsx2', 'playstation 2'],
    extensions: ['iso', 'bin', 'cue', 'chd', 'zip'],
  },
  {
    id: 'psp',
    label: 'PSP',
    packageNames: ['org.ppsspp.ppsspp'],
    keywords: ['ppsspp', 'psp'],
    extensions: ['iso', 'cso', 'chd', 'zip'],
  },
  {
    id: 'nds',
    label: 'Nintendo DS',
    packageNames: ['com.ds.draSticDS', 'me.magnum.melonds'],
    keywords: ['drastic', 'melonds', 'nintendo ds'],
    extensions: ['nds', 'zip'],
  },
  {
    id: '3ds',
    label: 'Nintendo 3DS',
    packageNames: ['org.citra.emu', 'org.citra.citra_emu'],
    keywords: ['citra', '3ds'],
    extensions: ['3ds', 'cia', 'cci', 'app', 'zip'],
  },
  {
    id: 'switch',
    label: 'Nintendo Switch',
    packageNames: ['org.yuzu.yuzu_emu'],
    keywords: ['yuzu', 'sudachi', 'switch emulator'],
    extensions: ['nsp', 'xci', 'zip'],
  },
  {
    id: 'retroarch',
    label: 'RetroArch',
    packageNames: ['com.retroarch', 'org.retroarch'],
    keywords: ['retroarch'],
    extensions: [
      'iso',
      'bin',
      'cue',
      'chd',
      'zip',
      'nes',
      'snes',
      'gb',
      'gba',
      'nds',
    ],
  },
];

/** An option is always backed by an installed APK. */
export interface EmulatorOption {
  id: string;
  label: string;
  packageName: string;
  extensions: string[];
}

function matchesPreset(
  preset: EmulatorPreset,
  label: string,
  packageName: string,
): boolean {
  const lower = `${label} ${packageName}`.toLowerCase();
  return (
    preset.packageNames.some(name => lower.includes(name.toLowerCase())) ||
    preset.keywords.some(keyword => lower.includes(keyword))
  );
}

export function matchingPreset(
  label: string,
  packageName: string,
): EmulatorPreset | undefined {
  return EMULATOR_PRESETS.find(preset => matchesPreset(preset, label, packageName));
}

/** True when the installed APK looks like a known emulator. */
export function isKnownEmulator(label: string, packageName: string): boolean {
  return matchingPreset(label, packageName) !== undefined;
}

/** Normalises the editable "Ekstensi" field into a clean extension list. */
export function parseExtensions(input: string): string[] {
  const values = input
    .split(/[\s,;]+/)
    .map(value => value.trim().replace(/^\./, '').toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(values));
}

/** Extensions used as the initial scan filter for an installed APK. */
export function extensionsForApp(label: string, packageName: string): string[] {
  return matchingPreset(label, packageName)?.extensions ?? DEFAULT_EXTENSIONS;
}
