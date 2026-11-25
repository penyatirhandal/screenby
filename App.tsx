/**
 * Nexus Lock Screen
 * Material You inspired landscape lock screen.
 *
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LockScreen } from './src/screens/LockScreen';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar hidden barStyle="light-content" />
      <LockScreen />
    </SafeAreaProvider>
  );
}

export default App;
