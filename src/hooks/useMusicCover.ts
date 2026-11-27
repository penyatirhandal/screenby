import {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {NexusNative} from '../services/NexusNative';
import {
  loadMusicCover,
  saveMusicCover,
} from '../services/MusicCoverService';

export interface MusicCoverController {
  /** App-private path of the chosen image, or null before the first pick. */
  path: string | null;
  /** True while the gallery or the image import is open. */
  picking: boolean;
  /** Opens the gallery and stores the chosen image as the music cover. */
  pick: () => Promise<void>;
}

/** Loads and replaces the single cover used by every track. */
export function useMusicCover(): MusicCoverController {
  const [path, setPath] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const pickingRef = useRef(false);

  useEffect(() => {
    let active = true;
    loadMusicCover()
      .then(next => {
        if (active) {
          setPath(next);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const pick = useCallback(async () => {
    if (pickingRef.current) {
      return;
    }
    pickingRef.current = true;
    setPicking(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: false,
        quality: 1,
      });
      if (result.didCancel) {
        return;
      }
      if (result.errorCode) {
        throw new Error(result.errorMessage ?? 'Galeri tidak dapat dibuka.');
      }
      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        throw new Error('Tidak ada gambar yang dipilih.');
      }
      const imported = await NexusNative.saveMusicCover(uri);
      await saveMusicCover(imported.path);
      setPath(imported.path);
    } catch (error) {
      Alert.alert(
        'Gagal mengganti cover',
        error instanceof Error ? error.message : 'Silakan coba lagi.',
      );
    } finally {
      pickingRef.current = false;
      setPicking(false);
    }
  }, []);

  return {path, picking, pick};
}
