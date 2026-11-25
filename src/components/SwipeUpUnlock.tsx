import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { Icon } from './Icon';

interface SwipeUpUnlockProps {
  onUnlock: () => void;
  compact?: boolean;
}

const SWIPE_DISTANCE = 150;

export function SwipeUpUnlock({
  onUnlock,
  compact = false,
}: SwipeUpUnlockProps): React.JSX.Element {
  const dragY = useRef(new Animated.Value(0)).current;
  const idle = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const onUnlockRef = useRef(onUnlock);

  useEffect(() => {
    onUnlockRef.current = onUnlock;
  }, [onUnlock]);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (active) {
          setReduceMotion(value);
        }
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      idle.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(idle, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(idle, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
      idle.setValue(0);
    };
  }, [idle, reduceMotion]);

  const threshold = compact ? 52 : 72;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy <= 0) {
            dragY.setValue(Math.max(gesture.dy, -SWIPE_DISTANCE));
          } else {
            dragY.setValue(0);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          const passed = gesture.dy <= -threshold || gesture.vy <= -0.75;
          if (passed) {
            Animated.timing(dragY, {
              toValue: -SWIPE_DISTANCE,
              duration: 170,
              useNativeDriver: true,
            }).start(() => {
              dragY.setValue(0);
              onUnlockRef.current();
            });
          } else {
            Animated.spring(dragY, {
              toValue: 0,
              friction: 7,
              tension: 70,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [dragY, threshold],
  );

  const opacity = dragY.interpolate({
    inputRange: [-SWIPE_DISTANCE, -40, 0],
    outputRange: [0.25, 0.85, 1],
    extrapolate: 'clamp',
  });

  const idleTranslate = idle.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });

  return (
    <View
      style={styles.container}
      {...panResponder.panHandlers}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Buka layar"
      accessibilityHint="Geser ke atas atau aktifkan untuk membuka"
      accessibilityActions={[{ name: 'activate', label: 'Buka layar' }]}
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === 'activate') {
          onUnlock();
        }
      }}
    >
      <Animated.View
        style={[
          styles.pill,
          compact && styles.pillCompact,
          { opacity, transform: [{ translateY: dragY }] },
        ]}
      >
        <Animated.View style={{ transform: [{ translateY: idleTranslate }] }}>
          <Icon name="lock" size={15} color={colors.primary} />
        </Animated.View>
        <Text style={[styles.text, compact && styles.textCompact]}>
          Geser ke atas untuk membuka
        </Text>
        <Animated.View style={{ transform: [{ translateY: idleTranslate }] }}>
          <Icon name="swipeUp" size={18} color={colors.textSecondary} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  pillCompact: {
    height: 38,
    paddingHorizontal: 15,
  },
  text: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    letterSpacing: 0.2,
    color: colors.textSecondary,
  },
  textCompact: {
    fontSize: 11.5,
  },
});
