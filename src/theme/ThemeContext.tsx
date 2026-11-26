import React, { createContext, useContext, useEffect } from 'react';
import { applyLauncherPalette, colors, type LauncherPalette } from './colors';

const ThemeContext = createContext<LauncherPalette>({ ...colors });

interface ThemeProviderProps {
  palette: LauncherPalette;
  children: React.ReactNode;
}

export function ThemeProvider({
  palette,
  children,
}: ThemeProviderProps): React.JSX.Element {
  useEffect(() => {
    applyLauncherPalette(palette);
  }, [palette]);

  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useLauncherPalette(): LauncherPalette {
  return useContext(ThemeContext);
}
