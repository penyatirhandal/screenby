import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useLauncherSettings } from './src/hooks/useLauncherSettings';
import { useLauncherTheme } from './src/hooks/useLauncherTheme';
import { LauncherRoot } from './src/screens/LauncherRoot';
import { ThemeProvider } from './src/theme/ThemeContext';
import { TypographyProvider } from './src/theme/TypographyContext';

function App(): React.JSX.Element {
  const theme = useLauncherTheme();
  const settings = useLauncherSettings();

  return (
    <SafeAreaProvider>
      <StatusBar hidden barStyle="light-content" />
      <ThemeProvider palette={theme.palette}>
        <TypographyProvider settings={settings.settings}>
          <LauncherRoot theme={theme} settings={settings} />
        </TypographyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
