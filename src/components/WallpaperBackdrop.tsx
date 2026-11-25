import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { Wallpaper } from '../types';
import type { CropLayout } from '../utils/smartCrop';
import { wallpaperUri } from '../services/WallpaperService';

interface WallpaperBackdropProps {
  wallpaper: Wallpaper | null;
  layout: CropLayout | null;
  failed: boolean;
  onError: () => void;
}

/**
 * Full-bleed wallpaper with a built-in fallback. The fallback is always mounted so
 * a corrupt/missing image can never leave the lock screen blank.
 */
export function WallpaperBackdrop({
  wallpaper,
  layout,
  failed,
  onError,
}: WallpaperBackdropProps): React.JSX.Element {
  const showImage = wallpaper != null && layout != null && !failed;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#151B28', '#0F1015', '#171114']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.blueGlow} />
      <View style={styles.goldGlow} />
      <View style={styles.ring} />

      {showImage ? (
        <Image
          key={wallpaper.path}
          source={{ uri: wallpaperUri(wallpaper.path) }}
          style={[
            styles.image,
            {
              left: layout.left,
              top: layout.top,
              width: layout.width,
              height: layout.height,
            },
          ]}
          resizeMode="cover"
          fadeDuration={0}
          onError={onError}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    position: 'absolute',
  },
  blueGlow: {
    position: 'absolute',
    width: 460,
    height: 460,
    borderRadius: 230,
    backgroundColor: 'rgba(176, 199, 247, 0.10)',
    top: -180,
    right: -110,
  },
  goldGlow: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(230, 194, 121, 0.06)',
    bottom: -170,
    left: -90,
  },
  ring: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    right: 40,
    bottom: -150,
  },
});
