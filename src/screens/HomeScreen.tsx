import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
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
import { WallpaperBackdrop } from '../components/WallpaperBackdrop';
import { useBattery } from '../hooks/useBattery';
import { useClock, type ClockInfo } from '../hooks/useClock';
import { useNetwork } from '../hooks/useNetwork';
import { wallpaperUri } from '../services/WallpaperService';
import { withAlpha } from '../theme/colorUtils';
import { useLauncherPalette } from '../theme/ThemeContext';
import { useTypography } from '../theme/TypographyContext';
import type {
  BatteryState,
  DesktopWidget,
  HomeTab,
  NetworkState,
  PinnedGame,
  Wallpaper,
} from '../types';
import { computeCoverLayout } from '../utils/smartCrop';

interface HomeScreenProps {
  games: PinnedGame[];
  tab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
  widgets: DesktopWidget[];
  wallpaper: Wallpaper | null;
  onOpenApps: () => void;
  onOpenSettings: () => void;
  onPlay: (game: PinnedGame) => void;
  onLongPressGame: (game: PinnedGame) => void;
}

const TABS: { key: HomeTab; label: string }[] = [
  { key: 'desktop', label: 'DESKTOP' },
  { key: 'games', label: 'GAMES' },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function artworkSource(game: PinnedGame) {
  if (game.customIconPath) {
    return { uri: wallpaperUri(game.customIconPath) };
  }
  if (game.icon) {
    return { uri: game.icon };
  }
  return null;
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

function displayName(game: PinnedGame): string {
  return game.customLabel || game.label || game.packageName;
}

function metadataLine(game: PinnedGame): string {
  return [
    game.releaseYear ? `Rilis ${game.releaseYear}` : null,
    game.genre,
    game.developer ? `Dev ${game.developer}` : null,
    game.publisher ? `Pub ${game.publisher}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');
}

export function HomeScreen({
  games,
  tab,
  onTabChange,
  widgets,
  wallpaper,
  onOpenApps,
  onOpenSettings,
  onPlay,
  onLongPressGame,
}: HomeScreenProps): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const clock = useClock();
  const battery = useBattery();
  const network = useNetwork();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [wallpaperFailed, setWallpaperFailed] = useState(false);

  const visibleGames = useMemo(
    () => [...games].sort((a, b) => b.pinnedAt - a.pinnedAt),
    [games],
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
    setWallpaperFailed(false);
  }, [wallpaper?.path]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [tab]);

  useEffect(() => {
    if (selectedIndex >= visibleGames.length) {
      setSelectedIndex(0);
    }
  }, [selectedIndex, visibleGames.length]);

  const selected = visibleGames[selectedIndex] ?? null;
  const compact = height < 400;
  const heroSize = clamp(Math.min(height * 0.52, width * 0.3), 150, 560);
  const iconSize = clamp(height * 0.1, 58, 96);
  const connection = presentNetwork(network);
  const batteryLevel = battery?.level ?? -1;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.background }]}>
      <WallpaperBackdrop
        wallpaper={wallpaper}
        layout={wallpaperLayout}
        failed={wallpaperFailed}
        onError={() => setWallpaperFailed(true)}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          withAlpha(palette.background, 0.74),
          withAlpha(palette.background, 0.22),
          withAlpha(palette.background, 0.88),
        ]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: Math.max(10, insets.top + 6),
            paddingBottom: Math.max(10, insets.bottom + 6),
            paddingHorizontal: Math.max(18, insets.left + 16),
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.controllers}>
            <ControllerKey label="L1" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabs}
            >
              {TABS.map(item => {
                const active = tab === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => onTabChange(item.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Tab ${item.label}`}
                    style={({ pressed }) => [
                      styles.tab,
                      {
                        backgroundColor: active
                          ? withAlpha(palette.primary, 0.22)
                          : withAlpha('#FFFFFF', 0.06),
                        borderColor: active
                          ? palette.primary
                          : palette.glassBorder,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color: active
                            ? palette.primary
                            : palette.textMuted,
                          fontFamily: fonts.bodyBold,
                          fontSize: scaled(12),
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <ControllerKey label="R1" />
          </View>

          <View style={styles.statusGroup}>
            <StatusChip
              icon={connection.icon}
              label={connection.label}
              muted={!network?.connected}
            />
            <StatusChip
              icon={batteryIcon(batteryLevel, battery?.charging ?? false)}
              label={batteryLevel >= 0 ? `${batteryLevel}%` : '--%'}
              muted={false}
            />
            <Text
              style={[
                styles.clock,
                {
                  color: palette.textPrimary,
                  fontFamily: fonts.bodyBold,
                  fontSize: scaled(compact ? 18 : 22),
                },
              ]}
              accessibilityLabel={`Jam ${clock.time}`}
            >
              {clock.time}
            </Text>
          </View>
        </View>

        {tab === 'desktop' ? (
          <DesktopDashboard
            widgets={widgets}
            clock={clock}
            battery={battery}
            network={network}
            onOpenSettings={onOpenSettings}
          />
        ) : selected ? (
          <View style={styles.gamesArea}>
            <Pressable
              onPress={() => onPlay(selected)}
              onLongPress={() => onLongPressGame(selected)}
              accessibilityRole="button"
              accessibilityLabel={`Mainkan ${displayName(selected)}`}
              style={({ pressed }) => [
                styles.hero,
                {
                  width: heroSize,
                  height: heroSize,
                  borderColor: palette.primary,
                  backgroundColor: withAlpha(palette.surface, 0.75),
                },
                pressed && styles.pressed,
              ]}
            >
              <Artwork game={selected} large />
              <LinearGradient
                pointerEvents="none"
                colors={[
                  withAlpha(palette.background, 0),
                  withAlpha(palette.background, 0.4),
                  withAlpha(palette.background, 0.94),
                ]}
                locations={[0.32, 0.66, 1]}
                style={styles.heroFade}
              />
              <View style={styles.heroCaption}>
                <Text
                  style={[
                    styles.heroTitle,
                    {
                      color: palette.primary,
                      fontFamily: fonts.displayBold,
                      fontSize: scaled(compact ? 22 : 30),
                    },
                  ]}
                  numberOfLines={1}
                >
                  {displayName(selected)}
                </Text>
                <Text
                  style={[
                    styles.metadata,
                    {
                      color: palette.textSecondary,
                      fontFamily: fonts.body,
                      fontSize: scaled(compact ? 10 : 12),
                    },
                  ]}
                  numberOfLines={2}
                >
                  {metadataLine(selected)}
                </Text>
              </View>
            </Pressable>

            <FlatList
              horizontal
              data={visibleGames}
              keyExtractor={item => item.packageName}
              showsHorizontalScrollIndicator={false}
              style={styles.rail}
              contentContainerStyle={styles.railContent}
              renderItem={({ item, index }) => {
                const active = index === selectedIndex;
                return (
                  <Pressable
                    onPress={() => setSelectedIndex(index)}
                    onLongPress={() => onLongPressGame(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Pilih ${displayName(item)}`}
                    style={({ pressed }) => [
                      styles.railCard,
                      {
                        width: iconSize,
                        height: iconSize,
                        borderColor: active
                          ? palette.primary
                          : palette.glassBorder,
                        backgroundColor: withAlpha(palette.surface, 0.82),
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Artwork game={item} />
                    <LinearGradient
                      pointerEvents="none"
                      colors={[
                        withAlpha(palette.background, 0),
                        withAlpha(palette.background, 0.92),
                      ]}
                      locations={[0.35, 1]}
                      style={styles.railFade}
                    />
                    <Text
                      style={[
                        styles.railLabel,
                        {
                          color: palette.textPrimary,
                          fontFamily: fonts.body,
                          fontSize: scaled(9),
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {displayName(item)}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        ) : (
          <View style={styles.empty}>
            <Icon name="esports" size={scaled(46)} color={palette.primary} />
            <Text
              style={[
                styles.emptyTitle,
                {
                  color: palette.textPrimary,
                  fontFamily: fonts.displayBold,
                  fontSize: scaled(20),
                },
              ]}
            >
              Belum ada game di Home
            </Text>
            <Text
              style={[
                styles.emptyHint,
                {
                  color: palette.textMuted,
                  fontFamily: fonts.body,
                  fontSize: scaled(12),
                },
              ]}
            >
              Buka Apps, tekan tahan aplikasi, lalu pilih Pin ke Games.
            </Text>
            <Pressable
              onPress={onOpenApps}
              accessibilityRole="button"
              accessibilityLabel="Buka Apps"
              style={({ pressed }) => [
                styles.emptyButton,
                { backgroundColor: palette.primary },
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.emptyButtonText,
                  {
                    color: palette.background,
                    fontFamily: fonts.bodyBold,
                    fontSize: scaled(13),
                  },
                ]}
              >
                BUKA APPS
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.actionBar}>
          <ActionButton
            icon="apps"
            label="Apps"
            onPress={onOpenApps}
            primary={false}
          />
          <ActionButton
            icon="settings"
            label="Settings"
            onPress={onOpenSettings}
            primary={false}
          />
          <ActionButton
            icon="search"
            label="Search"
            onPress={onOpenApps}
            primary={false}
          />
          <ActionButton
            icon="play"
            label="Play"
            onPress={() => selected && onPlay(selected)}
            primary
          />
        </View>
      </View>
    </View>
  );
}

function DesktopDashboard({
  widgets,
  clock,
  battery,
  network,
  onOpenSettings,
}: {
  widgets: DesktopWidget[];
  clock: ClockInfo;
  battery: BatteryState | null;
  network: NetworkState | null;
  onOpenSettings: () => void;
}): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  const { width, height } = useWindowDimensions();
  const connection = presentNetwork(network);
  const level = battery?.level ?? -1;
  const hasWidgets = widgets.length > 0;
  const clockSize = clamp(height * 0.2, 52, 124);

  if (!hasWidgets) {
    return (
      <View style={styles.empty}>
        <Icon name="grid" size={scaled(46)} color={palette.primary} />
        <Text
          style={[
            styles.emptyTitle,
            {
              color: palette.textPrimary,
              fontFamily: fonts.displayBold,
              fontSize: scaled(20),
            },
          ]}
        >
          Belum ada widget
        </Text>
        <Text
          style={[
            styles.emptyHint,
            {
              color: palette.textMuted,
              fontFamily: fonts.body,
              fontSize: scaled(12),
            },
          ]}
        >
          Pilih widget di Settings untuk menampilkan jam, tanggal, baterai, dan
          jaringan di halaman Desktop.
        </Text>
        <Pressable
          onPress={onOpenSettings}
          accessibilityRole="button"
          accessibilityLabel="Buka Settings"
          style={({ pressed }) => [
            styles.emptyButton,
            { backgroundColor: palette.primary },
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.emptyButtonText,
              {
                color: palette.background,
                fontFamily: fonts.bodyBold,
                fontSize: scaled(13),
              },
            ]}
          >
            BUKA SETTINGS
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.desktopArea}>
      <View style={styles.desktopRow}>
        {widgets.includes('clock') ? (
          <View
            style={[
              styles.widgetCard,
              styles.clockCard,
              {
                backgroundColor: withAlpha(palette.background, 0.52),
                borderColor: palette.glassBorder,
              },
            ]}
          >
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[
                styles.desktopClock,
                {
                  color: palette.textPrimary,
                  fontFamily: fonts.displayBold,
                  fontSize: scaled(clockSize),
                  lineHeight: scaled(clockSize) * 1.02,
                },
              ]}
              accessibilityLabel={`Pukul ${clock.time}`}
            >
              {clock.time}
            </Text>
            <Text
              style={[
                styles.desktopZone,
                {
                  color: palette.primary,
                  fontFamily: fonts.body,
                  fontSize: scaled(13),
                },
              ]}
            >
              {clock.timezone}
            </Text>
          </View>
        ) : null}

        <View style={styles.sideColumn}>
          {widgets.includes('date') ? (
            <DesktopInfoCard
              icon="calendar"
              label={clock.date}
              detail="Tanggal"
            />
          ) : null}
          {widgets.includes('battery') ? (
            <DesktopInfoCard
              icon={batteryIcon(level, battery?.charging ?? false)}
              label={level >= 0 ? `${level}%` : '--%'}
              detail={battery?.charging ? 'Mengisi daya' : 'Baterai'}
            />
          ) : null}
          {widgets.includes('network') ? (
            <DesktopInfoCard
              icon={connection.icon}
              label={connection.label}
              detail="Jaringan"
            />
          ) : null}
        </View>
      </View>
      <Text
        style={[
          styles.desktopHint,
          {
            color: palette.textMuted,
            fontFamily: fonts.body,
            fontSize: scaled(11),
            maxWidth: width * 0.8,
          },
        ]}
      >
        Widget dapat diatur di Settings.
      </Text>
    </View>
  );
}

function DesktopInfoCard({
  icon,
  label,
  detail,
}: {
  icon: IconName;
  label: string;
  detail: string;
}): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  return (
    <View
      style={[
        styles.widgetCard,
        styles.infoCard,
        {
          backgroundColor: withAlpha(palette.background, 0.52),
          borderColor: palette.glassBorder,
        },
      ]}
    >
      <Icon name={icon} size={scaled(20)} color={palette.primary} />
      <View style={styles.infoText}>
        <Text
          style={[
            styles.infoLabel,
            {
              color: palette.textPrimary,
              fontFamily: fonts.bodyBold,
              fontSize: scaled(15),
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.infoDetail,
            {
              color: palette.textMuted,
              fontFamily: fonts.body,
              fontSize: scaled(10),
            },
          ]}
        >
          {detail}
        </Text>
      </View>
    </View>
  );
}

function ControllerKey({ label }: { label: string }): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  return (
    <View
      style={[
        styles.controllerKey,
        { borderColor: palette.glassBorder, backgroundColor: palette.glass },
      ]}
    >
      <Text
        style={[
          styles.controllerText,
          {
            color: palette.textSecondary,
            fontFamily: fonts.bodyBold,
            fontSize: scaled(10),
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function StatusChip({
  icon,
  label,
  muted,
}: {
  icon: IconName;
  label: string;
  muted: boolean;
}): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  return (
    <View
      style={[
        styles.statusChip,
        { backgroundColor: palette.glass, borderColor: palette.glassBorder },
      ]}
    >
      <Icon
        name={icon}
        size={scaled(14)}
        color={muted ? palette.textMuted : palette.primary}
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
        {label}
      </Text>
    </View>
  );
}

function Artwork({
  game,
  large = false,
}: {
  game: PinnedGame;
  large?: boolean;
}): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  const source = artworkSource(game);

  if (!source) {
    return (
      <View
        style={[
          styles.artworkFallback,
          { backgroundColor: withAlpha(palette.primary, 0.18) },
        ]}
      >
        <Text
          style={[
            styles.fallbackLetter,
            {
              color: palette.primary,
              fontFamily: fonts.displayBold,
              fontSize: scaled(large ? 72 : 26),
            },
          ]}
        >
          {displayName(game).charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={styles.artwork}
      resizeMode="contain"
      accessibilityLabel={`Ikon ${displayName(game)}`}
    />
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
}): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: primary
            ? palette.primary
            : withAlpha('#FFFFFF', 0.06),
          borderColor: primary ? palette.primary : palette.glassBorder,
        },
        pressed && styles.pressed,
      ]}
    >
      <Icon
        name={icon}
        size={scaled(18)}
        color={primary ? palette.background : palette.textSecondary}
      />
      <Text
        style={[
          styles.actionLabel,
          {
            color: primary ? palette.background : palette.textSecondary,
            fontFamily: fonts.bodyBold,
            fontSize: scaled(11),
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  controllers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  controllerKey: {
    minWidth: 34,
    height: 28,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controllerText: {
    letterSpacing: 0.6,
  },
  tabs: {
    flexGrow: 0,
    flexShrink: 1,
  },
  tab: {
    minWidth: 96,
    height: 30,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  tabText: {
    letterSpacing: 1.2,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 110,
  },
  statusText: {
    maxWidth: 70,
  },
  clock: {
    minWidth: 58,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  gamesArea: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  hero: {
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroFade: {
    ...StyleSheet.absoluteFill,
  },
  heroCaption: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 2,
  },
  heroTitle: {
    letterSpacing: -0.5,
  },
  metadata: {
    lineHeight: 16,
  },
  rail: {
    flexGrow: 0,
    flexShrink: 1,
  },
  railContent: {
    gap: 10,
    paddingVertical: 2,
  },
  railCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  railFade: {
    ...StyleSheet.absoluteFill,
  },
  railLabel: {
    textAlign: 'center',
    maxWidth: '100%',
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  desktopArea: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
    gap: 12,
  },
  desktopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  widgetCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    justifyContent: 'center',
  },
  clockCard: {
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: 620,
    minHeight: 150,
  },
  sideColumn: {
    width: 280,
    flexShrink: 0,
    gap: 10,
  },
  desktopClock: {
    textAlign: 'left',
    fontVariant: ['tabular-nums'],
  },
  desktopZone: {
    marginTop: 4,
  },
  infoCard: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  infoText: {
    flexShrink: 1,
  },
  infoLabel: {
    letterSpacing: 0.3,
  },
  infoDetail: {
    marginTop: 2,
  },
  desktopHint: {
    textAlign: 'center',
    alignSelf: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    marginTop: 6,
  },
  emptyHint: {
    textAlign: 'center',
    maxWidth: 420,
  },
  emptyButton: {
    marginTop: 10,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyButtonText: {
    letterSpacing: 1,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  actionButton: {
    minWidth: 120,
    height: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  actionLabel: {
    letterSpacing: 0.5,
  },
  artwork: {
    ...StyleSheet.absoluteFill,
    width: undefined,
    height: undefined,
  },
  artworkFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLetter: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.68,
  },
});
