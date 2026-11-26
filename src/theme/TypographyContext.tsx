import React, { createContext, useContext, useMemo } from 'react';
import { applyTypography, fonts, typography } from './typography';
import { DEFAULT_SETTINGS } from '../services/LauncherSettingsService';
import type { LauncherSettings } from '../types';

interface TypographyContextValue {
  fonts: typeof fonts;
  scaled: (size: number) => number;
  settings: LauncherSettings;
}

const defaultValue: TypographyContextValue = {
  fonts,
  scaled: (size: number) => typography.scaled(size),
  settings: { ...DEFAULT_SETTINGS },
};

const TypographyContext =
  createContext<TypographyContextValue>(defaultValue);

interface TypographyProviderProps {
  settings: LauncherSettings;
  children: React.ReactNode;
}

export function TypographyProvider({
  settings,
  children,
}: TypographyProviderProps): React.JSX.Element {
  // Derive during render so changing the font or size immediately re-renders
  // every consumer instead of only mutating the shared font tables in an effect.
  const value = useMemo<TypographyContextValue>(() => {
    applyTypography(settings);
    return {
      fonts,
      scaled: (size: number) => typography.scaled(size),
      settings,
    };
  }, [settings]);

  return (
    <TypographyContext.Provider value={value}>
      {children}
    </TypographyContext.Provider>
  );
}

export function useTypography(): TypographyContextValue {
  return useContext(TypographyContext);
}
