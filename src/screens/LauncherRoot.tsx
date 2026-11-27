import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AppState, BackHandler, Platform, StyleSheet } from 'react-native';
import { ActionMenu, type MenuOption } from '../components/ActionMenu';
import { GameEditSheet, type GameEditPatch } from '../components/GameEditSheet';
import { GameInfoDialog } from '../components/GameInfoDialog';
import { ScreenTransition } from '../components/ScreenTransition';
import { WallpaperSheet } from '../components/WallpaperSheet';
import { GamepadProvider } from '../gamepad/GamepadProvider';
import { useGameLibrary } from '../hooks/useGameLibrary';
import type { LauncherSettingsController } from '../hooks/useLauncherSettings';
import { useNowPlaying } from '../hooks/useNowPlaying';
import { useWallpaper } from '../hooks/useWallpaper';
import {
  NexusNative,
  subscribeToScreenEvents,
} from '../services/NexusNative';
import type { LauncherThemeController } from '../hooks/useLauncherTheme';
import type {
  HomeTab,
  LauncherApp,
  PinnedGame,
  WallpaperSlot,
} from '../types';
import { AppsScreen } from './AppsScreen';
import { HomeScreen } from './HomeScreen';
import { LockScreen } from './LockScreen';
import { SettingsScreen } from './SettingsScreen';

type Screen = 'home' | 'apps' | 'settings' | 'lock';

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
  const library = useGameLibrary();
  const wallpaper = useWallpaper();
  const media = useNowPlaying();

  const showLock = useCallback(() => {
    setMenuGame(null);
    setEditing(null);
    setInfoGame(null);
    setWallpaperSheetSlot(null);
    setHomeTab('desktop');
    setScreen('lock');
  }, []);

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
  }, [editing, infoGame, menuGame, screen, wallpaperSheetSlot]);

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

  const deleteEdit = useCallback(async () => {
    if (!editing) {
      return;
    }
    await library.unpin(editing.packageName);
  }, [editing, library]);

  const applyWallpaper = useCallback(async () => {
    await theme.refresh();
  }, [theme]);

  const gamepadHandlers = useMemo(
    () => ({
      onBack: handleBack,
      onShoulder: (side: 'left' | 'right') => {
        if (screen === 'home') {
          setHomeTab(side === 'left' ? 'desktop' : 'games');
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
          setWallpaperSheetSlot(null);
          setScreen('apps');
        }
      },
    }),
    [handleBack, screen],
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
    : [];

  return (
    <GamepadProvider handlers={gamepadHandlers}>
      {screen === 'home' ? (
        <ScreenTransition key="home" style={StyleSheet.absoluteFill}>
          <HomeScreen
            games={library.games}
            tab={homeTab}
            onTabChange={setHomeTab}
            desktopItems={settings.settings.desktopItems}
            gameIconSize={settings.settings.gameIconSize}
            wallpaper={wallpaper.wallpapers.home}
            media={media}
            onOpenApps={() => {
              setWallpaperSheetSlot(null);
              setScreen('apps');
            }}
            onOpenSettings={() => {
              setWallpaperSheetSlot(null);
              setScreen('settings');
            }}
            onPlay={game => play(game)}
            onLongPressGame={setMenuGame}
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
          />
        </ScreenTransition>
      ) : null}

      {screen === 'settings' ? (
        <ScreenTransition key="settings" style={StyleSheet.absoluteFill} from="right">
          <SettingsScreen
            visible
            onClose={() => {
              setWallpaperSheetSlot(null);
              setScreen('home');
            }}
            settings={settings.settings}
            onSetFont={settings.setFont}
            onSetFontSize={settings.setFontSize}
            onSetGameIconSize={settings.setGameIconSize}
            wallpapers={wallpaper.wallpapers}
            onOpenWallpaper={slot => setWallpaperSheetSlot(slot)}
            onRemoveWallpaper={slot => wallpaper.remove(slot)}
            dynamicColorAvailable={dynamicColorAvailable}
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

      <GameInfoDialog
        visible={infoGame !== null}
        game={infoGame}
        onClose={() => setInfoGame(null)}
      />

      <ActionMenu
        visible={menuGame !== null}
        title={menuGame ? menuGame.customLabel || menuGame.label : undefined}
        options={menuOptions}
        onClose={() => setMenuGame(null)}
      />
    </GamepadProvider>
  );
}
