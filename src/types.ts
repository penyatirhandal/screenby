export type BatteryStatus =
  | 'charging'
  | 'full'
  | 'discharging'
  | 'not_charging'
  | 'unknown';

export type PluggedSource = 'ac' | 'usb' | 'wireless' | 'none';

export interface BatteryState {
  /** 0 - 100, or -1 when the OS does not report a level. */
  level: number;
  charging: boolean;
  status: BatteryStatus;
  plugged: PluggedSource;
  timestamp: number;
}

export type NetworkType = 'wifi' | 'cellular' | 'ethernet' | 'vpn' | 'none';

export interface NetworkState {
  type: NetworkType;
  /** Human readable transport name, e.g. "Wi-Fi" or "Seluler". */
  label: string;
  connected: boolean;
  validated: boolean;
  metered: boolean;
  /** "2G" | "3G" | "4G" | "5G" when the OS grants phone state access, else null. */
  cellularGeneration: string | null;
  operator: string | null;
}

export interface CropState {
  /** Normalised focal point, 0 = left/top edge, 1 = right/bottom edge. */
  fx: number;
  fy: number;
  /** 1 = cover fit, up to MAX_ZOOM. */
  zoom: number;
}

export interface Wallpaper {
  /** Absolute path inside app-private storage (no file:// prefix). */
  path: string;
  /** Pixel dimensions of the stored (already rotated/downscaled) image. */
  width: number;
  height: number;
  crop: CropState;
}

export interface ImportedWallpaper {
  path: string;
  width: number;
  height: number;
}
