import {AppState} from 'react-native';
import {useCallback, useEffect, useState} from 'react';
import {NexusMedia, subscribeToMedia} from '../services/NexusMedia';
import type {NowPlayingState} from '../types';

export interface NowPlayingController {
  state: NowPlayingState;
  accessGranted: boolean;
  control: (action: 'playPause' | 'next' | 'previous') => void;
  openAccessSettings: () => void;
}

const EMPTY_STATE: NowPlayingState = {
  hasSession: false,
  playing: false,
  title: null,
  artist: null,
  album: null,
  packageName: null,
};

/** Reads the active media session; Notification access is checked on resume. */
export function useNowPlaying(): NowPlayingController {
  const [state, setState] = useState<NowPlayingState>(EMPTY_STATE);
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      NexusMedia.getNowPlaying()
        .then(next => {
          if (mounted) {
            setState(next);
          }
        })
        .catch(() => undefined);
      NexusMedia.isNotificationAccessGranted()
        .then(granted => {
          if (mounted) {
            setAccessGranted(granted);
          }
        })
        .catch(() => undefined);
    };

    refresh();
    const unsubscribe = subscribeToMedia(next => {
      if (mounted) {
        setState(next);
      }
    });
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') {
        refresh();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
      subscription.remove();
    };
  }, []);

  const control = useCallback((action: 'playPause' | 'next' | 'previous') => {
    NexusMedia.control(action).catch(() => undefined);
  }, []);

  const openAccessSettings = useCallback(() => {
    NexusMedia.openNotificationAccessSettings();
  }, []);

  return {state, accessGranted, control, openAccessSettings};
}
