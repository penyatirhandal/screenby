import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  ActionMenu,
  type MenuOption,
} from '../components/ActionMenu';
import {
  batteryIcon,
  Icon,
  type IconName,
} from '../components/Icon';
import { WallpaperBackdrop } from '../components/WallpaperBackdrop';
import { ScreenTransition } from '../components/ScreenTransition';
import { WidgetPickerSheet } from '../components/WidgetPickerSheet';
import { Focusable } from '../gamepad/GamepadProvider';
import { useBattery } from '../hooks/useBattery';
import { useClock, type ClockInfo } from '../hooks/useClock';
import { useNetwork } from '../hooks/useNetwork';
import type { NowPlayingController } from '../hooks/useNowPlaying';
import AppWidgetView from '../native/AppWidgetViewNativeComponent';
import {NexusWidgets} from '../services/NexusWidgets';
import {wallpaperUri} from '../services/WallpaperService';
import {withAlpha} from '../theme/colorUtils';
import {useLauncherPalette} from '../theme/ThemeContext';
import {useTypography} from '../theme/TypographyContext';
import type {
  AddedWidget,
  BatteryState,
  BuiltinWidget,
  DesktopWidgetItem,
  GameIconSize,
  HomeTab,
  NetworkState,
  PinnedGame,
  Wallpaper,
  WidgetProvider,
} from '../types';
import {chunkGames, GAME_GAP, gameGridFor} from '../utils/gameLayout';
import {computeCoverLayout} from '../utils/smartCrop';

interface HomeScreenProps {
  games: PinnedGame[];
  tab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
  desktopItems: DesktopWidgetItem[];
  gameIconSize: GameIconSize;
  wallpaper: Wallpaper | null;
  media: NowPlayingController;
  onOpenApps: () => void;
  onOpenSettings: () => void;
  onLock: () => void;
  onPlay: (game: PinnedGame) => void;
  onLongPressGame: (game: PinnedGame) => void;
  onAddBuiltinWidget: (
    widget: BuiltinWidget,
    layout: {x: number; y: number; width: number; height: number},
  ) => Promise<void>;
  onAddAppWidget: (
    added: AddedWidget,
    layout: {x: number; y: number; width: number; height: number},
  ) => Promise<void>;
  onUpdateWidget: (
    id: string,
    patch: {x?: number; y?: number; width?: number; height?: number},
  ) => Promise<void>;
  onRemoveWidget: (id: string) => Promise<void>;
}

const TABS: {key: HomeTab; label: string}[] = [
  {key: 'desktop', label: 'DESKTOP'},
  {key: 'games', label: 'GAMES'},
];

const DEFAULT_BUILTIN_SIZE = {width: 0.26, height: 0.34};
const DEFAULT_APP_WIDGET_SIZE = {width: 0.34, height: 0.44};

const BUILTIN_LABELS: Record<BuiltinWidget, string> = {
  clock: 'Jam',
  date: 'Tanggal',
  music: 'Musik',
  battery: 'Baterai',
  network: 'Jaringan',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function artworkSource(game: PinnedGame) {
  if (game.customIconPath) {
    return {uri: wallpaperUri(game.customIconPath)};
  }
  if (game.icon) {
    return {uri: game.icon};
  }
  return null;
}

function presentNetwork(network: NetworkState | null): {
  icon: IconName;
  label: string;
} {
  if (!network || !network.connected || network.type === 'none') {
    return {icon: 'signalOff', label: 'Offline'};
  }
  if (network.type === 'wifi') {
    return {icon: 'wifi', label: 'Wi-Fi'};
  }
  if (network.type === 'vpn') {
    return {icon: 'globe', label: 'VPN'};
  }
  if (network.type === 'cellular') {
    return {icon: 'signal', label: network.cellularGeneration ?? 'Seluler'};
  }
  return {icon: 'signal', label: 'Ethernet'};
}

function displayName(game: PinnedGame): string {
  return game.customLabel || game.label || game.packageName;
}

function widgetLabel(item: DesktopWidgetItem): string {
  return item.kind === 'builtin' ? BUILTIN_LABELS[item.widget] : item.label;
}

export function HomeScreen({
  games,
  tab,
  onTabChange,
  desktopItems,
  gameIconSize,
  wallpaper,
  media,
  onOpenApps,
  onOpenSettings,
  onLock,
  onPlay,
  onLongPressGame,
  onAddBuiltinWidget,
  onAddAppWidget,
  onUpdateWidget,
  onRemoveWidget,
}: HomeScreenProps): React.JSX.Element {
  const palette = useLauncherPalette();
  const {fonts, scaled} = useTypography();
  const {width, height} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const clock = useClock();
  const battery = useBattery();
  const network = useNetwork();

  const [wallpaperFailed, setWallpaperFailed] = useState(false);
  const [gameAreaSize, setGameAreaSize] = useState({width: 0, height: 0});

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

  const compact = height < 400;
  const connection = presentNetwork(network);
  const batteryLevel = battery?.level ?? -1;
  const {cardSize: gameCardSize, rows: gameRows} = gameGridFor(
    gameIconSize,
    gameAreaSize.width || width,
    gameAreaSize.height,
  );
  const gameColumns = useMemo(
    () => chunkGames(visibleGames, gameRows),
    [visibleGames, gameRows],
  );
  const gameColumnStep = gameCardSize + GAME_GAP;
  const gameSidePadding =
    gameColumns.length <= 1
      ? Math.max(12, ((gameAreaSize.width || width) - gameCardSize) / 2)
      : 12;

  return (
    <View style={[StyleSheet.absoluteFill, {backgroundColor: palette.background}]}>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
              {TABS.map(item => {
                const active = tab === item.key;
                return (
                  <Focusable
                    key={item.key}
                    id={`tab:${item.key}`}
                    onPress={() => onTabChange(item.key)}
                    accessibilityRole="tab"
                    accessibilityState={{selected: active}}
                    accessibilityLabel={`Tab ${item.label}`}
                    ringRadius={8}
                    style={({pressed}: {pressed: boolean}) => [
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
                          color: active ? palette.primary : palette.textMuted,
                          fontFamily: fonts.bodyBold,
                          fontSize: scaled(12),
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Focusable>
                );
              })}
            </ScrollView>
            <ControllerKey label="R1" />
          </View>

          <View style={styles.statusGroup}>
            <StatusChip icon={connection.icon} label={connection.label} muted={!network?.connected} />
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
            <Focusable
              id="home:lock"
              onPress={onLock}
              ringRadius={16}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Tampilkan Lock Screen"
              style={({pressed}: {pressed: boolean}) => [
                styles.lockButton,
                {
                  backgroundColor: withAlpha(
                    palette.primary,
                    pressed ? 0.28 : 0.14,
                  ),
                  borderColor: palette.glassBorder,
                },
                pressed && styles.pressed,
              ]}
            >
              <Icon name="lock" size={scaled(16)} color={palette.primary} />
            </Focusable>
          </View>
        </View>

        <ScreenTransition
          key={tab}
          style={styles.tabBody}
          from={tab === 'desktop' ? 'left' : 'right'}
          duration={240}
        >
          {tab === 'desktop' ? (
          <DesktopCanvas
            items={desktopItems}
            clock={clock}
            battery={battery}
            network={network}
            media={media}
            onAddBuiltinWidget={onAddBuiltinWidget}
            onAddAppWidget={onAddAppWidget}
            onUpdateWidget={onUpdateWidget}
            onRemoveWidget={onRemoveWidget}
          />
        ) : visibleGames.length > 0 ? (
          <View
            style={styles.gamesArea}
            onLayout={event => {
              const {width: nextWidth, height: nextHeight} =
                event.nativeEvent.layout;
              setGameAreaSize({width: nextWidth, height: nextHeight});
            }}
          >
            <FlatList
              horizontal
              data={gameColumns}
              keyExtractor={(_item, index) => `column-${index}`}
              showsHorizontalScrollIndicator={false}
              style={styles.gameRow}
              contentContainerStyle={[
                styles.gameRowContent,
                {paddingHorizontal: gameSidePadding},
              ]}
              snapToInterval={gameColumnStep}
              snapToAlignment="start"
              decelerationRate="fast"
              getItemLayout={(_data, index) => ({
                length: gameColumnStep,
                offset: gameColumnStep * index,
                index,
              })}
              renderItem={({item: column}) => (
                <View style={styles.gameColumn}>
                  {column.map(item => (
                    <Focusable
                      key={item.packageName}
                      id={`game:${item.packageName}`}
                      onPress={() => onPlay(item)}
                      onLongPress={() => onLongPressGame(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Mainkan ${displayName(item)}`}
                      ringRadius={18}
                      style={({pressed}) => [
                        styles.gameCard,
                        {
                          width: gameCardSize,
                          height: gameCardSize,
                          borderColor: palette.glassBorder,
                          backgroundColor: withAlpha(palette.surface, 0.82),
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Artwork
                        game={item}
                        letterSize={scaled(gameCardSize * 0.34)}
                      />
                      <LinearGradient
                        pointerEvents="none"
                        colors={[
                          withAlpha(palette.background, 0),
                          withAlpha(palette.background, 0.94),
                        ]}
                        locations={[0.42, 1]}
                        style={styles.gameCardFade}
                      />
                      <Text
                        style={[
                          styles.gameCardLabel,
                          {
                            color: palette.textPrimary,
                            fontFamily: fonts.bodyBold,
                            fontSize: scaled(
                              clamp(gameCardSize * 0.085, 11, 18),
                            ),
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {displayName(item)}
                      </Text>
                    </Focusable>
                  ))}
                </View>
              )}
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
            <Focusable
              id="home:openApps"
              onPress={onOpenApps}
              accessibilityRole="button"
              accessibilityLabel="Buka Apps"
              style={({pressed}) => [
                styles.emptyButton,
                {backgroundColor: palette.primary},
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
            </Focusable>
          </View>
        )}
        </ScreenTransition>

        <View style={styles.actionBar}>
          <ActionButton id="action:apps" icon="apps" label="Apps" onPress={onOpenApps} />
          <ActionButton
            id="action:settings"
            icon="settings"
            label="Settings"
            onPress={onOpenSettings}
          />
          <ActionButton id="action:search" icon="search" label="Search" onPress={onOpenApps} />
        </View>
      </View>
    </View>
  );
}

interface DesktopCanvasProps {
  items: DesktopWidgetItem[];
  clock: ClockInfo;
  battery: BatteryState | null;
  network: NetworkState | null;
  media: NowPlayingController;
  onAddBuiltinWidget: HomeScreenProps['onAddBuiltinWidget'];
  onAddAppWidget: HomeScreenProps['onAddAppWidget'];
  onUpdateWidget: HomeScreenProps['onUpdateWidget'];
  onRemoveWidget: HomeScreenProps['onRemoveWidget'];
}

type WidgetMode =
  | {type: 'move'; id: string}
  | {type: 'resize'; id: string}
  | null;

interface GestureStart {
  pageX: number;
  pageY: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

function DesktopCanvas({
  items,
  clock,
  battery,
  network,
  media,
  onAddBuiltinWidget,
  onAddAppWidget,
  onUpdateWidget,
  onRemoveWidget,
}: DesktopCanvasProps): React.JSX.Element {
  const palette = useLauncherPalette();
  const {fonts, scaled} = useTypography();
  const {width: windowWidth} = useWindowDimensions();
  const [canvasSize, setCanvasSize] = useState({width: 0, height: 0});
  const [pickerPoint, setPickerPoint] = useState<{x: number; y: number} | null>(
    null,
  );
  const [menuItem, setMenuItem] = useState<DesktopWidgetItem | null>(null);
  const [mode, setMode] = useState<WidgetMode>(null);
  const gestureStart = useRef<GestureStart | null>(null);
  const suppressPicker = useRef(false);

  useEffect(() => {
    if (canvasSize.width <= 0 || canvasSize.height <= 0) {
      return;
    }
    items.forEach(item => {
      if (item.kind === 'appwidget') {
        NexusWidgets.updateWidgetSize(
          item.appWidgetId,
          item.width * canvasSize.width,
          item.height * canvasSize.height,
        ).catch(() => undefined);
      }
    });
  }, [items, canvasSize.width, canvasSize.height]);

  const flagWidgetGesture = () => {
    suppressPicker.current = true;
    setTimeout(() => {
      suppressPicker.current = false;
    }, 600);
  };

  const openPicker = (event: GestureResponderEvent) => {
    if (suppressPicker.current || mode) {
      return;
    }
    const canvasWidth = canvasSize.width || windowWidth;
    const canvasHeight = canvasSize.height || 1;
    const {locationX, locationY} = event.nativeEvent;
    const {width: defaultWidth, height: defaultHeight} = DEFAULT_BUILTIN_SIZE;
    setPickerPoint({
      x: clamp(locationX / canvasWidth - defaultWidth / 2, 0, 1 - defaultWidth),
      y: clamp(locationY / canvasHeight - defaultHeight / 2, 0, 1 - defaultHeight),
    });
  };

  const openPickerAtCenter = () => {
    if (mode) {
      return;
    }
    setPickerPoint({
      x: (1 - DEFAULT_BUILTIN_SIZE.width) / 2,
      y: (1 - DEFAULT_BUILTIN_SIZE.height) / 2,
    });
  };

  const addBuiltin = (widget: BuiltinWidget) => {
    if (!pickerPoint) {
      return;
    }
    onAddBuiltinWidget(widget, {
      ...pickerPoint,
      ...DEFAULT_BUILTIN_SIZE,
    }).catch(() => undefined);
  };

  const addProvider = (provider: WidgetProvider) => {
    if (!pickerPoint) {
      return;
    }
    const layout = {...pickerPoint, ...DEFAULT_APP_WIDGET_SIZE};
    NexusWidgets.addWidget(provider.provider)
      .then(added => onAddAppWidget(added, layout))
      .catch(() => {
        Alert.alert(
          'Widget gagal ditambahkan',
          `${provider.label} tidak dapat ditambahkan ke Desktop.`,
        );
      });
  };

  const beginMode = (next: Exclude<WidgetMode, null>) => {
    const item = items.find(candidate => candidate.id === next.id);
    if (!item) {
      return;
    }
    gestureStart.current = {
      pageX: 0,
      pageY: 0,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    };
    setMode(next);
  };

  const menuOptions: MenuOption[] = menuItem
    ? [
        {
          label: 'Pindahkan',
          icon: 'apps',
          onPress: () => beginMode({type: 'move', id: menuItem.id}),
        },
        {
          label: 'Ubah ukuran',
          icon: 'tune',
          onPress: () => beginMode({type: 'resize', id: menuItem.id}),
        },
        {
          label: 'Hapus',
          icon: 'trash',
          destructive: true,
          onPress: () => {
            onRemoveWidget(menuItem.id).catch(() => undefined);
          },
        },
      ]
    : [];

  const handleGestureStart = (event: GestureResponderEvent) => {
    if (!mode || !gestureStart.current) {
      return;
    }
    gestureStart.current.pageX = event.nativeEvent.pageX;
    gestureStart.current.pageY = event.nativeEvent.pageY;
  };

  const handleGestureMove = (event: GestureResponderEvent) => {
    if (!mode || !gestureStart.current) {
      return;
    }
    const start = gestureStart.current;
    const dx = (event.nativeEvent.pageX - start.pageX) / (canvasSize.width || 1);
    const dy = (event.nativeEvent.pageY - start.pageY) / (canvasSize.height || 1);
    if (mode.type === 'move') {
      onUpdateWidget(mode.id, {
        x: clamp(start.x + dx, 0, 1 - start.width),
        y: clamp(start.y + dy, 0, 1 - start.height),
      }).catch(() => undefined);
      return;
    }
    onUpdateWidget(mode.id, {
      width: clamp(start.width + dx, 0.12, 1 - start.x),
      height: clamp(start.height + dy, 0.1, 1 - start.y),
    }).catch(() => undefined);
  };

  const endGesture = () => {
    gestureStart.current = null;
    setMode(null);
  };

  const resizeItem =
    mode?.type === 'resize'
      ? items.find(item => item.id === mode.id)
      : null;

  return (
    <>
      <Focusable
        id="desktop:canvas"
        onPress={openPickerAtCenter}
        onLongPress={openPicker}
        onLayout={event => {
          const {width: nextWidth, height: nextHeight} = event.nativeEvent.layout;
          setCanvasSize({width: nextWidth, height: nextHeight});
        }}
        accessibilityRole="button"
        accessibilityLabel="Area widget Desktop"
        style={styles.canvas}
        ringRadius={18}
      >
        {items.length === 0 ? (
          <View style={styles.canvasHint} pointerEvents="none">
            <Icon name="add" size={scaled(34)} color={palette.primary} />
            <Text
              style={[
                styles.canvasHintText,
                {
                  color: palette.textSecondary,
                  fontFamily: fonts.body,
                  fontSize: scaled(13),
                },
              ]}
            >
              Tekan lama area kosong untuk menambah widget
            </Text>
          </View>
        ) : null}

        {items.map(item => {
          const pixelWidth = item.width * (canvasSize.width || windowWidth);
          const pixelHeight = item.height * (canvasSize.height || 1);
          const positionStyle = {
            left: `${item.x * 100}%`,
            top: `${item.y * 100}%`,
            width: `${item.width * 100}%`,
            height: `${item.height * 100}%`,
          };
          const active = mode?.id === item.id;
          const borderStyle = active
            ? {borderColor: palette.primary, borderWidth: 2}
            : {borderColor: palette.glassBorder, borderWidth: StyleSheet.hairlineWidth};

          if (item.kind === 'appwidget') {
            return (
              <Focusable
                key={item.id}
                id={`widget:${item.id}`}
                priority={1}
                onPress={() => setMenuItem(item)}
                accessibilityRole="button"
                accessibilityLabel={`Widget ${widgetLabel(item)}`}
                style={[
                  styles.widgetFrame,
                  positionStyle,
                  borderStyle,
                  {backgroundColor: withAlpha(palette.surface, 0.35)},
                ]}
              >
                <AppWidgetView
                  widgetId={item.appWidgetId}
                  widthPx={Math.max(1, pixelWidth)}
                  heightPx={Math.max(1, pixelHeight)}
                  onWidgetLongPress={event => {
                    const id = event.nativeEvent.widgetId;
                    const target = items.find(
                      candidate =>
                        candidate.kind === 'appwidget' &&
                        candidate.appWidgetId === id,
                    );
                    if (target) {
                      flagWidgetGesture();
                      setMenuItem(target);
                    }
                  }}
                  style={styles.nativeWidget}
                />
              </Focusable>
            );
          }

          return (
            <Focusable
              key={item.id}
              id={`widget:${item.id}`}
              priority={1}
              onPress={() => setMenuItem(item)}
              onLongPress={() => {
                flagWidgetGesture();
                setMenuItem(item);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Widget ${widgetLabel(item)}`}
              style={({pressed}) => [
                styles.widgetFrame,
                positionStyle,
                borderStyle,
                {backgroundColor: withAlpha(palette.background, 0.52)},
                pressed && styles.pressed,
              ]}
            >
              <BuiltinWidgetCard
                widget={item.widget}
                clock={clock}
                battery={battery}
                network={network}
                media={media}
                widthPx={pixelWidth}
                heightPx={pixelHeight}
              />
            </Focusable>
          );
        })}
      </Focusable>

      {mode ? (
        <View
          style={StyleSheet.absoluteFill}
          onTouchStart={handleGestureStart}
          onTouchMove={handleGestureMove}
          onTouchEnd={endGesture}
          onTouchCancel={endGesture}
        >
          <View
            pointerEvents="none"
            style={[
              styles.modeBanner,
              {
                backgroundColor: palette.glassStrong,
                borderColor: palette.glassBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.modeBannerText,
                {
                  color: palette.textPrimary,
                  fontFamily: fonts.body,
                  fontSize: scaled(12),
                },
              ]}
            >
              {mode.type === 'move'
                ? 'Geser widget ke posisi baru'
                : 'Tarik untuk mengubah ukuran'}
            </Text>
          </View>
          {resizeItem ? (
            <View
              pointerEvents="none"
              style={[
                styles.resizeHandle,
                {
                  left: `${(resizeItem.x + resizeItem.width) * 100}%`,
                  top: `${(resizeItem.y + resizeItem.height) * 100}%`,
                  backgroundColor: palette.primary,
                },
              ]}
            />
          ) : null}
        </View>
      ) : null}

      <WidgetPickerSheet
        visible={pickerPoint !== null}
        onClose={() => setPickerPoint(null)}
        onSelectBuiltin={addBuiltin}
        onSelectProvider={addProvider}
      />

      <ActionMenu
        visible={menuItem !== null}
        title={menuItem ? widgetLabel(menuItem) : undefined}
        options={menuOptions}
        onClose={() => setMenuItem(null)}
      />
    </>
  );
}

function BuiltinWidgetCard({
  widget,
  clock,
  battery,
  network,
  media,
  widthPx,
  heightPx,
}: {
  widget: BuiltinWidget;
  clock: ClockInfo;
  battery: BatteryState | null;
  network: NetworkState | null;
  widthPx: number;
  heightPx: number;
  media: NowPlayingController;
}): React.JSX.Element {
  const palette = useLauncherPalette();
  const {fonts, scaled} = useTypography();
  const connection = presentNetwork(network);
  const level = battery?.level ?? -1;

  if (widget === 'music') {
    const artSize = clamp(Math.min(heightPx * 0.42, widthPx * 0.2), 22, 56);
    const titleSize = clamp(Math.min(widthPx * 0.085, heightPx * 0.15), 10, 15);
    const metaSize = clamp(titleSize * 0.82, 9, 12);
    const controlSize = clamp(Math.min(widthPx * 0.09, heightPx * 0.22), 11, 20);
    const track = media.state;

    if (!media.accessGranted) {
      return (
        <View style={[styles.builtinCard, styles.musicCard, styles.musicCenter]}>
          <Icon
            name="musicNote"
            size={scaled(clamp(heightPx * 0.28, 14, 26))}
            color={palette.primary}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.musicHint,
              {
                color: palette.textSecondary,
                fontFamily: fonts.body,
                fontSize: scaled(metaSize),
              },
            ]}
          >
            Musik · izinkan akses notifikasi
          </Text>
          <Pressable
            onPress={media.openAccessSettings}
            accessibilityRole="button"
            accessibilityLabel="Izinkan akses notifikasi"
            style={({pressed}) => [
              styles.musicGrant,
              {borderColor: palette.primary},
              pressed && styles.pressed,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.musicGrantText,
                {
                  color: palette.primary,
                  fontFamily: fonts.bodyBold,
                  fontSize: scaled(metaSize),
                },
              ]}
            >
              IZINKAN
            </Text>
          </Pressable>
        </View>
      );
    }

    if (!track.hasSession) {
      return (
        <View style={[styles.builtinCard, styles.musicCard, styles.musicCenter]}>
          <Icon
            name="musicNote"
            size={scaled(clamp(heightPx * 0.3, 16, 30))}
            color={palette.primary}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.musicHint,
              {
                color: palette.textSecondary,
                fontFamily: fonts.body,
                fontSize: scaled(metaSize + 1),
              },
            ]}
          >
            Tidak ada lagu diputar
          </Text>
        </View>
      );
    }

    const artwork = track.albumArtPath ? (
      <Image
        source={{uri: wallpaperUri(track.albumArtPath)}}
        style={[styles.musicArt, {width: artSize, height: artSize}]}
        accessibilityLabel="Sampul album"
      />
    ) : (
      <View
        style={[
          styles.musicArt,
          styles.musicArtFallback,
          {
            width: artSize,
            height: artSize,
            backgroundColor: withAlpha(palette.primary, 0.18),
          },
        ]}
      >
        <Icon
          name="musicNote"
          size={scaled(artSize * 0.55)}
          color={palette.primary}
        />
      </View>
    );

    return (
      <View style={[styles.builtinCard, styles.musicCard]}>
        <View style={styles.musicTop}>
          {artwork}
          <View style={styles.musicInfo}>
            <Text
              numberOfLines={1}
              style={[
                styles.musicTitle,
                {
                  color: palette.textPrimary,
                  fontFamily: fonts.bodyBold,
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
                  color: palette.textMuted,
                  fontFamily: fonts.body,
                  fontSize: scaled(metaSize),
                },
              ]}
            >
              {track.artist || track.album || 'Artis tidak diketahui'}
            </Text>
          </View>
        </View>
        <View style={styles.musicControls}>
          <Pressable
            onPress={() => media.control('previous')}
            accessibilityRole="button"
            accessibilityLabel="Lagu sebelumnya"
            hitSlop={4}
          >
            <Icon
              name="skipPrevious"
              size={scaled(controlSize)}
              color={palette.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={() => media.control('playPause')}
            accessibilityRole="button"
            accessibilityLabel={track.playing ? 'Jeda musik' : 'Putar musik'}
            hitSlop={4}
          >
            <Icon
              name={track.playing ? 'pause' : 'play'}
              size={scaled(controlSize * 1.1)}
              color={palette.primary}
            />
          </Pressable>
          <Pressable
            onPress={() => media.control('next')}
            accessibilityRole="button"
            accessibilityLabel="Lagu berikutnya"
            hitSlop={4}
          >
            <Icon
              name="skipNext"
              size={scaled(controlSize)}
              color={palette.textSecondary}
            />
          </Pressable>
        </View>
      </View>
    );
  }

  if (widget === 'clock') {
    const size = clamp(Math.min(widthPx * 0.24, heightPx * 0.52), 24, 120);
    return (
      <View style={styles.builtinCard}>
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[
            styles.builtinClock,
            {
              color: palette.textPrimary,
              fontFamily: fonts.displayBold,
              fontSize: scaled(size),
              lineHeight: scaled(size) * 1.02,
            },
          ]}
          accessibilityLabel={`Pukul ${clock.time}`}
        >
          {clock.time}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            styles.builtinZone,
            {
              color: palette.primary,
              fontFamily: fonts.body,
              fontSize: scaled(clamp(heightPx * 0.06, 10, 16)),
            },
          ]}
        >
          {clock.date} · {clock.timezone}
        </Text>
      </View>
    );
  }

  const label =
    widget === 'date'
      ? clock.date
      : widget === 'battery'
        ? level >= 0
          ? `${level}%`
          : '--%'
        : connection.label;
  const detail =
    widget === 'date'
      ? 'Tanggal'
      : widget === 'battery'
        ? battery?.charging
          ? 'Mengisi daya'
          : 'Baterai'
        : 'Jaringan';
  const icon: IconName =
    widget === 'date'
      ? 'calendar'
      : widget === 'battery'
        ? batteryIcon(level, battery?.charging ?? false)
        : connection.icon;
  const iconSize = clamp(Math.min(widthPx * 0.22, heightPx * 0.36), 18, 48);
  const labelSize = clamp(Math.min(widthPx * 0.14, heightPx * 0.24), 11, 30);

  return (
    <View style={[styles.builtinCard, styles.infoCard]}>
      <Icon name={icon} size={scaled(iconSize)} color={palette.primary} />
      <Text
        numberOfLines={1}
        style={[
          styles.infoLabel,
          {
            color: palette.textPrimary,
            fontFamily: fonts.bodyBold,
            fontSize: scaled(labelSize),
          },
        ]}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.infoDetail,
          {
            color: palette.textMuted,
            fontFamily: fonts.body,
            fontSize: scaled(clamp(heightPx * 0.06, 9, 13)),
          },
        ]}
      >
        {detail}
      </Text>
    </View>
  );
}

function ControllerKey({label}: {label: string}): React.JSX.Element {
  const palette = useLauncherPalette();
  const {fonts, scaled} = useTypography();
  return (
    <View
      style={[
        styles.controllerKey,
        {borderColor: palette.glassBorder, backgroundColor: palette.glass},
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
  const {fonts, scaled} = useTypography();
  return (
    <View
      style={[
        styles.statusChip,
        {backgroundColor: palette.glass, borderColor: palette.glassBorder},
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
  letterSize = 26,
}: {
  game: PinnedGame;
  letterSize?: number;
}): React.JSX.Element {
  const palette = useLauncherPalette();
  const {fonts, scaled} = useTypography();
  const source = artworkSource(game);

  if (!source) {
    return (
      <View
        style={[
          styles.artworkFallback,
          {backgroundColor: withAlpha(palette.primary, 0.18)},
        ]}
      >
        <Text
          style={[
            styles.fallbackLetter,
            {
              color: palette.primary,
              fontFamily: fonts.displayBold,
              fontSize: scaled(letterSize),
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
  id,
  icon,
  label,
  onPress,
  primary,
}: {
  id: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
}): React.JSX.Element {
  const palette = useLauncherPalette();
  const {fonts, scaled} = useTypography();
  return (
    <Focusable
      id={id}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({pressed}) => [
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
    </Focusable>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  tabBody: {
    flex: 1,
    minHeight: 0,
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
  lockButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    flex: 1,
    minHeight: 0,
    borderRadius: 18,
    overflow: 'hidden',
  },
  canvasHint: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  canvasHintText: {
    textAlign: 'center',
  },
  widgetFrame: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  nativeWidget: {
    flex: 1,
  },
  builtinCard: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  builtinClock: {
    textAlign: 'left',
    fontVariant: ['tabular-nums'],
  },
  builtinZone: {
    marginTop: 2,
  },
  infoCard: {
    gap: 2,
  },
  infoLabel: {
    letterSpacing: 0.2,
  },
  infoDetail: {
    marginTop: 1,
  },
  musicCard: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  musicTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  musicArt: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicArtFallback: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  musicInfo: {
    flexShrink: 1,
    gap: 1,
  },
  musicTitle: {
    letterSpacing: 0.1,
  },
  musicArtist: {
    letterSpacing: 0.1,
  },
  musicControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  musicCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  musicHint: {
    textAlign: 'center',
  },
  musicGrant: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  musicGrantText: {
    letterSpacing: 0.8,
  },
  modeBanner: {
    position: 'absolute',
    top: 8,
    left: '50%',
    transform: [{translateX: -120}],
    width: 240,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  modeBannerText: {
    textAlign: 'center',
  },
  resizeHandle: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    transform: [{translateX: -9}, {translateY: -9}],
  },
  gamesArea: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gameRow: {
    flexGrow: 0,
    flexShrink: 1,
  },
  gameRowContent: {
    gap: GAME_GAP,
    alignItems: 'center',
    paddingVertical: 2,
  },
  gameColumn: {
    gap: GAME_GAP,
    alignItems: 'center',
  },
  gameCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  gameCardFade: {
    ...StyleSheet.absoluteFill,
  },
  gameCardLabel: {
    textAlign: 'center',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
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
