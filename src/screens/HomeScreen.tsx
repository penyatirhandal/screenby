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
import { useBattery } from '../hooks/useBattery';
import { useClock } from '../hooks/useClock';
import { useNetwork } from '../hooks/useNetwork';
import { wallpaperUri } from '../services/WallpaperService';
import { withAlpha } from '../theme/colorUtils';
import { useLauncherPalette } from '../theme/ThemeContext';
import { useTypography } from '../theme/TypographyContext';
import type { HomeTab, NetworkState, PinnedGame } from '../types';

interface HomeScreenProps {
  games: PinnedGame[];
  onOpenApps: () => void;
  onOpenSettings: () => void;
  onPlay: (game: PinnedGame) => void;
  onLongPressGame: (game: PinnedGame) => void;
}

const TABS: { key: HomeTab; label: string }[] = [
  { key: 'now', label: 'NOW' },
  { key: 'favs', label: 'FAVS' },
  { key: 'android', label: 'ANDROID' },
];

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

export function HomeScreen({
  games,
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

  const [tab, setTab] = useState<HomeTab>('favs');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const visibleGames = useMemo(() => {
    if (tab === 'now') {
      const played = games
        .filter(game => game.lastPlayedAt)
        .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0));
      return played.length > 0 ? played : games;
    }
    if (tab === 'android') {
      return [...games].sort((a, b) =>
        displayName(a).localeCompare(displayName(b)),
      );
    }
    return [...games].sort((a, b) => b.pinnedAt - a.pinnedAt);
  }, [games, tab]);

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
  const heroWidth = Math.max(220, Math.min(width * 0.56, 720));
  const railWidth = Math.max(96, Math.min(width * 0.16, 180));
  const heroHeight = compact ? Math.max(140, height * 0.44) : height * 0.5;
  const connection = presentNetwork(network);
  const batteryLevel = battery?.level ?? -1;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: palette.background },
      ]}
    >
      <WaveBackdrop width={width} height={height} />

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
                    onPress={() => setTab(item.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Tab ${item.label}`}
                    style={({ pressed }) => [
                      styles.tab,
                      {
                        backgroundColor: active
                          ? withAlpha(palette.primary, 0.22)
                          : withAlpha('#FFFFFF', 0.04),
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

        {selected ? (
          <View style={styles.showcase}>
            <Pressable
              onPress={() => onPlay(selected)}
              onLongPress={() => onLongPressGame(selected)}
              accessibilityRole="button"
              accessibilityLabel={`Mainkan ${displayName(selected)}`}
              style={({ pressed }) => [
                styles.hero,
                {
                  width: heroWidth,
                  height: heroHeight,
                  borderColor: palette.textPrimary,
                  backgroundColor: palette.surface,
                },
                pressed && styles.pressed,
              ]}
            >
              <Artwork game={selected} large />
              <LinearGradient
                pointerEvents="none"
                colors={[
                  withAlpha(palette.background, 0),
                  withAlpha(palette.background, 0.45),
                  withAlpha(palette.background, 0.92),
                ]}
                locations={[0.35, 0.68, 1]}
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
              data={visibleGames}
              keyExtractor={item => item.packageName}
              showsVerticalScrollIndicator={false}
              style={[styles.rail, { width: railWidth }]}
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
                        borderColor: active
                          ? palette.primary
                          : palette.glassBorder,
                        backgroundColor: palette.surface,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Artwork game={item} />
                    <Text
                      style={[
                        styles.railLabel,
                        {
                          color: active
                            ? palette.textPrimary
                            : palette.textMuted,
                          fontFamily: fonts.body,
                          fontSize: scaled(10),
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
              Buka Apps, tekan tahan aplikasi, lalu pilih Pin game.
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
      resizeMode={large ? 'cover' : 'contain'}
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
            : withAlpha('#FFFFFF', 0.05),
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

function WaveBackdrop({
  width,
  height,
}: {
  width: number;
  height: number;
}): React.JSX.Element {
  const palette = useLauncherPalette();
  return (
    <View pointerEvents="none" style={styles.waveRoot}>
      <View
        style={[
          styles.waveBase,
          {
            backgroundColor: withAlpha('#12392D', 0.9),
            width: width * 1.5,
            height: height * 0.82,
            borderRadius: width,
            transform: [
              { translateX: -width * 0.18 },
              { translateY: height * 0.34 },
              { rotate: '-8deg' },
            ],
          },
        ]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          withAlpha(palette.primary, 0),
          withAlpha(palette.primary, 0.3),
          withAlpha('#1F6B4F', 0.55),
        ]}
        locations={[0, 0.55, 1]}
        style={[
          styles.waveAccent,
          {
            width: width * 1.3,
            height: height * 0.6,
            borderRadius: width,
            transform: [
              { translateX: -width * 0.1 },
              { translateY: height * 0.52 },
              { rotate: '6deg' },
            ],
          },
        ]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(palette.background, 0), palette.background]}
        locations={[0, 1]}
        style={styles.waveScrim}
      />
    </View>
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
    minWidth: 72,
    height: 30,
    paddingHorizontal: 12,
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
  showcase: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    minHeight: 0,
    paddingVertical: 8,
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
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 4,
  },
  heroTitle: {
    letterSpacing: -0.5,
  },
  metadata: {
    lineHeight: 16,
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
  rail: {
    flexGrow: 0,
  },
  railContent: {
    gap: 10,
    paddingVertical: 2,
  },
  railCard: {
    height: 92,
    borderRadius: 10,
    borderWidth: 1,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  railLabel: {
    textAlign: 'center',
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
    maxWidth: 360,
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
  pressed: {
    opacity: 0.68,
  },
  waveRoot: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  waveBase: {
    position: 'absolute',
  },
  waveAccent: {
    position: 'absolute',
  },
  waveScrim: {
    ...StyleSheet.absoluteFill,
  },
});
