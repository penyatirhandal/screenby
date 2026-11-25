import { useCallback, useEffect, useState } from 'react';
import { NexusNative } from '../services/NexusNative';

export interface FlashlightController {
  available: boolean | null;
  enabled: boolean;
  toggle: () => Promise<void>;
}

export function useFlashlight(): FlashlightController {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    NexusNative.isFlashlightAvailable()
      .then(value => {
        if (mounted) {
          setAvailable(value);
        }
      })
      .catch(() => {
        if (mounted) {
          setAvailable(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const toggle = useCallback(async () => {
    const next = await NexusNative.toggleFlashlight();
    setEnabled(next);
  }, []);

  return { available, enabled, toggle };
}
