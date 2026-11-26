import React, {useEffect, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {NexusWidgets} from '../services/NexusWidgets';
import {DESKTOP_WIDGETS} from '../services/LauncherSettingsService';
import {colors} from '../theme/colors';
import {useLauncherPalette} from '../theme/ThemeContext';
import {useTypography} from '../theme/TypographyContext';
import type {BuiltinWidget, WidgetProvider} from '../types';
import {Icon, type IconName} from './Icon';

const BUILTIN_LABELS: Record<BuiltinWidget, string> = {
  clock: 'Jam',
  date: 'Tanggal',
  battery: 'Baterai',
  network: 'Jaringan',
};

const BUILTIN_ICONS: Record<BuiltinWidget, IconName> = {
  clock: 'schedule',
  date: 'calendar',
  battery: 'batteryFull',
  network: 'wifi',
};

interface WidgetPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectBuiltin: (widget: BuiltinWidget) => void;
  onSelectProvider: (provider: WidgetProvider) => void;
}

export function WidgetPickerSheet({
  visible,
  onClose,
  onSelectBuiltin,
  onSelectProvider,
}: WidgetPickerSheetProps): React.JSX.Element {
  const palette = useLauncherPalette();
  const {fonts, scaled} = useTypography();
  const {width: windowWidth} = useWindowDimensions();
  const [providers, setProviders] = useState<WidgetProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!visible) {
      setReady(false);
      return;
    }
    let active = true;
    const timer = setTimeout(() => setReady(true), 350);
    setLoading(true);
    setError(null);
    NexusWidgets.getWidgetProviders()
      .then((list: WidgetProvider[]) => {
        if (active) {
          setProviders(list);
        }
      })
      .catch(() => {
        if (active) {
          setProviders([]);
          setError('Daftar widget aplikasi tidak dapat dibaca.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [visible]);

  if (!visible) {
    return <></>;
  }

  const choose = <T,>(action: () => T) => {
    if (!ready) {
      return;
    }
    onClose();
    action();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} disabled={!ready}>
        <Pressable
          style={[
            styles.panel,
            {
              width: Math.min(760, windowWidth - 40),
              backgroundColor: palette.glassStrong,
              borderColor: palette.glassBorder,
            },
          ]}
          accessibilityRole="menu"
        >
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                {
                  color: palette.textPrimary,
                  fontFamily: fonts.displayBold,
                  fontSize: scaled(18),
                },
              ]}
            >
              TAMBAH WIDGET
            </Text>
            <Pressable
              onPress={onClose}
              disabled={!ready}
              accessibilityRole="button"
              accessibilityLabel="Tutup pemilih widget"
              hitSlop={8}
            >
              <Icon name="close" size={scaled(20)} color={palette.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: palette.primary,
                  fontFamily: fonts.bodyBold,
                  fontSize: scaled(11),
                },
              ]}
            >
              WIDGET NEXUS
            </Text>
            <View style={styles.grid}>
              {DESKTOP_WIDGETS.map(widget => (
                <Pressable
                  key={widget}
                  onPress={() => choose(() => onSelectBuiltin(widget))}
                  disabled={!ready}
                  accessibilityRole="button"
                  accessibilityLabel={`Tambah widget ${BUILTIN_LABELS[widget]}`}
                  style={({pressed}) => [
                    styles.option,
                    {borderColor: palette.glassBorder},
                    pressed && styles.pressed,
                  ]}
                >
                  <Icon
                    name={BUILTIN_ICONS[widget]}
                    size={scaled(20)}
                    color={palette.primary}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: palette.textPrimary,
                        fontFamily: fonts.body,
                        fontSize: scaled(13),
                      },
                    ]}
                  >
                    {BUILTIN_LABELS[widget]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text
              style={[
                styles.sectionTitle,
                {
                  color: palette.primary,
                  fontFamily: fonts.bodyBold,
                  fontSize: scaled(11),
                },
              ]}
            >
              WIDGET APLIKASI
            </Text>
            {loading ? (
              <Text
                style={[
                  styles.status,
                  {
                    color: palette.textMuted,
                    fontFamily: fonts.body,
                    fontSize: scaled(12),
                  },
                ]}
              >
                Mencari widget...
              </Text>
            ) : null}
            {error ? (
              <Text
                style={[
                  styles.status,
                  {
                    color: palette.danger,
                    fontFamily: fonts.body,
                    fontSize: scaled(12),
                  },
                ]}
              >
                {error}
              </Text>
            ) : null}
            {!loading && !error && providers.length === 0 ? (
              <Text
                style={[
                  styles.status,
                  {
                    color: palette.textMuted,
                    fontFamily: fonts.body,
                    fontSize: scaled(12),
                  },
                ]}
              >
                Tidak ada widget dari aplikasi lain.
              </Text>
            ) : null}
            <View style={styles.grid}>
              {providers.map(provider => (
                <Pressable
                  key={provider.provider}
                  onPress={() => choose(() => onSelectProvider(provider))}
                  disabled={!ready}
                  accessibilityRole="button"
                  accessibilityLabel={`Tambah widget ${provider.label}`}
                  style={({pressed}) => [
                    styles.option,
                    {borderColor: palette.glassBorder},
                    pressed && styles.pressed,
                  ]}
                >
                  <Icon
                    name="apps"
                    size={scaled(20)}
                    color={palette.primary}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: palette.textPrimary,
                        fontFamily: fonts.body,
                        fontSize: scaled(13),
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {provider.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scrimBottom,
    padding: 20,
  },
  panel: {
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    letterSpacing: 1.4,
  },
  list: {
    flexGrow: 0,
  },
  sectionTitle: {
    letterSpacing: 1.2,
    marginTop: 6,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  option: {
    minWidth: 140,
    maxWidth: 220,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  optionLabel: {
    flexShrink: 1,
  },
  status: {
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.65,
  },
});
