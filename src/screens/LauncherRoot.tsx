import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AppState, BackHandler, Platform } from 'react-native';
import { ActionMenu, type MenuOption } from '../components/ActionMenu';
import { GameEditSheet, type GameEditPatch } from '../components/GameEditSheet';
import { GameInfoDialog } from '../components/GameInfoDialog';
import { GamepadProvider } from '../gamepad/GamepadProvider';
import { useGameLibrary } from '../hooks/useGameLibrary';
import type { LauncherSettingsController } from '../hooks/useLauncherSettings';
import { useWallpaper } from '../hooks/useWallpaper';
import {
  NexusNative,
  subscribeToScreenEvents,
} from '../services/NexusNative';
import type { LauncherThemeController } from '../hooks/useLauncherTheme';
import type { HomeTab, LauncherApp, PinnedGame } from '../types';
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
  const [wallpaperSheetOpen, setWallpaperSheetOpen] = useState(false);
  const library = useGameLibrary();
  const wallpaper = useWallpaper();

  const showLock = useCallback(() => {
    setMenuGame(null);
    setEditing(null);
    setInfoGame(null);
    setWallpaperSheetOpen(false);
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
    if (screen === 'settings' && wallpaperSheetOpen) {
      setWallpaperSheetOpen(false);
      return;
    }
    if (screen !== 'home') {
      setWallpaperSheetOpen(false);
      setScreen('home');
    }
    // A launcher never closes on Back.
  }, [editing, infoGame, menuGame, screen, wallpaperSheetOpen]);

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
          setWallpaperSheetOpen(false);
          setScreen('home');
        }
      },
      onStart: () => {
        if (screen !== 'lock') {
          setWallpaperSheetOpen(false);
          setScreen('settings');
        }
      },
      onSelect: () => {
        if (screen !== 'lock') {
          setWallpaperSheetOpen(false);
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
        <HomeScreen
          games={library.games}
          tab={homeTab}
          onTabChange={setHomeTab}
          desktopItems={settings.settings.desktopItems}
          gameIconSize={settings.settings.gameIconSize}
          wallpaper={wallpaper.wallpaper}
          onOpenApps={() => {
            setWallpaperSheetOpen(false);
            setScreen('apps');
          }}
          onOpenSettings={() => {
            setWallpaperSheetOpen(false);
            setScreen('settings');
          }}
          onPlay={game => play(game)}
          onLongPressGame={setMenuGame}
          onAddBuiltinWidget={settings.addBuiltinWidget}
          onAddAppWidget={settings.addAppWidget}
          onUpdateWidget={settings.updateWidget}
          onRemoveWidget={settings.removeWidget}
        />
      ) : null}

      {screen === 'lock' ? (
        <LockScreen
          wallpaper={wallpaper.wallpaper}
          onUnlock={unlock}
          onOpenSettings={() => {
            setWallpaperSheetOpen(false);
            setScreen('settings');
          }}
        />
      ) : null}

      <AppsScreen
        visible={screen === 'apps'}
        pinned={library.games}
        onClose={() => {
          setWallpaperSheetOpen(false);
          setScreen('home');
        }}
        onOpenSettings={() => {
          setWallpaperSheetOpen(false);
          setScreen('settings');
        }}
        onPin={pin}
        onUnpin={library.unpin}
        onLaunched={library.recordPlay}
      />

      <SettingsScreen
        visible={screen === 'settings'}
        onClose={() => {
          setWallpaperSheetOpen(false);
          setScreen('home');
        }}
        settings={settings.settings}
        onSetFont={settings.setFont}
        onSetFontSize={settings.setFontSize}
        onSetGameIconSize={settings.setGameIconSize}
        wallpaper={wallpaper.wallpaper}
        onPickWallpaper={wallpaper.choose}
        onSaveCrop={async crop => {
          await wallpaper.saveCrop(crop);
          await applyWallpaper();
        }}
        onRemoveWallpaper={wallpaper.remove}
        dynamicColorAvailable={dynamicColorAvailable}
        wallpaperSheetVisible={wallpaperSheetOpen}
        onWallpaperSheetVisibilityChange={setWallpaperSheetOpen}
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
