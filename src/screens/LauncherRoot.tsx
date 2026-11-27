import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Platform, StyleSheet } from 'react-native';
import { ActionMenu, type MenuOption } from '../components/ActionMenu';
import { AppsLoadingOverlay } from '../components/AppsLoadingOverlay';
import { GameEditSheet, type GameEditPatch } from '../components/GameEditSheet';
import { GameInfoDialog } from '../components/GameInfoDialog';
import { ScreenTransition } from '../components/ScreenTransition';
import { WallpaperSheet } from '../components/WallpaperSheet';
import { GamepadProvider } from '../gamepad/GamepadProvider';
import { useGameLibrary } from '../hooks/useGameLibrary';
import { useGamePlatforms } from '../hooks/useGamePlatforms';
import type { LauncherSettingsController } from '../hooks/useLauncherSettings';
import { useMusicCover } from '../hooks/useMusicCover';
import { useNowPlaying } from '../hooks/useNowPlaying';
import { useWallpaper } from '../hooks/useWallpaper';
import {
  NexusNative,
  subscribeToScreenEvents,
} from '../services/NexusNative';
import { NexusRotation } from '../services/NexusRotation';
import type { LauncherThemeController } from '../hooks/useLauncherTheme';
import type {
  GamePlatform,
  HomeTab,
  LauncherApp,
  PinnedGame,
  PlatformGame,
  RotationLockMode,
  WallpaperSlot,
} from '../types';
import { AppsScreen } from './AppsScreen';
import { HomeScreen } from './HomeScreen';
import { LockScreen } from './LockScreen';
import { SettingsScreen } from './SettingsScreen';

type Screen = 'home' | 'apps' | 'settings' | 'lock';

interface PlatformGameRef {
  platformId: string;
  game: PlatformGame;
}

function platformGameAsPinned(
  ref: PlatformGameRef,
  platform: GamePlatform | undefined,
): PinnedGame {
  return {
    // Used only as a readable source label in Info; edits are keyed by game.id.
    packageName: platform ? `Platform · ${platform.name}` : 'Platform',
    label: ref.game.name,
    icon: null,
    customLabel: ref.game.customLabel,
    customIconPath: ref.game.customIconPath,
    releaseYear: ref.game.releaseYear,
    genre: ref.game.genre,
    developer: ref.game.developer,
    publisher: ref.game.publisher,
    pinnedAt: ref.game.modifiedAt,
    lastPlayedAt: ref.game.lastPlayedAt,
  };
}

const APPS_LOADING_MIN_MS = 450;
const APPS_LOADING_FALLBACK_MS = 2500;

interface LauncherRootProps {
  theme: LauncherThemeController;
  settings: LauncherSettingsController;
}

export function LauncherRoot({
  theme,
  settings,
}: LauncherRootProps): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('home');
  const [homeTab, setHomeTab] = useState<HomeTab>('desktop');
  const [editing, setEditing] = useState<PinnedGame | null>(null);
  const [menuGame, setMenuGame] = useState<PinnedGame | null>(null);
  const [infoGame, setInfoGame] = useState<PinnedGame | null>(null);
  const [wallpaperSheetSlot, setWallpaperSheetSlot] =
    useState<WallpaperSlot | null>(null);
  // undefined = closed, null = add new platform, object = edit platform.
  const [platformSheet, setPlatformSheet] = useState<
    GamePlatform | null | undefined
  >(undefined);
  const [platformMenuGame, setPlatformMenuGame] =
    useState<PlatformGameRef | null>(null);
  const [platformInfoGame, setPlatformInfoGame] =
    useState<PlatformGameRef | null>(null);
  const [platformEditGame, setPlatformEditGame] =
    useState<PlatformGameRef | null>(null);
  const [appsLoading, setAppsLoading] = useState(false);
  const appsOpenedAt = useRef(0);
  const appsMinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appsNavTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const library = useGameLibrary();
  const platforms = useGamePlatforms();
  const wallpaper = useWallpaper();
  const media = useNowPlaying();
  const cover = useMusicCover();

  const showLock = useCallback(() => {
    setMenuGame(null);
    setEditing(null);
    setInfoGame(null);
    setWallpaperSheetSlot(null);
    setPlatformSheet(undefined);
    setPlatformMenuGame(null);
    setPlatformInfoGame(null);
    setPlatformEditGame(null);
    setHomeTab('desktop');
    setScreen('lock');
  }, []);

  const openApps = useCallback(() => {
    if (appsMinTimer.current) {
      clearTimeout(appsMinTimer.current);
      appsMinTimer.current = null;
    }
    if (appsNavTimer.current) {
      clearTimeout(appsNavTimer.current);
    }
    appsOpenedAt.current = Date.now();
    setWallpaperSheetSlot(null);
    // Paint the overlay first so the screen swap never reveals a blank frame.
    setAppsLoading(true);
    appsNavTimer.current = setTimeout(() => {
      appsNavTimer.current = null;
      setScreen('apps');
    }, 16);
  }, []);

  const handleAppsLoaded = useCallback(() => {
    if (appsMinTimer.current) {
      return;
    }
    const remaining = Math.max(
      0,
      APPS_LOADING_MIN_MS - (Date.now() - appsOpenedAt.current),
    );
    appsMinTimer.current = setTimeout(() => {
      appsMinTimer.current = null;
      setAppsLoading(false);
    }, remaining);
  }, []);

  useEffect(() => {
    if (screen !== 'apps') {
      setAppsLoading(false);
    }
  }, [screen]);

  useEffect(() => {
    if (!appsLoading) {
      return;
    }
    const timer = setTimeout(
      () => setAppsLoading(false),
      APPS_LOADING_FALLBACK_MS,
    );
    return () => clearTimeout(timer);
  }, [appsLoading]);

  useEffect(
    () => () => {
      if (appsMinTimer.current) {
        clearTimeout(appsMinTimer.current);
      }
      if (appsNavTimer.current) {
        clearTimeout(appsNavTimer.current);
      }
    },
    [],
  );

  const rotationInitialized = useRef(false);

  useEffect(() => {
    if (!settings.loaded || rotationInitialized.current) {
      return;
    }
    rotationInitialized.current = true;
    NexusRotation.setRotationLock(settings.settings.rotationLock)
      .then(applied => {
        if (!applied) {
          Alert.alert(
            'Rotasi tidak diterapkan',
            'Aktifkan izin Modify system settings untuk Nexus, lalu pilih mode rotasi lagi.',
          );
        }
      })
      .catch(() => {
        // The stored setting remains in AsyncStorage for the next launch.
      });
  }, [settings.loaded, settings.settings.rotationLock]);

  const changeRotationLock = useCallback(
    async (mode: RotationLockMode) => {
      if (mode !== 'off') {
        const allowed = await NexusRotation.canWriteSettings();
        if (!allowed) {
          Alert.alert(
            'Izin diperlukan',
            'Nexus perlu izin Modify system settings untuk mengunci rotasi semua aplikasi. Aktifkan izin itu, lalu pilih mode lagi.',
            [
              { text: 'Batal', style: 'cancel' },
              {
                text: 'Buka Pengaturan',
                onPress: () => NexusRotation.openWriteSettings(),
              },
            ],
          );
          return;
        }
      }

      const applied = await NexusRotation.setRotationLock(mode);
      if (!applied) {
        Alert.alert(
          'Gagal',
          mode === 'off'
            ? 'Rotasi sistem tidak dapat dikembalikan. Periksa izin Modify system settings.'
            : 'Rotasi tidak dapat dikunci. Periksa izin Modify system settings.',
        );
        return;
      }
      await settings.setRotationLock(mode);
    },
    [settings],
  );

  useEffect(() => {
    // The OS screen turning on/off drives the in-app Nexus lock screen.
    const unsubscribeScreen = subscribeToScreenEvents(showLock, showLock);
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') {
        return;
      }
      // Covers the case where JS was suspended while the keyguard was up.
      NexusNative.consumeScreenLock()
        .then(pending => {
          if (pending) {
            showLock();
          }
        })
        .catch(() => undefined);
    });

    return () => {
      unsubscribeScreen();
      subscription.remove();
    };
  }, [showLock]);

  const handleBack = useCallback(() => {
    if (screen === 'lock') {
      return;
    }
    if (platformSheet !== undefined) {
      setPlatformSheet(undefined);
      return;
    }
    if (platformMenuGame) {
      setPlatformMenuGame(null);
      return;
    }
    if (platformEditGame) {
      setPlatformEditGame(null);
      return;
    }
    if (platformInfoGame) {
      setPlatformInfoGame(null);
      return;
    }
    if (menuGame) {
      setMenuGame(null);
      return;
    }
    if (editing) {
      setEditing(null);
      return;
    }
    if (infoGame) {
      setInfoGame(null);
      return;
    }
    if (wallpaperSheetSlot) {
      setWallpaperSheetSlot(null);
      return;
    }
    if (screen !== 'home') {
      setScreen('home');
    }
    // A launcher never closes on Back.
  }, [
    editing,
    infoGame,
    menuGame,
    platformEditGame,
    platformInfoGame,
    platformMenuGame,
    platformSheet,
    screen,
    wallpaperSheetSlot,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [handleBack]);

  const unlock = useCallback(() => {
    setHomeTab('desktop');
    setScreen('home');
  }, []);

  const play = useCallback(
    async (game: PinnedGame) => {
      try {
        const opened = await NexusNative.launchApp(game.packageName);
        if (opened) {
          await library.recordPlay(game.packageName);
        } else {
          Alert.alert('Tidak dapat membuka', `${game.label} tidak tersedia.`);
        }
      } catch {
        Alert.alert('Tidak dapat membuka', 'Aplikasi tidak tersedia.');
      }
    },
    [library],
  );

  const playPlatformGame = useCallback(
    async (platformId: string, game: PlatformGame) => {
      const platform = platforms.platforms.find(item => item.id === platformId);
      if (!platform) {
        return;
      }
      if (!platform.emulatorPackage) {
        Alert.alert(
          'Emulator belum dipilih',
          'Buka Settings > Platform > Edit untuk memilih emulator.',
        );
        return;
      }
      try {
        const opened = await NexusNative.launchGameFile(
          game.uri,
          platform.emulatorPackage,
        );
        if (!opened) {
          Alert.alert('Tidak dapat membuka', `${game.name} tidak dapat dibuka.`);
          return;
        }
        await platforms.updateGame(platformId, game.id, {
          lastPlayedAt: Date.now(),
        });
      } catch (error) {
        Alert.alert(
          'Tidak dapat membuka',
          error instanceof Error
            ? error.message
            : 'Periksa package emulator di Settings Platform.',
        );
      }
    },
    [platforms],
  );

  const pin = useCallback(
    async (app: LauncherApp) => {
      await library.pin(app);
      Alert.alert('Ditambahkan', `${app.label} sekarang ada di Games.`);
    },
    [library],
  );

  const saveEdit = useCallback(
    async (patch: GameEditPatch) => {
      if (!editing) {
        return;
      }
      if (editing.customIconPath && !patch.customIconPath) {
        await NexusNative.deleteFile(editing.customIconPath).catch(() => false);
      }
      await library.edit(editing.packageName, patch);
    },
    [editing, library],
  );

  const savePlatformGameEdit = useCallback(
    async (patch: GameEditPatch) => {
      if (!platformEditGame) {
        return;
      }
      const {platformId, game} = platformEditGame;
      if (game.customIconPath && !patch.customIconPath) {
        await NexusNative.deleteFile(game.customIconPath).catch(() => false);
      }
      await platforms.updateGame(platformId, game.id, patch);
    },
    [platformEditGame, platforms],
  );

  const deleteEdit = useCallback(async () => {
    if (!editing) {
      return;
    }
    await library.unpin(editing.packageName);
  }, [editing, library]);

  const applyWallpaper = useCallback(async () => {
    await theme.refresh();
  }, [theme]);

  const homeTabs = useMemo<HomeTab[]>(
    () => [
      'desktop',
      'games',
      ...platforms.platforms.map(
        platform => `platform:${platform.id}` as HomeTab,
      ),
    ],
    [platforms.platforms],
  );

  const gamepadHandlers = useMemo(
    () => ({
      onBack: handleBack,
      onShoulder: (side: 'left' | 'right') => {
        if (screen === 'home') {
          const current = Math.max(0, homeTabs.indexOf(homeTab));
          const next =
            side === 'left'
              ? Math.max(0, current - 1)
              : Math.min(homeTabs.length - 1, current + 1);
          setHomeTab(homeTabs[next]);
        } else if (screen !== 'lock') {
          setWallpaperSheetSlot(null);
          setScreen('home');
        }
      },
      onStart: () => {
        if (screen !== 'lock') {
          setWallpaperSheetSlot(null);
          setScreen('settings');
        }
      },
      onSelect: () => {
        if (screen !== 'lock') {
          openApps();
        }
      },
    }),
    [handleBack, homeTab, homeTabs, openApps, screen],
  );

  const dynamicColorAvailable =
    Platform.OS === 'android' && Number(Platform.Version) >= 31;

  const menuOptions: MenuOption[] = menuGame
    ? [
        {
          label: 'Play',
          icon: 'play',
          onPress: () => play(menuGame),
        },
        {
          label: 'Info',
          icon: 'info',
          onPress: () => {
            setInfoGame(menuGame);
          },
        },
        {
          label: 'Edit',
          icon: 'edit',
          onPress: () => {
            setEditing(menuGame);
          },
        },
        {
          label: 'Dismiss',
          icon: 'close',
          destructive: true,
          onPress: () => {
            library.unpin(menuGame.packageName).catch(() => undefined);
          },
        },
      ]
    : platformMenuGame
      ? [
          {
            label: 'Play',
            icon: 'play',
            onPress: () =>
              playPlatformGame(platformMenuGame.platformId, platformMenuGame.game),
          },
          {
            label: 'Info',
            icon: 'info',
            onPress: () => setPlatformInfoGame(platformMenuGame),
          },
          {
            label: 'Edit',
            icon: 'edit',
            onPress: () => setPlatformEditGame(platformMenuGame),
          },
        ]
      : [];

  const menuTitle = menuGame
    ? menuGame.customLabel || menuGame.label
    : platformMenuGame
      ? platformMenuGame.game.customLabel || platformMenuGame.game.name
      : undefined;

  const platformInfoPinned = platformInfoGame
    ? platformGameAsPinned(
        platformInfoGame,
        platforms.platforms.find(item => item.id === platformInfoGame.platformId),
      )
    : null;
  const platformEditPinned = platformEditGame
    ? platformGameAsPinned(
        platformEditGame,
        platforms.platforms.find(item => item.id === platformEditGame.platformId),
      )
    : null;

  const closeGameMenu = useCallback(() => {
    setMenuGame(null);
    setPlatformMenuGame(null);
  }, []);

  return (
    <GamepadProvider handlers={gamepadHandlers}>
      {screen === 'home' ? (
        <ScreenTransition key="home" style={StyleSheet.absoluteFill}>
          <HomeScreen
            games={library.games}
            platforms={platforms.platforms}
            tab={homeTab}
            onTabChange={setHomeTab}
            desktopItems={settings.settings.desktopItems}
            gameIconSize={settings.settings.gameIconSize}
            wallpaper={wallpaper.wallpapers.home}
            media={media}
            cover={cover}
            onOpenApps={openApps}
            onOpenSettings={() => {
              setWallpaperSheetSlot(null);
              setScreen('settings');
            }}
            onLock={showLock}
            onPlay={game => play(game)}
            onPlayPlatformGame={playPlatformGame}
            onLongPressGame={setMenuGame}
            onLongPressPlatformGame={(platformId, game) =>
              setPlatformMenuGame({platformId, game})
            }
            onAddBuiltinWidget={settings.addBuiltinWidget}
            onAddAppWidget={settings.addAppWidget}
            onUpdateWidget={settings.updateWidget}
            onRemoveWidget={settings.removeWidget}
          />
        </ScreenTransition>
      ) : null}

      {screen === 'lock' ? (
        <ScreenTransition
          key="lock"
          style={StyleSheet.absoluteFill}
          from="fade"
          duration={320}
        >
          <LockScreen
            wallpaper={wallpaper.wallpapers.lock}
            media={media}
            cover={cover}
            onUnlock={unlock}
            onOpenWallpaper={() => setWallpaperSheetSlot('lock')}
          />
        </ScreenTransition>
      ) : null}

      {screen === 'apps' ? (
        <ScreenTransition key="apps" style={StyleSheet.absoluteFill} from="right">
          <AppsScreen
            visible
            pinned={library.games}
            onClose={() => {
              setWallpaperSheetSlot(null);
              setScreen('home');
            }}
            onOpenSettings={() => {
              setWallpaperSheetSlot(null);
              setScreen('settings');
            }}
            onPin={pin}
            onUnpin={library.unpin}
            onLaunched={library.recordPlay}
            onLoaded={handleAppsLoaded}
          />
        </ScreenTransition>
      ) : null}

      {screen === 'settings' ? (
        <ScreenTransition key="settings" style={StyleSheet.absoluteFill} from="right">
          <SettingsScreen
            visible
            onClose={() => {
              setWallpaperSheetSlot(null);
              setPlatformSheet(undefined);
              setScreen('home');
            }}
            settings={settings.settings}
            onSetFont={settings.setFont}
            onSetFontSize={settings.setFontSize}
            onSetGameIconSize={settings.setGameIconSize}
            onSetRotationLock={changeRotationLock}
            wallpapers={wallpaper.wallpapers}
            onOpenWallpaper={slot => setWallpaperSheetSlot(slot)}
            onRemoveWallpaper={slot => wallpaper.remove(slot)}
            dynamicColorAvailable={dynamicColorAvailable}
            platforms={platforms.platforms}
            emulatorOptions={platforms.emulatorOptions}
            platformsLoading={platforms.loading}
            onAddPlatform={platforms.add}
            onUpdatePlatform={platforms.update}
            onRefreshPlatform={platforms.refreshGames}
            platformSheet={platformSheet}
            onPlatformSheetChange={setPlatformSheet}
          />
        </ScreenTransition>
      ) : null}

      <WallpaperSheet
        visible={wallpaperSheetSlot !== null}
        slot={wallpaperSheetSlot}
        wallpaper={
          wallpaperSheetSlot ? wallpaper.wallpapers[wallpaperSheetSlot] : null
        }
        onClose={() => setWallpaperSheetSlot(null)}
        onPick={() => {
          const slot = wallpaperSheetSlot;
          if (!slot) {
            return Promise.resolve(null);
          }
          return wallpaper.choose(slot);
        }}
        onSave={async crop => {
          const slot = wallpaperSheetSlot;
          if (!slot) {
            return;
          }
          await wallpaper.saveCrop(slot, crop);
          if (slot === 'home') {
            await applyWallpaper();
          }
        }}
        onRemove={async () => {
          const slot = wallpaperSheetSlot;
          if (!slot) {
            return;
          }
          await wallpaper.remove(slot);
        }}
      />


      <GameEditSheet
        visible={editing !== null}
        game={editing}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
        onDelete={deleteEdit}
      />

      <GameEditSheet
        visible={platformEditGame !== null}
        game={platformEditPinned}
        onClose={() => setPlatformEditGame(null)}
        onSave={savePlatformGameEdit}
      />

      <GameInfoDialog
        visible={infoGame !== null}
        game={infoGame}
        onClose={() => setInfoGame(null)}
      />

      <GameInfoDialog
        visible={platformInfoGame !== null}
        game={platformInfoPinned}
        onClose={() => setPlatformInfoGame(null)}
      />

      <ActionMenu
        visible={menuGame !== null || platformMenuGame !== null}
        title={menuTitle}
        options={menuOptions}
        onClose={closeGameMenu}
      />

      <AppsLoadingOverlay visible={appsLoading} />
    </GamepadProvider>
  );
}
