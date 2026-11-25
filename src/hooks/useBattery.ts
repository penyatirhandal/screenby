import { useEffect, useState } from 'react';
import { NexusNative, subscribeToBattery } from '../services/NexusNative';
import type { BatteryState } from '../types';

/**
 * Battery state comes from a native BroadcastReceiver (ACTION_BATTERY_CHANGED),
 * so there is no polling loop in JS.
 */
export function useBattery(): BatteryState | null {
  const [battery, setBattery] = useState<BatteryState | null>(null);

  useEffect(() => {
    let mounted = true;

    NexusNative.getBatteryStatus()
      .then(state => {
        if (mounted) {
          setBattery(state);
        }
      })
      .catch(() => {
        // Battery information is optional; the UI shows placeholders.
      });

    const unsubscribe = subscribeToBattery(state => {
      if (mounted) {
        setBattery(state);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return battery;
}
