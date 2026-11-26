import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppDrawer } from '../components/AppDrawer';
import { BatteryCard } from '../components/BatteryCard';
import { ClockWidget } from '../components/ClockWidget';
import { ShortcutButton } from '../components/ShortcutButton';
import { StatusBar as NexusStatusBar } from '../components/StatusBar';
import { SwipeUpUnlock } from '../components/SwipeUpUnlock';
import { WallpaperBackdrop } from '../components/WallpaperBackdrop';
import { WallpaperSheet } from '../components/WallpaperSheet';
import { WeatherWidget } from '../components/WeatherWidget';
import { useBattery } from '../hooks/useBattery';
import { useClock } from '../hooks/useClock';
import { useFlashlight } from '../hooks/useFlashlight';
import { useNetwork } from '../hooks/useNetwork';
import { useWallpaper } from '../hooks/useWallpaper';
import { NexusNative } from '../services/NexusNative';
import { colors } from '../theme/colors';
import { useLauncherPalette } from '../theme/ThemeContext';
import type { CropState } from '../types';
import { computeCoverLayout } from '../utils/smartCrop';

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Silakan coba lagi.';
}

export function LockScreen(): React.JSX.Element {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const palette = useLauncherPalette();

  const clock = useClock();
  const battery = useBattery();
  const network = useNetwork();
  const { wallpaper, choose, saveCrop, remove } = useWallpaper();
  const {
    available: flashlightAvailable,
    enabled: flashlightOn,
    toggle,
  } = useFlashlight();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const exitProgress = useRef(new Animated.Value(0)).current;
  const unlockingRef = useRef(false);

  const compact = height < 380;
  const clockSize = Math.round(Math.min(Math.max(height * 0.285, 64), 148));
  const cardWidth = Math.round(Math.min(Math.max(width * 0.24, 182), 258));
  const shortcutSize = compact ? 44 : 50;

  const horizontalPadding = useMemo(
    () => ({
      paddingLeft: Math.max(24, insets.left + 18),
      paddingRight: Math.max(24, insets.right + 18),
    }),
    [insets.left, insets.right],
  );

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

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (sheetVisible) {
          setSheetVisible(false);
        } else if (drawerVisible) {
          setDrawerVisible(false);
        }
        // A launcher stays on the home screen when Back is pressed.
        return true;
      },
    );
    return () => subscription.remove();
  }, [drawerVisible, sheetVisible]);

  const handleOpenDrawer = useCallback(() => {
    if (unlockingRef.current) {
      return;
    }
    unlockingRef.current = true;
    setSheetVisible(false);

    Animated.timing(exitProgress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setDrawerVisible(true);
      exitProgress.setValue(0);
      unlockingRef.current = false;
    });
  }, [exitProgress]);

  const handleFlashlight = useCallback(async () => {
    if (flashlightAvailable === false) {
      Alert.alert(
        'Senter tidak tersedia',
        'Perangkat ini tidak memiliki lampu kilat.',
      );
      return;
    }
    try {
      await toggle();
    } catch (error) {
      Alert.alert('Senter tidak dapat digunakan', toMessage(error));
    }
  }, [flashlightAvailable, toggle]);

  const handleCamera = useCallback(async () => {
    try {
      await NexusNative.openCamera();
    } catch (error) {
      Alert.alert('Kamera tidak tersedia', toMessage(error));
    }
  }, []);

  const handlePick = useCallback(async () => {
    const next = await choose();
    if (next) {
      setImageFailed(false);
    }
    return next;
  }, [choose]);

  const handleSaveCrop = useCallback(
    async (crop: CropState) => {
      await saveCrop(crop);
      setImageFailed(false);
    },
    [saveCrop],
  );

  const handleRemove = useCallback(async () => {
    await remove();
    setImageFailed(false);
  }, [remove]);

  const translateY = exitProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.16],
  });

  return (
    <Animated.View
      style={[
        styles.root,
        {
          backgroundColor: palette.background,
          opacity: exitProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
          transform: [{ translateY }],
        },
      ]}
    >
      <WallpaperBackdrop
        wallpaper={wallpaper}
        layout={wallpaperLayout}
        failed={imageFailed}
        onError={() => setImageFailed(true)}
      />

      <LinearGradient
        pointerEvents="none"
        colors={[
          colors.scrimTop,
          colors.scrimClear,
          colors.scrimClear,
          colors.scrimBottom,
        ]}
        locations={[0, 0.28, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        pointerEvents="none"
        colors={[colors.scrimSide, colors.scrimClear]}
        locations={[0, 0.62]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.content,
          horizontalPadding,
          {
            paddingTop: Math.max(14, insets.top + 10),
            paddingBottom: Math.max(12, insets.bottom + 10),
          },
        ]}
      >
        <NexusStatusBar
          battery={battery}
          network={network}
          onOpenWallpaper={() => setSheetVisible(true)}
        />

        <View style={styles.mainRow}>
          <View style={styles.leftColumn}>
            <WeatherWidget date={clock.date} />
            <ClockWidget
              time={clock.time}
              timezone={clock.timezone}
              size={clockSize}
            />
          </View>

          <BatteryCard battery={battery} width={cardWidth} />
        </View>

        <View style={[styles.bottomRow, compact && styles.bottomRowCompact]}>
          <View style={[styles.shortcutSlot, styles.shortcutStart]}>
            <ShortcutButton
              icon={flashlightOn ? 'flashlightOn' : 'flashlightOff'}
              label="Senter"
              active={flashlightOn}
              size={shortcutSize}
              onPress={handleFlashlight}
              accessibilityHint="Menyalakan atau mematikan lampu kilat"
            />
          </View>

          <View style={styles.swipeSlot}>
            <SwipeUpUnlock
              onUnlock={handleOpenDrawer}
              compact={compact}
              label="Geser ke atas untuk pustaka aplikasi"
              icon="gallery"
              accessibilityLabel="Buka pustaka aplikasi"
            />
          </View>

          <View style={[styles.shortcutSlot, styles.shortcutEnd]}>
            <ShortcutButton
              icon="camera"
              label="Kamera"
              size={shortcutSize}
              onPress={handleCamera}
              accessibilityHint="Membuka aplikasi kamera perangkat"
            />
          </View>
        </View>
      </View>

      <AppDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onOpenTheme={() => {
          setDrawerVisible(false);
          setSheetVisible(true);
        }}
      />

      <WallpaperSheet
        visible={sheetVisible}
        wallpaper={wallpaper}
        onClose={() => setSheetVisible(false)}
        onPick={handlePick}
        onSave={handleSaveCrop}
        onRemove={handleRemove}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    paddingVertical: 4,
  },
  leftColumn: {
    flexShrink: 1,
    gap: 8,
    paddingLeft: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
  },
  bottomRowCompact: {
    minHeight: 56,
  },
  shortcutSlot: {
    width: 82,
  },
  shortcutStart: {
    alignItems: 'flex-start',
  },
  shortcutEnd: {
    alignItems: 'flex-end',
  },
  swipeSlot: {
    flex: 1,
    maxWidth: 460,
    alignSelf: 'center',
  },
});
