import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useReduceMotion} from '../hooks/useReduceMotion';
import {wallpaperUri} from '../services/WallpaperService';
import {withAlpha} from '../theme/colorUtils';
import {Icon} from './Icon';

const ROTATION_DURATION_MS = 8000;

interface MusicCoverProps {
  path: string | null;
  playing: boolean;
  size: number;
  color: string;
  onLongPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Round music cover. It spins while a track is playing and keeps its current
 * angle when playback stops. A long press opens the gallery through the caller.
 */
export function MusicCover({
  path,
  playing,
  size,
  color,
  onLongPress,
  style,
}: MusicCoverProps): React.JSX.Element {
  const reduceMotion = useReduceMotion();
  const spin = useRef(new Animated.Value(0)).current;
  const angle = useRef(0);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const running = useRef(false);
  const stepRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const id = spin.addListener(({value}) => {
      angle.current = value;
    });
    return () => spin.removeListener(id);
  }, [spin]);

  stepRef.current = () => {
    const from = angle.current;
    animation.current = Animated.timing(spin, {
      toValue: from + 360,
      duration: ROTATION_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.current.start(({finished}) => {
      if (!finished || !running.current) {
        return;
      }
      angle.current = from + 360;
      stepRef.current();
    });
  };

  useEffect(() => {
    if (playing && !reduceMotion && !running.current) {
      running.current = true;
      stepRef.current();
    } else if (!playing || reduceMotion) {
      running.current = false;
      animation.current?.stop();
      animation.current = null;
    }

    return () => {
      running.current = false;
      animation.current?.stop();
      animation.current = null;
    };
  }, [playing, reduceMotion]);

  const rotation = spin.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'extend',
  });

  return (
    <Pressable
      focusable={false}
      onLongPress={onLongPress}
      accessibilityRole="image"
      accessibilityLabel="Cover musik, tahan untuk mengganti gambar"
      style={[{width: size, height: size}, style]}
    >
      <Animated.View
        style={[
          styles.disc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{rotate: rotation}],
          },
        ]}
      >
        {path ? (
          <Image
            accessible={false}
            source={{uri: wallpaperUri(path)}}
            style={[styles.image, {borderRadius: size / 2}]}
          />
        ) : (
          <View
            style={[
              styles.placeholder,
              {
                borderRadius: size / 2,
                backgroundColor: withAlpha(color, 0.18),
                borderColor: withAlpha(color, 0.45),
              },
            ]}
          >
            <Icon
              name="musicNote"
              size={Math.round(size * 0.45)}
              color={color}
            />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disc: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
