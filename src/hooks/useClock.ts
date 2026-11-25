import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

const WEEKDAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

const ZONE_LABELS: Record<string, string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Pontianak': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
};

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatOffset(date: Date): string {
  const totalMinutes = -date.getTimezoneOffset();
  const sign = totalMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(totalMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `GMT${sign}${hours}${minutes > 0 ? `:${pad(minutes)}` : ''}`;
}

function resolveZoneName(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) {
      return '';
    }
    return ZONE_LABELS[zone] ?? zone.split('/').pop()?.replace(/_/g, ' ') ?? '';
  } catch {
    return '';
  }
}

export interface ClockInfo {
  time: string;
  date: string;
  timezone: string;
}

/**
 * Re-renders exactly when the wall clock minute changes (no per-second polling) and
 * refreshes on resume so the lock screen is never stale after being backgrounded.
 */
export function useClock(): ClockInfo {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const scheduleNextMinute = () => {
      const delay = 60_000 - (Date.now() % 60_000) + 50;
      timeout = setTimeout(() => {
        setNow(new Date());
        scheduleNextMinute();
      }, delay);
    };

    scheduleNextMinute();

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setNow(new Date());
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, []);

  return useMemo(() => {
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const date = `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${
      MONTHS[now.getMonth()]
    } ${now.getFullYear()}`;
    const zoneName = resolveZoneName();
    const offset = formatOffset(now);

    return {
      time,
      date,
      timezone: zoneName ? `${zoneName} · ${offset}` : offset,
    };
  }, [now]);
}
