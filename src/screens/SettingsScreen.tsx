import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Icon } from '../components/Icon';
import { WallpaperSheet } from '../components/WallpaperSheet';
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
  LauncherSettings,
  Wallpaper,
} from '../types';

interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
  settings: LauncherSettings;
  onSetFont: (font: FontChoice) => Promise<void>;
  onSetFontSize: (size: FontSizeChoice) => Promise<void>;
  wallpaper: Wallpaper | null;
  onPickWallpaper: () => Promise<Wallpaper | null>;
  onSaveCrop: (crop: CropState) => Promise<void>;
  onRemoveWallpaper: () => Promise<void>;
  dynamicColorAvailable: boolean;
}

export function SettingsScreen({
  visible,
  onClose,
  settings,
  onSetFont,
  onSetFontSize,
  wallpaper,
  onPickWallpaper,
  onSaveCrop,
  onRemoveWallpaper,
  dynamicColorAvailable,
}: SettingsScreenProps): React.JSX.Element | null {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [applying, setApplying] = useState(false);

  if (!visible) {
    return null;
  }

  const applyWallpaper = async () => {
    if (!wallpaper) {
      setSheetVisible(true);
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
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Kembali ke Home"
          hitSlop={8}
        >
          <Icon name="back" size={scaled(24)} color={palette.textPrimary} />
        </Pressable>
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

      <ScrollView contentContainerStyle={styles.content}>
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
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { borderColor: palette.glassBorder },
                pressed && styles.pressed,
              ]}
              onPress={() => setSheetVisible(true)}
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
            </Pressable>
            <Pressable
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
            </Pressable>
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
              label={FONT_OPTIONS[choice].label}
              selected={settings.font === choice}
              onPress={() => onSetFont(choice)}
            />
          ))}
        </Section>

        <Section title="UKURAN FONT" icon="textFields">
          {(Object.keys(FONT_SIZE_OPTIONS) as FontSizeChoice[]).map(size => (
            <OptionRow
              key={size}
              label={FONT_SIZE_OPTIONS[size].label}
              selected={settings.fontSize === size}
              onPress={() => onSetFontSize(size)}
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
        visible={sheetVisible}
        wallpaper={wallpaper}
        onClose={() => setSheetVisible(false)}
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
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
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
      {selected ? (
        <Icon name="check" size={scaled(18)} color={palette.primary} />
      ) : null}
    </Pressable>
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
  optionText: {
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
