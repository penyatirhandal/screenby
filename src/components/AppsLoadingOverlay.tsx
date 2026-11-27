import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
} from 'react-native';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { withAlpha } from '../theme/colorUtils';
import { useLauncherPalette } from '../theme/ThemeContext';
import { useTypography } from '../theme/TypographyContext';

interface AppsLoadingOverlayProps {
  visible: boolean;
}

/** Covers the brief blank frame between tapping Apps and the drawer being ready. */
export function AppsLoadingOverlay({
  visible,
}: AppsLoadingOverlayProps): React.JSX.Element | null {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      return;
    }
    opacity.setValue(0);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: reduceMotion ? 0 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity, reduceMotion, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.overlay,
        { backgroundColor: withAlpha(palette.background, 0.94), opacity },
      ]}
      accessible
      accessibilityLabel="Memuat aplikasi"
    >
      {reduceMotion ? (
        <ActivityIndicator size="large" color={palette.primary} />
      ) : (
        <Image
          source={require('../../assets/loading.gif')}
          style={styles.spinner}
          resizeMode="contain"
          accessibilityLabel="Animasi loading"
        />
      )}
      <Text
        style={[
          styles.label,
          {
            color: palette.textSecondary,
            fontFamily: fonts.body,
            fontSize: scaled(13),
          },
        ]}
      >
        Memuat aplikasi...
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 50,
  },
  spinner: {
    width: 140,
    height: 140,
  },
  label: {
    letterSpacing: 0.6,
  },
});
