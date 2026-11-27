import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
  type ViewInstance,
} from 'react-native';
import { Icon, type IconName } from '../components/Icon';
import { Focusable } from '../gamepad/GamepadProvider';
import { useLauncherPalette } from '../theme/ThemeContext';
import { withAlpha } from '../theme/colorUtils';
import {
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
} from '../theme/typography';
import { useTypography } from '../theme/TypographyContext';
import { NexusNative } from '../services/NexusNative';
import { wallpaperUri } from '../services/WallpaperService';
import type {
  FontChoice,
  FontSizeChoice,
  GameIconSize,
  LauncherSettings,
  RotationLockMode,
  Wallpaper,
  WallpaperSet,
  WallpaperSlot,
} from '../types';

const GAME_ICON_SIZE_OPTIONS: Record<
  GameIconSize,
  {label: string; detail: string}
> = {
  small: {label: 'Kecil', detail: '2 baris kartu game'},
  normal: {label: 'Normal', detail: '1 baris · 50% dari ukuran Besar'},
  large: {label: 'Besar', detail: '1 baris · ukuran saat ini'},
};

const ROTATION_OPTIONS: Record<
  RotationLockMode,
  {label: string; detail: string}
> = {
  off: {label: 'Mati', detail: 'Rotasi mengikuti pengaturan Android'},
  landscape: {label: 'Landscape', detail: 'Semua aplikasi terkunci landscape'},
  reverseLandscape: {
    label: 'Landscape terbalik',
    detail: 'Semua aplikasi terkunci landscape terbalik',
  },
};

interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
  settings: LauncherSettings;
  onSetFont: (font: FontChoice) => Promise<void>;
  onSetFontSize: (size: FontSizeChoice) => Promise<void>;
  onSetGameIconSize: (size: GameIconSize) => Promise<void>;
  onSetRotationLock: (mode: RotationLockMode) => Promise<void>;
  wallpapers: WallpaperSet;
  onOpenWallpaper: (slot: WallpaperSlot) => void;
  onRemoveWallpaper: (slot: WallpaperSlot) => Promise<void>;
  dynamicColorAvailable: boolean;
}

export function SettingsScreen({
  visible,
  onClose,
  settings,
  onSetFont,
  onSetFontSize,
  onSetGameIconSize,
  onSetRotationLock,
  wallpapers,
  onOpenWallpaper,
  onRemoveWallpaper,
  dynamicColorAvailable,
}: SettingsScreenProps): React.JSX.Element | null {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  const [applying, setApplying] = useState(false);
  const scrollRef = React.useRef<ScrollViewInstance>(null);
  const scrollOffset = React.useRef(0);
  const optionRefs = React.useRef(new Map<string, ViewInstance>());

  const setOptionRef =
    (id: string) => (instance: ViewInstance | null) => {
      if (instance) {
        optionRefs.current.set(id, instance);
      } else {
        optionRefs.current.delete(id);
      }
    };

  const revealOption = (id: string) => {
    const view = optionRefs.current.get(id);
    const container = scrollRef.current;
    if (!view || !container) {
      return;
    }
    view.measure((_x, _y, _width, height, _pageX, pageY) => {
      container.measure(
        (_cx, _cy, _cw, containerHeight, _containerPageX, containerPageY) => {
          const top = containerPageY + 16;
          const bottom = containerPageY + containerHeight - 16;
          let nextOffset = scrollOffset.current;
          if (pageY < top) {
            nextOffset -= top - pageY;
          } else if (pageY + height > bottom) {
            nextOffset += pageY + height - bottom;
          }
          container.scrollTo({y: Math.max(0, nextOffset), animated: true});
        },
      );
    });
  };

  if (!visible) {
    return null;
  }

  const applyWallpaper = async () => {
    if (!wallpapers.home) {
      onOpenWallpaper('home');
      return;
    }
    setApplying(true);
    try {
      const applied = await NexusNative.setSystemWallpaper(wallpapers.home.path);
      Alert.alert(
        applied ? 'Warna diperbarui' : 'Wallpaper belum diterapkan',
        applied
          ? 'Dynamic Color launcher akan mengikuti wallpaper sistem.'
          : 'Wallpaper tidak dapat diterapkan sebagai wallpaper sistem.',
      );
    } catch (error) {
      Alert.alert(
        'Gagal',
        error instanceof Error ? error.message : 'Silakan coba lagi.',
      );
    } finally {
      setApplying(false);
    }
  };

  const confirmRemoveWallpaper = (slot: WallpaperSlot) => {
    const label = slot === 'home' ? 'Home' : 'Lock Screen';
    Alert.alert(
      'Hapus wallpaper?',
      `Wallpaper ${label} akan dihapus dan latar bawaan Nexus digunakan kembali.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            onRemoveWallpaper(slot).catch(error => {
              Alert.alert(
                'Gagal',
                error instanceof Error
                  ? error.message
                  : 'Wallpaper tidak dapat dihapus.',
              );
            });
          },
        },
      ],
    );
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.black]}>
      <View style={styles.header}>
        <Focusable
          id="settings:back"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Kembali ke Home"
          hitSlop={8}
        >
          <Icon name="back" size={scaled(24)} color={palette.textPrimary} />
        </Focusable>
        <Text
          style={[
            styles.title,
            {
              color: palette.textPrimary,
              fontFamily: fonts.displayBold,
              fontSize: scaled(24),
            },
          ]}
        >
          SETTINGS
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={event => {
          scrollOffset.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
      >
        <Section title="TEMA" icon="palette">
          <Text
            style={[
              styles.description,
              {
                color: palette.textSecondary,
                fontFamily: fonts.body,
                fontSize: scaled(13),
              },
            ]}
          >
            Aksen launcher diambil otomatis dari warna wallpaper sistem Android.
          </Text>
          <View style={styles.previewRow}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: palette.primary },
              ]}
            />
            <View
              style={[
                styles.swatch,
                { backgroundColor: palette.tertiary },
              ]}
            />
            <Text
              style={[
                styles.status,
                {
                  color: palette.textMuted,
                  fontFamily: fonts.body,
                  fontSize: scaled(11),
                },
              ]}
            >
              {dynamicColorAvailable
                ? 'Dynamic Color aktif'
                : 'Dynamic Color tidak tersedia; memakai palet standar.'}
            </Text>
          </View>
          <View style={styles.buttonRow}>
            <Focusable
              id="settings:applyWallpaper"
              style={({ pressed }) => [
                styles.button,
                { borderColor: palette.primaryBorder },
                pressed && styles.pressed,
              ]}
              onPress={() => applyWallpaper()}
              disabled={applying}
              accessibilityRole="button"
              accessibilityLabel="Terapkan wallpaper Home ke sistem"
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: palette.primary,
                    fontFamily: fonts.bodySemiBold,
                    fontSize: scaled(12),
                  },
                ]}
              >
                {applying ? 'Menerapkan...' : 'Pakai wallpaper Home ke sistem'}
              </Text>
            </Focusable>
          </View>
        </Section>

        <Section title="WALLPAPER" icon="wallpaper">
          <Text
            style={[
              styles.description,
              {
                color: palette.textSecondary,
                fontFamily: fonts.body,
                fontSize: scaled(13),
              },
            ]}
          >
            Home dan Lock Screen memakai wallpaper yang terpisah. Atur crop
            masing-masing tanpa mengubah layar lainnya.
          </Text>
          <WallpaperRow
            slot="home"
            label="HOME"
            wallpaper={wallpapers.home}
            onOpen={onOpenWallpaper}
            onRemove={confirmRemoveWallpaper}
          />
          <WallpaperRow
            slot="lock"
            label="LOCK SCREEN"
            wallpaper={wallpapers.lock}
            onOpen={onOpenWallpaper}
            onRemove={confirmRemoveWallpaper}
          />
        </Section>

        <Section title="FONT" icon="font">
          {(Object.keys(FONT_OPTIONS) as FontChoice[]).map(choice => (
            <OptionRow
              key={choice}
              id={`settings:font:${choice}`}
              label={FONT_OPTIONS[choice].label}
              selected={settings.font === choice}
              onPress={() => onSetFont(choice)}
              viewRef={setOptionRef(`settings:font:${choice}`)}
              onFocus={() => revealOption(`settings:font:${choice}`)}
            />
          ))}
        </Section>

        <Section title="UKURAN FONT" icon="textFields">
          {(Object.keys(FONT_SIZE_OPTIONS) as FontSizeChoice[]).map(size => (
            <OptionRow
              key={size}
              id={`settings:fontSize:${size}`}
              label={FONT_SIZE_OPTIONS[size].label}
              selected={settings.fontSize === size}
              onPress={() => onSetFontSize(size)}
              viewRef={setOptionRef(`settings:fontSize:${size}`)}
              onFocus={() => revealOption(`settings:fontSize:${size}`)}
            />
          ))}
        </Section>

        <Section title="UKURAN IKON GAMES" icon="grid">
          {(Object.keys(GAME_ICON_SIZE_OPTIONS) as GameIconSize[]).map(size => (
            <OptionRow
              key={size}
              id={`settings:gameIconSize:${size}`}
              label={GAME_ICON_SIZE_OPTIONS[size].label}
              detail={GAME_ICON_SIZE_OPTIONS[size].detail}
              selected={settings.gameIconSize === size}
              onPress={() => onSetGameIconSize(size)}
              viewRef={setOptionRef(`settings:gameIconSize:${size}`)}
              onFocus={() => revealOption(`settings:gameIconSize:${size}`)}
            />
          ))}
        </Section>

        <Section title="ROTASI LAYAR" icon="tune">
          <Text
            style={[
              styles.description,
              {
                color: palette.textSecondary,
                fontFamily: fonts.body,
                fontSize: scaled(13),
              },
            ]}
          >
            Kunci orientasi seluruh aplikasi ke landscape atau landscape
            terbalik. Android akan meminta izin Modify system settings saat
            fitur diaktifkan, dan mengembalikan rotasi semula saat dimatikan.
          </Text>
          {(Object.keys(ROTATION_OPTIONS) as RotationLockMode[]).map(mode => (
            <OptionRow
              key={mode}
              id={`settings:rotation:${mode}`}
              label={ROTATION_OPTIONS[mode].label}
              detail={ROTATION_OPTIONS[mode].detail}
              selected={settings.rotationLock === mode}
              onPress={() => onSetRotationLock(mode)}
              viewRef={setOptionRef(`settings:rotation:${mode}`)}
              onFocus={() => revealOption(`settings:rotation:${mode}`)}
            />
          ))}
        </Section>

        <Section title="WIDGET DESKTOP" icon="grid">
          <Text
            style={[
              styles.description,
              {
                color: palette.textSecondary,
                fontFamily: fonts.body,
                fontSize: scaled(13),
              },
            ]}
          >
            Widget dikelola langsung dari tab DESKTOP di Home. Tekan lama area
            kosong untuk menambah widget, lalu tekan lama widget untuk
            memindahkan, mengubah ukuran, atau menghapusnya. Widget Musik
            memerlukan izin Notification access dari Android untuk membaca lagu
            yang sedang diputar.
          </Text>
        </Section>

        <Section title="PREVIEW" icon="autoAwesome">
          <Text
            style={[
              styles.previewTitle,
              {
                color: palette.primary,
                fontFamily: fonts.displayBold,
                fontSize: scaled(24),
              },
            ]}
          >
            Nexus Launcher
          </Text>
          <Text
            style={[
              styles.previewBody,
              {
                color: palette.textSecondary,
                fontFamily: fonts.body,
                fontSize: scaled(14),
              },
            ]}
          >
            Contoh teks untuk melihat font dan ukuran yang dipilih.
          </Text>
        </Section>
      </ScrollView>
    </View>
  );
}

function WallpaperRow({
  slot,
  label,
  wallpaper,
  onOpen,
  onRemove,
}: {
  slot: WallpaperSlot;
  label: string;
  wallpaper: Wallpaper | null;
  onOpen: (slot: WallpaperSlot) => void;
  onRemove: (slot: WallpaperSlot) => void;
}): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();

  return (
    <View
      style={[
        styles.wallpaperRow,
        { backgroundColor: withAlpha(palette.surface, 0.42), borderColor: palette.glassBorder },
      ]}
    >
      <View
        style={[
          styles.wallpaperThumb,
          {
            backgroundColor: withAlpha(palette.primary, 0.12),
            borderColor: palette.glassBorder,
          },
        ]}
      >
        {wallpaper ? (
          <Image
            source={{ uri: wallpaperUri(wallpaper.path) }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityLabel={`Pratinjau wallpaper ${label}`}
          />
        ) : (
          <Icon name="image" size={scaled(20)} color={palette.textMuted} />
        )}
      </View>
      <View style={styles.wallpaperInfo}>
        <Text
          style={[
            styles.wallpaperLabel,
            {
              color: palette.textPrimary,
              fontFamily: fonts.bodyBold,
              fontSize: scaled(12),
            },
          ]}
        >
          {label}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            styles.wallpaperStatus,
            {
              color: wallpaper ? palette.textSecondary : palette.textMuted,
              fontFamily: fonts.body,
              fontSize: scaled(11),
            },
          ]}
        >
          {wallpaper ? 'Wallpaper aktif' : 'Belum dipilih'}
        </Text>
      </View>
      <View style={styles.wallpaperActions}>
        <Focusable
          id={`settings:wallpaper:${slot}:open`}
          onPress={() => onOpen(slot)}
          accessibilityRole="button"
          accessibilityLabel={`Atur wallpaper ${label}`}
          style={({ pressed }) => [
            styles.button,
            { borderColor: palette.primaryBorder },
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              {
                color: palette.primary,
                fontFamily: fonts.bodySemiBold,
                fontSize: scaled(12),
              },
            ]}
          >
            {wallpaper ? 'Ganti' : 'Pilih'}
          </Text>
        </Focusable>
        {wallpaper ? (
          <Focusable
            id={`settings:wallpaper:${slot}:remove`}
            onPress={() => onRemove(slot)}
            accessibilityRole="button"
            accessibilityLabel={`Hapus wallpaper ${label}`}
            hitSlop={6}
            style={({ pressed }) => [
              styles.removeWallpaper,
              pressed && styles.pressed,
            ]}
          >
            <Icon name="trash" size={scaled(16)} color={palette.danger} />
          </Focusable>
        ) : null}
      </View>
    </View>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: IconName;
  children: React.ReactNode;
}): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: palette.glass,
          borderColor: palette.glassBorder,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Icon name={icon} size={scaled(16)} color={palette.primary} />
        <Text
          style={[
            styles.sectionTitle,
            {
              color: palette.textPrimary,
              fontFamily: fonts.bodyBold,
              fontSize: scaled(12),
            },
          ]}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function OptionRow({
  id,
  label,
  detail,
  selected,
  onPress,
  viewRef,
  onFocus,
}: {
  id: string;
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  viewRef?: React.Ref<ViewInstance>;
  onFocus?: () => void;
}): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  return (
    <Focusable
      id={id}
      viewRef={viewRef}
      onPress={onPress}
      onFocus={onFocus}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <View style={styles.optionLabelGroup}>
        <Text
          style={[
            styles.optionText,
            {
              color: selected ? palette.primary : palette.textSecondary,
              fontFamily: fonts.body,
              fontSize: scaled(14),
            },
          ]}
        >
          {label}
        </Text>
        {detail ? (
          <Text
            style={[
              styles.optionDetail,
              {
                color: palette.textMuted,
                fontFamily: fonts.body,
                fontSize: scaled(10),
              },
            ]}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      {selected ? (
        <Icon name="check" size={scaled(18)} color={palette.primary} />
      ) : null}
    </Focusable>
  );
}

const styles = StyleSheet.create({
  black: {
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  title: {
    letterSpacing: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 14,
  },
  section: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    letterSpacing: 1.6,
  },
  description: {
    lineHeight: 20,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  status: {
    flexShrink: 1,
    marginLeft: 6,
  },
  wallpaperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  wallpaperThumb: {
    width: 92,
    height: 52,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallpaperInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  wallpaperLabel: {
    letterSpacing: 1,
  },
  wallpaperStatus: {
    flexShrink: 1,
  },
  wallpaperActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeWallpaper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  buttonText: {
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  optionLabelGroup: {
    flexShrink: 1,
    gap: 2,
  },
  optionText: {
    flexShrink: 1,
  },
  optionDetail: {
    flexShrink: 1,
  },
  previewTitle: {
    marginBottom: 2,
  },
  previewBody: {},
  pressed: {
    opacity: 0.65,
  },
});
