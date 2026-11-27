import React, { useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReduceMotion } from '../hooks/useReduceMotion';

interface MusicEqualizerProps {
  playing: boolean;
  color: string;
  height?: number;
}

const BAR_COUNT = 4;

/** Small animated equalizer shown while a track is playing. */
export function MusicEqualizer({
  playing,
  color,
  height = 16,
}: MusicEqualizerProps): React.JSX.Element {
  const reduceMotion = useReduceMotion();
  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.35)),
    [],
  );

  React.useEffect(() => {
    if (!playing || reduceMotion) {
      bars.forEach(bar => bar.setValue(playing ? 0.62 : 0.28));
      return;
    }

    const animations = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 90),
          Animated.timing(bar, {
            toValue: 1,
            duration: 320 + index * 60,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.28,
            duration: 300 + index * 50,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    animations.forEach(animation => animation.start());

    return () => {
      animations.forEach(animation => animation.stop());
      bars.forEach(bar => bar.setValue(0.35));
    };
  }, [bars, playing, reduceMotion]);

  return (
    <View
      style={[styles.row, { height }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              height,
              backgroundColor: color,
              transform: [{ scaleY: bar }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    transformOrigin: 'center bottom',
  },
});
