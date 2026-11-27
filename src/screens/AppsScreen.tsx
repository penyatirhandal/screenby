import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type FlatListInstance,
  type TextInputInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Focusable } from '../gamepad/GamepadProvider';
import { useLauncherApps } from '../hooks/useLauncherApps';
import { NexusNative } from '../services/NexusNative';
import { useLauncherPalette } from '../theme/ThemeContext';
import { useTypography } from '../theme/TypographyContext';
import type { LauncherApp, PinnedGame } from '../types';
import { ActionMenu, type MenuOption } from '../components/ActionMenu';

interface AppsScreenProps {
  visible: boolean;
  pinned: PinnedGame[];
  onClose: () => void;
  onOpenSettings: () => void;
  onPin: (app: LauncherApp) => Promise<void>;
  onUnpin: (packageName: string) => Promise<void>;
  onLaunched: (packageName: string) => Promise<void>;
}

export function AppsScreen({
  visible,
  pinned,
  onClose,
  onOpenSettings,
  onPin,
  onUnpin,
  onLaunched,
}: AppsScreenProps): React.JSX.Element | null {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { apps, loading, launch, refresh } = useLauncherApps();
  const [query, setQuery] = useState('');
  const [menuApp, setMenuApp] = useState<LauncherApp | null>(null);
  const searchRef = React.useRef<TextInputInstance>(null);
  const listRef = React.useRef<FlatListInstance>(null);

  const pinnedPackages = useMemo(
    () => new Set(pinned.map(game => game.packageName)),
    [pinned],
  );

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

  const columns = Math.max(3, Math.min(7, Math.floor((width - 100) / 138)));

  if (!visible) {
    return null;
  }

  const openApp = async (app: LauncherApp) => {
    const opened = await launch(app.packageName);
    if (opened) {
      await onLaunched(app.packageName);
    } else {
      Alert.alert('Tidak dapat membuka', `${app.label} tidak dapat diluncurkan.`);
    }
  };

  const uninstall = (app: LauncherApp) => {
    Alert.alert(
      `Hapus ${app.label}?`,
      'Dialog uninstall dari Android akan muncul.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const started = await NexusNative.uninstallApp(app.packageName);
              if (started) {
                await onUnpin(app.packageName);
              }
            } catch {
              Alert.alert('Gagal', 'Uninstall tidak dapat dimulai.');
            }
          },
        },
      ],
    );
  };

  const menuOptions: MenuOption[] = menuApp
    ? [
        pinnedPackages.has(menuApp.packageName)
          ? {
              label: 'Lepas pin',
              icon: 'close',
              onPress: () => onUnpin(menuApp.packageName),
            }
          : {
              label: 'Pin ke Games',
              icon: 'pin',
              onPress: () => onPin(menuApp),
            },
        {
          label: 'Hapus',
          icon: 'trash',
          destructive: true,
          onPress: () => uninstall(menuApp),
        },
      ]
    : [];

  return (
    <View style={[StyleSheet.absoluteFill, styles.black]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(12, insets.top + 8),
            paddingHorizontal: Math.max(18, insets.left + 16),
            borderColor: palette.glassBorder,
          },
        ]}
      >
        <Focusable
          id="apps:back"
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
          APPS
        </Text>
        <View style={styles.headerSpacer} />
        <Focusable
          id="apps:search"
          onPress={() => searchRef.current?.focus()}
          ringRadius={20}
          accessibilityRole="button"
          accessibilityLabel="Fokus pencarian aplikasi"
        >
          <TextInput
            ref={searchRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Cari aplikasi..."
            placeholderTextColor={palette.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={[
              styles.search,
              {
                backgroundColor: palette.surface,
                borderColor: palette.glassBorder,
                color: palette.textPrimary,
                fontFamily: fonts.body,
                fontSize: scaled(13),
              },
            ]}
            accessibilityLabel="Cari aplikasi"
          />
        </Focusable>
        <Focusable
          id="apps:settings"
          onPress={onOpenSettings}
          accessibilityRole="button"
          accessibilityLabel="Buka Settings"
          hitSlop={8}
        >
          <Icon name="settings" size={scaled(22)} color={palette.textSecondary} />
        </Focusable>
      </View>

      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={item => item.packageName}
        numColumns={columns}
        initialNumToRender={16}
        onRefresh={refresh}
        refreshing={loading}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.grid,
          {
            paddingHorizontal: Math.max(18, insets.left + 16),
            paddingBottom: Math.max(18, insets.bottom + 12),
          },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text
              style={[
                styles.emptyText,
                {
                  color: palette.textMuted,
                  fontFamily: fonts.body,
                  fontSize: scaled(13),
                },
              ]}
            >
              {loading ? 'Memuat aplikasi...' : 'Tidak ada aplikasi yang cocok.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Focusable
            id={`app:${item.packageName}`}
            style={({ pressed }) => [
              styles.app,
              { borderColor: palette.glassBorder },
              pressed && styles.pressed,
            ]}
            onPress={() => openApp(item)}
            onLongPress={() => setMenuApp(item)}
            onFocus={() => {
              const index = filtered.findIndex(
                candidate => candidate.packageName === item.packageName,
              );
              if (index >= 0) {
                try {
                  listRef.current?.scrollToIndex({
                    index,
                    animated: true,
                    viewPosition: 0.5,
                  });
                } catch {
                  // The item may have been filtered out while focus was moving.
                }
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={`Buka ${item.label}`}
          >
            {item.icon ? (
              <Image
                source={{ uri: item.icon }}
                style={styles.icon}
                resizeMode="contain"
              />
            ) : (
              <View
                style={[
                  styles.iconFallback,
                  { backgroundColor: palette.surface },
                ]}
              >
                <Text
                  style={[
                    styles.fallbackText,
                    {
                      color: palette.primary,
                      fontFamily: fonts.bodyBold,
                      fontSize: scaled(20),
                    },
                  ]}
                >
                  {item.label.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text
              style={[
                styles.appLabel,
                {
                  color: palette.textPrimary,
                  fontFamily: fonts.body,
                  fontSize: scaled(11),
                },
              ]}
              numberOfLines={2}
            >
              {item.label}
            </Text>
            {pinnedPackages.has(item.packageName) ? (
              <View
                style={[
                  styles.pinBadge,
                  { backgroundColor: palette.primary },
                ]}
              >
                <Icon name="pin" size={scaled(10)} color={palette.background} />
              </View>
            ) : null}
          </Focusable>
        )}
      />

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(8, insets.bottom + 4),
            borderColor: palette.glassBorder,
          },
        ]}
      >
        <Text
          style={[
            styles.footerText,
            {
              color: palette.textMuted,
              fontFamily: fonts.body,
              fontSize: scaled(11),
            },
          ]}
        >
          Tekan tahan aplikasi untuk Pin ke Games atau Hapus.
        </Text>
      </View>

      <ActionMenu
        visible={menuApp !== null}
        title={menuApp?.label}
        options={menuOptions}
        onClose={() => setMenuApp(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  black: {
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    letterSpacing: 2,
  },
  headerSpacer: {
    flex: 1,
  },
  search: {
    width: 280,
    maxWidth: '34%',
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  grid: {
    paddingTop: 14,
    flexGrow: 1,
  },
  row: {
    gap: 12,
    marginBottom: 14,
  },
  app: {
    flex: 1,
    minHeight: 108,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: '#0B0B0D',
  },
  pressed: {
    opacity: 0.6,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  iconFallback: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {},
  appLabel: {
    textAlign: 'center',
    maxWidth: 120,
  },
  pinBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  emptyText: {},
  footer: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  footerText: {
    textAlign: 'center',
  },
});
