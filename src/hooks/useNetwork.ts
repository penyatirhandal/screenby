import { useEffect, useState } from 'react';
import { NexusNative, subscribeToNetwork } from '../services/NexusNative';
import type { NetworkState } from '../types';

/**
 * Network transport updates are pushed from a ConnectivityManager callback.
 */
export function useNetwork(): NetworkState | null {
  const [network, setNetwork] = useState<NetworkState | null>(null);

  useEffect(() => {
    let mounted = true;

    NexusNative.getNetworkStatus()
      .then(state => {
        if (mounted) {
          setNetwork(state);
        }
      })
      .catch(() => {
        // The status bar falls back to an offline indicator.
      });

    const unsubscribe = subscribeToNetwork(state => {
      if (mounted) {
        setNetwork(state);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return network;
}
