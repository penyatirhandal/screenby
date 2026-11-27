import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Tracks Android's "Remove animations" accessibility setting. */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (active) {
          setReduceMotion(value);
        }
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      value => {
        if (active) {
          setReduceMotion(value);
        }
      },
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
