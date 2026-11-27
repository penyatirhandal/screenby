import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
  type ViewInstance,
} from 'react-native';
import { Icon } from '../components/Icon';
import { WallpaperSheet } from '../components/WallpaperSheet';
import { Focusable } from '../gamepad/GamepadProvider';
import { useLauncherPalette } from '../theme/ThemeContext';
import {
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
} from '../theme/typography';
import { useTypography } from '../theme/TypographyContext';
import { NexusNative } from '../services/NexusNative';
import { wallpaperUri } from '../services/WallpaperService';
import type {
  CropState,
  FontChoice,
  FontSizeChoice,
  GameIconSize,
  LauncherSettings,
  Wallpaper,
} from '../types';

const GAME_ICON_SIZE_OPTIONS: Record<
  GameIconSize,
  {label: string; detail: string}
> = {
  small: {label: 'Kecil', detail: '2 baris kartu game'},
  normal: {label: 'Normal', detail: '1 baris · 50% dari ukuran Besar'},
  large: {label: 'Besar', detail: '1 baris · ukuran saat ini'},
};

interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
  settings: LauncherSettings;
  onSetFont: (font: FontChoice) => Promise<void>;
  onSetFontSize: (size: FontSizeChoice) => Promise<void>;
  onSetGameIconSize: (size: GameIconSize) => Promise<void>;
  wallpaper: Wallpaper | null;
  onPickWallpaper: () => Promise<Wallpaper | null>;
  onSaveCrop: (crop: CropState) => Promise<void>;
  onRemoveWallpaper: () => Promise<void>;
  dynamicColorAvailable: boolean;
  wallpaperSheetVisible: boolean;
  onWallpaperSheetVisibilityChange: (visible: boolean) => void;
}

export function SettingsScreen({
  visible,
  onClose,
  settings,
  onSetFont,
  onSetFontSize,
  onSetGameIconSize,
  wallpaper,
  onPickWallpaper,
  onSaveCrop,
  onRemoveWallpaper,
  dynamicColorAvailable,
  wallpaperSheetVisible,
  onWallpaperSheetVisibilityChange,
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
    if (!wallpaper) {
      onWallpaperSheetVisibilityChange(true);
      return;
    }
    setApplying(true);
    try {
      const applied = await NexusNative.setSystemWallpaper(wallpaper.path);
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
              id="settings:pickWallpaper"
              style={({ pressed }) => [
                styles.button,
                { borderColor: palette.glassBorder },
                pressed && styles.pressed,
              ]}
              onPress={() => onWallpaperSheetVisibilityChange(true)}
              accessibilityRole="button"
              accessibilityLabel="Pilih wallpaper"
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: palette.textPrimary,
                    fontFamily: fonts.body,
                    fontSize: scaled(12),
                  },
                ]}
              >
                Pilih wallpaper
              </Text>
            </Focusable>
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
              accessibilityLabel="Terapkan wallpaper ke sistem"
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
                {applying ? 'Menerapkan...' : 'Pakai sebagai wallpaper sistem'}
              </Text>
            </Focusable>
          </View>
          {wallpaper ? (
            <Text
              style={[
                styles.status,
                {
                  color: palette.textMuted,
                  fontFamily: fonts.body,
                  fontSize: scaled(11),
                },
              ]}
              numberOfLines={1}
            >
              {wallpaperUri(wallpaper.path)}
            </Text>
          ) : null}
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

      <WallpaperSheet
        visible={wallpaperSheetVisible}
        wallpaper={wallpaper}
        onClose={() => onWallpaperSheetVisibilityChange(false)}
        onPick={onPickWallpaper}
        onSave={onSaveCrop}
        onRemove={onRemoveWallpaper}
      />
    </View>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: 'palette' | 'font' | 'textFields' | 'autoAwesome' | 'grid';
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
