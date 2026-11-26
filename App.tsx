/**
 * Nexus Lock Screen
 * Material You inspired landscape lock screen.
 *
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useLauncherTheme } from './src/hooks/useLauncherTheme';
import { LockScreen } from './src/screens/LockScreen';
import { ThemeProvider } from './src/theme/ThemeContext';

function App(): React.JSX.Element {
  const palette = useLauncherTheme();

  return (
    <SafeAreaProvider>
      <StatusBar hidden barStyle="light-content" />
      <ThemeProvider palette={palette}>
        <LockScreen />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
