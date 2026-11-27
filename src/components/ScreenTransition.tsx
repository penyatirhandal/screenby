import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useReduceMotion } from '../hooks/useReduceMotion';

export type TransitionFrom = 'bottom' | 'right' | 'left' | 'fade';

interface ScreenTransitionProps {
  children: React.ReactNode;
  /** Replays the entrance whenever this flips back to true. */
  visible?: boolean;
  style?: StyleProp<ViewStyle>;
  from?: TransitionFrom;
  duration?: number;
  delay?: number;
}

/**
 * Lightweight entrance animation used for screens, tab bodies and panels.
 * Uses the native driver and respects Android's Reduce Motion setting.
 */
export function ScreenTransition({
  children,
  visible = true,
  style,
  from = 'bottom',
  duration = 280,
  delay = 0,
}: ScreenTransitionProps): React.JSX.Element {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      return;
    }
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();

    return () => animation.stop();
  }, [delay, duration, progress, reduceMotion, visible]);

  const translateX =
    from === 'right' ? 28 : from === 'left' ? -28 : 0;
  const translateY = from === 'bottom' ? 22 : 0;
  const scale =
    from === 'fade'
      ? progress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] })
      : 1;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [translateX, 0] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [translateY, 0] }) },
            { scale },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
