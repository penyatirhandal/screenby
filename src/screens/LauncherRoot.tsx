import React, { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, Platform } from 'react-native';
import { ActionMenu, type MenuOption } from '../components/ActionMenu';
import { GameEditSheet, type GameEditPatch } from '../components/GameEditSheet';
import { useGameLibrary } from '../hooks/useGameLibrary';
import type { LauncherSettingsController } from '../hooks/useLauncherSettings';
import { useWallpaper } from '../hooks/useWallpaper';
import { NexusNative } from '../services/NexusNative';
import type { LauncherThemeController } from '../hooks/useLauncherTheme';
import type { LauncherApp, PinnedGame } from '../types';
import { AppsScreen } from './AppsScreen';
import { HomeScreen } from './HomeScreen';
import { SettingsScreen } from './SettingsScreen';

type Screen = 'home' | 'apps' | 'settings';

interface LauncherRootProps {
  theme: LauncherThemeController;
  settings: LauncherSettingsController;
}

export function LauncherRoot({
  theme,
  settings,
}: LauncherRootProps): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('home');
  const [editing, setEditing] = useState<PinnedGame | null>(null);
  const [menuGame, setMenuGame] = useState<PinnedGame | null>(null);
  const library = useGameLibrary();
  const wallpaper = useWallpaper();

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (editing) {
          setEditing(null);
          return true;
        }
        if (screen !== 'home') {
          setScreen('home');
        }
        // A launcher never closes on Back.
        return true;
      },
    );
    return () => subscription.remove();
  }, [editing, screen]);

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
      Alert.alert('Ditambahkan', `${app.label} sekarang ada di Home.`);
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
    <>
      <HomeScreen
        games={library.games}
        onOpenApps={() => setScreen('apps')}
        onOpenSettings={() => setScreen('settings')}
        onPlay={game => play(game)}
        onLongPressGame={setMenuGame}
      />

      <AppsScreen
        visible={screen === 'apps'}
        pinned={library.games}
        onClose={() => setScreen('home')}
        onOpenSettings={() => setScreen('settings')}
        onPin={pin}
        onUnpin={library.unpin}
        onLaunched={library.recordPlay}
      />

      <SettingsScreen
        visible={screen === 'settings'}
        onClose={() => setScreen('home')}
        settings={settings.settings}
        onSetFont={settings.setFont}
        onSetFontSize={settings.setFontSize}
        wallpaper={wallpaper.wallpaper}
        onPickWallpaper={wallpaper.choose}
        onSaveCrop={async crop => {
          await wallpaper.saveCrop(crop);
          await applyWallpaper();
        }}
        onRemoveWallpaper={wallpaper.remove}
        dynamicColorAvailable={dynamicColorAvailable}
      />

      <GameEditSheet
        visible={editing !== null}
        game={editing}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
        onDelete={deleteEdit}
      />

      <ActionMenu
        visible={menuGame !== null}
        title={menuGame ? menuGame.customLabel || menuGame.label : undefined}
        options={menuOptions}
        onClose={() => setMenuGame(null)}
      />
    </>
  );
}
