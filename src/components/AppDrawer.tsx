import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLauncherApps } from '../hooks/useLauncherApps';
import { colors } from '../theme/colors';
import { useLauncherPalette } from '../theme/ThemeContext';
import { fonts } from '../theme/typography';
import type { LauncherApp } from '../types';
import { Icon } from './Icon';

interface AppDrawerProps {
  visible: boolean;
  onClose: () => void;
  onOpenTheme: () => void;
}

function AppIcon({ app }: { app: LauncherApp }): React.JSX.Element {
  const palette = useLauncherPalette();

  if (app.icon) {
    return (
      <Image
        source={{ uri: app.icon }}
        style={styles.appIconImage}
        resizeMode="contain"
        accessibilityLabel={`Ikon ${app.label}`}
      />
    );
  }

  return (
    <View
      style={[
        styles.appIconFallback,
        { backgroundColor: palette.primarySoft },
      ]}
    >
      <Text style={[styles.appIconFallbackText, { color: palette.primary }]}>
        {app.label.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

export function AppDrawer({
  visible,
  onClose,
  onOpenTheme,
}: AppDrawerProps): React.JSX.Element | null {
  const palette = useLauncherPalette();
  const { width, height } = useWindowDimensions();
  const { apps, loading, launch } = useLauncherApps();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return apps;
    }
    return apps.filter(
      app =>
        app.label.toLowerCase().includes(needle) ||
        app.packageName.toLowerCase().includes(needle),
    );
  }, [apps, query]);

  const columns = Math.max(
    2,
    Math.min(6, Math.floor((width - 116) / 190)),
  );

  const handleOpen = async (app: LauncherApp) => {
    const opened = await launch(app.packageName);
    if (!opened) {
      Alert.alert('Tidak dapat membuka', `${app.label} tidak dapat diluncurkan.`);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { backgroundColor: palette.glassStrong },
      ]}
    >
      <View style={styles.shell}>
        <View
          style={[
            styles.rail,
            {
              backgroundColor: palette.glass,
              borderColor: palette.glassBorder,
            },
          ]}
        >
          <View style={[styles.railButton, styles.railButtonActive]}>
            <Icon name="gallery" size={22} color={palette.primary} />
            <Text style={[styles.railLabel, { color: palette.primary }]}>
              Pustaka
            </Text>
          </View>

          <TouchableOpacity
            style={styles.railButton}
            onPress={onOpenTheme}
            accessibilityRole="button"
            accessibilityLabel="Buka pengaturan tema"
          >
            <Icon name="wallpaper" size={22} color={palette.textSecondary} />
            <Text style={[styles.railLabel, { color: palette.textSecondary }]}>
              Tema
            </Text>
          </TouchableOpacity>

          <View style={styles.railSpacer} />

          <TouchableOpacity
            style={styles.railButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Tutup pustaka aplikasi"
          >
            <Icon name="close" size={22} color={palette.textSecondary} />
            <Text style={[styles.railLabel, { color: palette.textSecondary }]}>
              Tutup
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.library}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: palette.textPrimary }]}>
                PUSTAKA APLIKASI
              </Text>
              <Text style={[styles.subtitle, { color: palette.textMuted }]}>
                {loading
                  ? 'Memuat aplikasi...'
                  : `${filtered.length} aplikasi tersedia`}
              </Text>
            </View>

            <View
              style={[
                styles.search,
                {
                  backgroundColor: palette.glass,
                  borderColor: palette.glassBorder,
                },
              ]}
            >
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Cari aplikasi..."
                placeholderTextColor={palette.textMuted}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                style={[styles.searchInput, { color: palette.textPrimary }]}
                accessibilityLabel="Cari aplikasi"
              />
              {query.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Hapus pencarian"
                >
                  <Icon name="close" size={16} color={palette.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={item => item.packageName}
            numColumns={columns}
            initialNumToRender={12}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: palette.textMuted }]}>
                  {loading ? 'Memuat...' : 'Tidak ada aplikasi yang cocok.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.card,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.glassBorder,
                  },
                ]}
                onPress={() => handleOpen(item)}
                accessibilityRole="button"
                accessibilityLabel={`Buka ${item.label}`}
              >
                <View
                  style={[
                    styles.cardBanner,
                    { backgroundColor: palette.primarySoft },
                  ]}
                >
                  <AppIcon app={item} />
                </View>
                <View style={styles.cardFooter}>
                  <Text
                    style={[styles.cardTitle, { color: palette.textPrimary }]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[styles.cardMeta, { color: palette.textMuted }]}
                    numberOfLines={1}
                  >
                    {item.packageName}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      <View style={[styles.footer, { height: Math.max(8, height * 0.01) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 10,
  },
  shell: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
  },
  rail: {
    width: 92,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
  },
  railButton: {
    width: '100%',
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 14,
  },
  railButtonActive: {
    backgroundColor: colors.glassHighlight,
  },
  railLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10.5,
  },
  railSpacer: {
    flex: 1,
  },
  library: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    paddingVertical: 12,
  },
  headerText: {
    flexShrink: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    letterSpacing: 1.4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
  search: {
    width: 300,
    maxWidth: '38%',
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  grid: {
    paddingBottom: 18,
  },
  gridRow: {
    gap: 14,
    marginBottom: 14,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardBanner: {
    aspectRatio: 16 / 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  appIconFallback: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconFallbackText: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
  },
  cardFooter: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 2,
  },
  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
  },
  cardMeta: {
    fontFamily: fonts.body,
    fontSize: 10,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  footer: {},
});
