import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  batteryIcon,
  Icon,
  type IconName,
} from '../components/Icon';
import { MusicEqualizer } from '../components/MusicEqualizer';
import { ScreenTransition } from '../components/ScreenTransition';
import { SwipeUpUnlock } from '../components/SwipeUpUnlock';
import { WallpaperBackdrop } from '../components/WallpaperBackdrop';
import { Focusable } from '../gamepad/GamepadProvider';
import { useBattery } from '../hooks/useBattery';
import { useClock } from '../hooks/useClock';
import { useFlashlight } from '../hooks/useFlashlight';
import { useNetwork } from '../hooks/useNetwork';
import type { NowPlayingController } from '../hooks/useNowPlaying';
import { NexusNative } from '../services/NexusNative';
import { wallpaperUri } from '../services/WallpaperService';
import { withAlpha } from '../theme/colorUtils';
import { useLauncherPalette } from '../theme/ThemeContext';
import { useTypography } from '../theme/TypographyContext';
import type { NetworkState, Wallpaper } from '../types';
import { computeCoverLayout } from '../utils/smartCrop';

interface LockScreenProps {
  wallpaper: Wallpaper | null;
  media: NowPlayingController;
  onUnlock: () => void;
  onOpenWallpaper: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function presentNetwork(network: NetworkState | null): {
  icon: IconName;
  label: string;
} {
  if (!network || !network.connected || network.type === 'none') {
    return { icon: 'signalOff', label: 'Offline' };
  }
  if (network.type === 'wifi') {
    return { icon: 'wifi', label: 'Wi-Fi' };
  }
  if (network.type === 'vpn') {
    return { icon: 'globe', label: 'VPN' };
  }
  if (network.type === 'cellular') {
    return {
      icon: 'signal',
      label: network.cellularGeneration ?? 'Seluler',
    };
  }
  return { icon: 'signal', label: 'Ethernet' };
}

export function LockScreen({
  wallpaper,
  media,
  onUnlock,
  onOpenWallpaper,
}: LockScreenProps): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const clock = useClock();
  const battery = useBattery();
  const network = useNetwork();
  const flashlight = useFlashlight();

  const [imageFailed, setImageFailed] = useState(false);
  const compact = height < 400;
  const artSize = clamp(Math.min(height * 0.16, width * 0.09), 54, 104);
  const titleSize = clamp(height * 0.032, 15, 24);
  const metaSize = clamp(height * 0.022, 11, 15);
  const controlSize = clamp(height * 0.036, 18, 28);
  const track = media.state;

  const wallpaperLayout = useMemo(() => {
    if (!wallpaper) {
      return null;
    }
    return computeCoverLayout(
      wallpaper.width,
      wallpaper.height,
      width,
      height,
      wallpaper.crop,
    );
  }, [wallpaper, width, height]);

  useEffect(() => {
    setImageFailed(false);
  }, [wallpaper?.path]);

  const handleFlashlight = useCallback(async () => {
    if (flashlight.available === false) {
      Alert.alert(
        'Senter tidak tersedia',
        'Perangkat ini tidak memiliki lampu kilat.',
      );
      return;
    }
    try {
      await flashlight.toggle();
    } catch {
      Alert.alert('Senter tidak dapat digunakan', 'Silakan coba lagi.');
    }
  }, [flashlight]);

  const handleCamera = useCallback(async () => {
    try {
      await NexusNative.openCamera();
    } catch {
      Alert.alert('Kamera tidak tersedia', 'Silakan coba lagi.');
    }
  }, []);

  const connection = presentNetwork(network);
  const level = battery?.level ?? -1;

  const artwork = track.albumArtPath ? (
    <Image
      source={{ uri: wallpaperUri(track.albumArtPath) }}
      style={[styles.albumArt, { width: artSize, height: artSize }]}
      accessibilityLabel="Sampul album"
    />
  ) : (
    <View
      style={[
        styles.albumArt,
        styles.albumFallback,
        {
          width: artSize,
          height: artSize,
          backgroundColor: withAlpha(palette.primary, 0.18),
          borderColor: palette.primaryBorder,
        },
      ]}
    >
      <Icon
        name="musicNote"
        size={scaled(artSize * 0.45)}
        color={palette.primary}
      />
    </View>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.background }]}>
      <WallpaperBackdrop
        wallpaper={wallpaper}
        layout={wallpaperLayout}
        failed={imageFailed}
        onError={() => setImageFailed(true)}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          withAlpha(palette.background, 0.56),
          withAlpha(palette.background, 0.12),
          withAlpha(palette.background, 0.88),
        ]}
        locations={[0, 0.36, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: Math.max(12, insets.top + 8),
            paddingBottom: Math.max(10, insets.bottom + 8),
            paddingHorizontal: Math.max(20, insets.left + 16),
          },
        ]}
      >
        <View style={styles.statusRow}>
          <View style={styles.statusChip}>
            <Icon
              name={connection.icon}
              size={scaled(14)}
              color={network?.connected ? palette.primary : palette.textMuted}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: palette.textSecondary,
                  fontFamily: fonts.body,
                  fontSize: scaled(11),
                },
              ]}
              numberOfLines={1}
            >
              {connection.label}
            </Text>
          </View>
          <View style={styles.statusChip}>
            <Icon
              name={batteryIcon(level, battery?.charging ?? false)}
              size={scaled(15)}
              color={battery?.charging ? palette.tertiary : palette.primary}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: palette.textSecondary,
                  fontFamily: fonts.body,
                  fontSize: scaled(11),
                },
              ]}
            >
              {level >= 0 ? `${level}%` : '--%'}
            </Text>
          </View>
          <Focusable
            id="lock:settings"
            onPress={onOpenWallpaper}
            accessibilityRole="button"
            accessibilityLabel="Ganti wallpaper Lock Screen"
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: palette.glass, borderColor: palette.glassBorder },
              pressed && styles.pressed,
            ]}
          >
            <Icon name="wallpaper" size={scaled(18)} color={palette.textSecondary} />
          </Focusable>
        </View>

        <ScreenTransition
          style={styles.mainRow}
          from="bottom"
          delay={60}
          duration={340}
        >
          <View style={styles.musicColumn}>
            <Text
              style={[
                styles.date,
                {
                  color: palette.primary,
                  fontFamily: fonts.bodySemiBold,
                  fontSize: scaled(compact ? 12 : 14),
                },
              ]}
              numberOfLines={1}
            >
              {clock.date}
            </Text>

            <View
              style={[
                styles.musicCard,
                {
                  backgroundColor: withAlpha(palette.background, 0.52),
                  borderColor: palette.glassBorder,
                },
              ]}
            >
              {!media.accessGranted ? (
                <View style={styles.musicEmpty}>
                  <Icon
                    name="musicNote"
                    size={scaled(compact ? 24 : 32)}
                    color={palette.primary}
                  />
                  <Text
                    style={[
                      styles.musicEmptyTitle,
                      {
                        color: palette.textPrimary,
                        fontFamily: fonts.bodyBold,
                        fontSize: scaled(compact ? 13 : 16),
                      },
                    ]}
                  >
                    Musik membutuhkan izin notifikasi
                  </Text>
                  <Text
                    style={[
                      styles.musicEmptyHint,
                      {
                        color: palette.textMuted,
                        fontFamily: fonts.body,
                        fontSize: scaled(compact ? 10 : 12),
                      },
                    ]}
                  >
                    Izinkan akses agar launcher dapat membaca lagu yang diputar.
                  </Text>
                  <Focusable
                    id="lock:music:grant"
                    onPress={media.openAccessSettings}
                    accessibilityRole="button"
                    accessibilityLabel="Izinkan akses notifikasi"
                    style={({ pressed }) => [
                      styles.grantButton,
                      { borderColor: palette.primary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.grantText,
                        {
                          color: palette.primary,
                          fontFamily: fonts.bodyBold,
                          fontSize: scaled(11),
                        },
                      ]}
                    >
                      IZINKAN
                    </Text>
                  </Focusable>
                </View>
              ) : !track.hasSession ? (
                <View style={styles.musicEmpty}>
                  <Icon
                    name="musicNote"
                    size={scaled(compact ? 24 : 32)}
                    color={palette.primary}
                  />
                  <Text
                    style={[
                      styles.musicEmptyTitle,
                      {
                        color: palette.textPrimary,
                        fontFamily: fonts.bodyBold,
                        fontSize: scaled(compact ? 13 : 16),
                      },
                    ]}
                  >
                    Tidak ada lagu diputar
                  </Text>
                  <Text
                    style={[
                      styles.musicEmptyHint,
                      {
                        color: palette.textMuted,
                        fontFamily: fonts.body,
                        fontSize: scaled(compact ? 10 : 12),
                      },
                    ]}
                  >
                    Putar musik dari aplikasi lain untuk mengontrolnya di sini.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.musicHeader}>
                    <Text
                      style={[
                        styles.musicEyebrow,
                        {
                          color: palette.textMuted,
                          fontFamily: fonts.bodyBold,
                          fontSize: scaled(9),
                        },
                      ]}
                    >
                      SEDANG DIPUTAR
                    </Text>
                    <MusicEqualizer
                      playing={track.playing}
                      color={palette.primary}
                      height={compact ? 12 : 16}
                    />
                  </View>

                  <View style={styles.musicBody}>
                    {artwork}
                    <View style={styles.musicMeta}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.musicTitle,
                          {
                            color: palette.textPrimary,
                            fontFamily: fonts.displayBold,
                            fontSize: scaled(titleSize),
                          },
                        ]}
                      >
                        {track.title || 'Lagu tanpa judul'}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.musicArtist,
                          {
                            color: palette.textSecondary,
                            fontFamily: fonts.bodyMedium,
                            fontSize: scaled(metaSize),
                          },
                        ]}
                      >
                        {track.artist || track.album || 'Artis tidak diketahui'}
                      </Text>
                      {track.album && track.artist ? (
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.musicAlbum,
                            {
                              color: palette.textMuted,
                              fontFamily: fonts.body,
                              fontSize: scaled(metaSize * 0.86),
                            },
                          ]}
                        >
                          {track.album}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.musicControls}>
                    <Focusable
                      id="lock:music:previous"
                      onPress={() => media.control('previous')}
                      accessibilityRole="button"
                      accessibilityLabel="Lagu sebelumnya"
                      hitSlop={6}
                      ringRadius={20}
                      style={({ pressed }) => [
                        styles.musicControl,
                        { borderColor: palette.glassBorder },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Icon
                        name="skipPrevious"
                        size={scaled(controlSize)}
                        color={palette.textSecondary}
                      />
                    </Focusable>
                    <Focusable
                      id="lock:music:playPause"
                      onPress={() => media.control('playPause')}
                      accessibilityRole="button"
                      accessibilityLabel={
                        track.playing ? 'Jeda musik' : 'Putar musik'
                      }
                      hitSlop={6}
                      ringRadius={24}
                      style={({ pressed }) => [
                        styles.musicControl,
                        styles.musicPlayControl,
                        {
                          borderColor: palette.primaryBorder,
                          backgroundColor: withAlpha(palette.primary, 0.18),
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Icon
                        name={track.playing ? 'pause' : 'play'}
                        size={scaled(controlSize * 1.05)}
                        color={palette.primary}
                      />
                    </Focusable>
                    <Focusable
                      id="lock:music:next"
                      onPress={() => media.control('next')}
                      accessibilityRole="button"
                      accessibilityLabel="Lagu berikutnya"
                      hitSlop={6}
                      ringRadius={20}
                      style={({ pressed }) => [
                        styles.musicControl,
                        { borderColor: palette.glassBorder },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Icon
                        name="skipNext"
                        size={scaled(controlSize)}
                        color={palette.textSecondary}
                      />
                    </Focusable>
                  </View>
                </>
              )}
            </View>
          </View>

          <View
            style={[
              styles.clockCard,
              compact && styles.clockCardCompact,
              {
                backgroundColor: withAlpha(palette.background, 0.52),
                borderColor: palette.glassBorder,
              },
            ]}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Pukul ${clock.time}`}
          >
            <Icon
              name="schedule"
              size={scaled(compact ? 22 : 26)}
              color={palette.tertiary}
            />
            <Text
              allowFontScaling={false}
              style={[
                styles.clockValue,
                {
                  color: palette.textPrimary,
                  fontFamily: fonts.displayBold,
                  fontSize: scaled(compact ? 38 : 52),
                },
              ]}
            >
              {clock.time}
            </Text>
            <Text
              style={[
                styles.clockLabel,
                {
                  color: palette.textMuted,
                  fontFamily: fonts.body,
                  fontSize: scaled(11),
                },
              ]}
            >
              JAM
            </Text>
          </View>
        </ScreenTransition>

        <ScreenTransition
          style={styles.bottomRow}
          from="bottom"
          delay={140}
          duration={340}
        >
          <View style={styles.shortcutSlot}>
            <Focusable
              id="lock:flashlight"
              onPress={handleFlashlight}
              accessibilityRole="button"
              accessibilityLabel={
                flashlight.enabled ? 'Matikan senter' : 'Nyalakan senter'
              }
              style={({ pressed }) => [
                styles.shortcut,
                { backgroundColor: palette.glass, borderColor: palette.glassBorder },
                pressed && styles.pressed,
              ]}
            >
              <Icon
                name={flashlight.enabled ? 'flashlightOn' : 'flashlightOff'}
                size={scaled(20)}
                color={flashlight.enabled ? palette.tertiary : palette.textSecondary}
              />
              <Text
                style={[
                  styles.shortcutLabel,
                  {
                    color: palette.textSecondary,
                    fontFamily: fonts.body,
                    fontSize: scaled(10),
                  },
                ]}
              >
                Senter
              </Text>
            </Focusable>
          </View>

          <View style={styles.swipeSlot}>
            <Focusable
              id="lock:unlock"
              priority={1}
              onPress={onUnlock}
              ringRadius={21}
            >
              <SwipeUpUnlock
                onUnlock={onUnlock}
                compact={compact}
                label="Geser ke atas untuk membuka"
                icon="lock"
                accessibilityLabel="Buka launcher"
              />
            </Focusable>
          </View>

          <View style={[styles.shortcutSlot, styles.shortcutEnd]}>
            <Focusable
              id="lock:camera"
              onPress={handleCamera}
              accessibilityRole="button"
              accessibilityLabel="Buka kamera"
              style={({ pressed }) => [
                styles.shortcut,
                { backgroundColor: palette.glass, borderColor: palette.glassBorder },
                pressed && styles.pressed,
              ]}
            >
              <Icon
                name="camera"
                size={scaled(20)}
                color={palette.textSecondary}
              />
              <Text
                style={[
                  styles.shortcutLabel,
                  {
                    color: palette.textSecondary,
                    fontFamily: fonts.body,
                    fontSize: scaled(10),
                  },
                ]}
              >
                Kamera
              </Text>
            </Focusable>
          </View>
        </ScreenTransition>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderColor: 'rgba(255,255,255,0.14)',
    maxWidth: 180,
  },
  statusText: {
    maxWidth: 120,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginLeft: 'auto',
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    paddingVertical: 6,
  },
  musicColumn: {
    flex: 1,
    minWidth: 0,
    maxWidth: 780,
    gap: 8,
  },
  date: {
    letterSpacing: 0.6,
  },
  musicCard: {
    flexShrink: 1,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  musicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  musicEyebrow: {
    letterSpacing: 1.6,
  },
  musicBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  albumArt: {
    borderRadius: 14,
  },
  albumFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  musicMeta: {
    flexShrink: 1,
    gap: 3,
  },
  musicTitle: {
    letterSpacing: -0.2,
  },
  musicArtist: {
    letterSpacing: 0.1,
  },
  musicAlbum: {
    letterSpacing: 0.1,
  },
  musicControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  musicControl: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  musicPlayControl: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  musicEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  musicEmptyTitle: {
    textAlign: 'center',
  },
  musicEmptyHint: {
    textAlign: 'center',
    maxWidth: 360,
  },
  grantButton: {
    marginTop: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  grantText: {
    letterSpacing: 0.9,
  },
  clockCard: {
    width: 200,
    minHeight: 150,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  clockCardCompact: {
    width: 150,
    minHeight: 110,
  },
  clockValue: {
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.5,
  },
  clockLabel: {
    letterSpacing: 1.2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    gap: 12,
  },
  shortcutSlot: {
    width: 82,
    alignItems: 'flex-start',
  },
  shortcutEnd: {
    alignItems: 'flex-end',
  },
  shortcut: {
    width: 72,
    height: 54,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  shortcutLabel: {
    textAlign: 'center',
  },
  swipeSlot: {
    flex: 1,
    maxWidth: 460,
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
});
