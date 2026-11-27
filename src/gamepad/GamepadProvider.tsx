import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type ViewInstance,
} from 'react-native';
import { subscribeToGamepad } from '../services/NexusGamepad';
import { useLauncherPalette } from '../theme/ThemeContext';
import { mapGamepadEvent } from './mapInput';
import { pickFocusTarget, type Rect } from './navigation';
import type { GamepadDirection } from './types';

interface FocusTarget {
  id: string;
  /** Initial focus preference inside a layer. */
  priority: number;
  /** Modal layer; D-pad only moves between targets on the same layer. */
  layer: number;
  ref: React.RefObject<ViewInstance | null>;
  onPress?: () => void;
  onFocus?: () => void;
}

export interface GamepadHandlers {
  onBack: () => void;
  onShoulder?: (side: 'left' | 'right') => void;
  onStart?: () => void;
  onSelect?: () => void;
}

interface GamepadContextValue {
  focusedId: string | null;
  register: (target: FocusTarget) => () => void;
}

const GamepadContext = createContext<GamepadContextValue | null>(null);
const MOVE_THROTTLE_MS = 220;

function measureView(
  ref: React.RefObject<ViewInstance | null>,
): Promise<Rect | null> {
  return new Promise(resolve => {
    const view = ref.current;
    if (!view) {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = (rect: Rect | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(rect);
    };
    const timer = setTimeout(() => finish(null), 250);
    view.measure((_x, _y, width, height, pageX, pageY) => {
      finish({x: pageX, y: pageY, width, height});
    });
  });
}

/** Owns the single gamepad focus ring and routes pad inputs to the active target. */
export function GamepadProvider({
  handlers,
  children,
}: {
  handlers: GamepadHandlers;
  children: React.ReactNode;
}): React.JSX.Element {
  const targets = useRef(new Map<string, FocusTarget>());
  const activeId = useRef<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const handlersRef = useRef(handlers);
  const moving = useRef(false);
  const pendingDirection = useRef<GamepadDirection | null>(null);
  const lastMove = useRef<{direction: GamepadDirection; time: number} | null>(
    null,
  );

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const register = useCallback((target: FocusTarget) => {
    targets.current.set(target.id, target);
    const current = activeId.current
      ? targets.current.get(activeId.current)
      : undefined;
    if (
      !current ||
      target.layer > current.layer ||
      (target.layer === current.layer && target.priority > current.priority)
    ) {
      activeId.current = target.id;
      setFocusedId(target.id);
    }

    return () => {
      if (targets.current.get(target.id) !== target) {
        return;
      }
      targets.current.delete(target.id);
      if (activeId.current !== target.id) {
        return;
      }
      const next = [...targets.current.values()].sort(
        (a, b) => b.layer - a.layer || b.priority - a.priority,
      )[0];
      activeId.current = next?.id ?? null;
      setFocusedId(activeId.current);
    };
  }, []);

  const shouldMove = useCallback((direction: GamepadDirection) => {
    const now = Date.now();
    const previous = lastMove.current;
    if (
      previous?.direction === direction &&
      now - previous.time < MOVE_THROTTLE_MS
    ) {
      return false;
    }
    lastMove.current = {direction, time: now};
    return true;
  }, []);

  const moveFocus = useCallback(async (direction: GamepadDirection) => {
    if (moving.current) {
      pendingDirection.current = direction;
      return;
    }
    moving.current = true;
    try {
      let nextDirection: GamepadDirection | undefined = direction;
      while (nextDirection) {
        pendingDirection.current = null;
        const active = activeId.current
          ? targets.current.get(activeId.current)
          : undefined;
        if (!active) {
          break;
        }
        const activeRect = await measureView(active.ref);
        if (!activeRect) {
          break;
        }
        const peers = [...targets.current.values()].filter(
          target => target.id !== active.id && target.layer === active.layer,
        );
        if (peers.length === 0) {
          break;
        }
        const measured = await Promise.all(
          peers.map(async target => ({
            id: target.id,
            rect: await measureView(target.ref),
          })),
        );
        const nextId = pickFocusTarget(
          activeRect,
          measured.flatMap(item =>
            item.rect ? [{id: item.id, rect: item.rect}] : [],
          ),
          nextDirection,
        );
        if (nextId && targets.current.has(nextId)) {
          activeId.current = nextId;
          setFocusedId(nextId);
          targets.current.get(nextId)?.onFocus?.();
        }
        nextDirection = pendingDirection.current ?? undefined;
      }
    } finally {
      moving.current = false;
    }
  }, []);

  useEffect(() =>
    subscribeToGamepad(event => {
      const input = mapGamepadEvent(event);
      if (!input) {
        return;
      }

      if (input.kind === 'axis') {
        if (!input.direction || !shouldMove(input.direction)) {
          return;
        }
        moveFocus(input.direction);
        return;
      }

      if (input.action !== 'down') {
        return;
      }
      if (input.direction) {
        if (!shouldMove(input.direction)) {
          return;
        }
        moveFocus(input.direction);
        return;
      }
      if (input.repeat) {
        return;
      }

      switch (input.button) {
        case 'primary':
          if (moving.current) {
            return;
          }
          targets.current.get(activeId.current ?? '')?.onPress?.();
          break;
        case 'secondary':
          handlersRef.current.onBack();
          break;
        case 'shoulderLeft':
          handlersRef.current.onShoulder?.('left');
          break;
        case 'shoulderRight':
          handlersRef.current.onShoulder?.('right');
          break;
        case 'start':
          handlersRef.current.onStart?.();
          break;
        case 'select':
          handlersRef.current.onSelect?.();
          break;
        default:
          break;
      }
    }), [moveFocus, shouldMove]);

  const value = useMemo(
    () => ({focusedId, register}),
    [focusedId, register],
  );

  return (
    <GamepadContext.Provider value={value}>
      {children}
    </GamepadContext.Provider>
  );
}

export function useGamepadFocus(): GamepadContextValue {
  const value = useContext(GamepadContext);
  if (!value) {
    throw new Error('useGamepadFocus must be used inside GamepadProvider.');
  }
  return value;
}

type NativePressableProps = React.ComponentProps<typeof Pressable>;

interface FocusableProps
  extends Omit<NativePressableProps, 'ref' | 'children' | 'onPress'> {
  id: string;
  children: React.ReactNode;
  onPress?: () => void;
  onFocus?: () => void;
  priority?: number;
  layer?: number;
  enabled?: boolean;
  ringRadius?: number;
  /** External ref to the underlying view, useful for scroll-into-view. */
  viewRef?: React.Ref<ViewInstance>;
}

/** Pressable that joins the gamepad focus graph and draws a visible focus ring. */
export function Focusable({
  id,
  children,
  onPress,
  onFocus,
  priority = 0,
  layer = 0,
  enabled = true,
  style,
  ringRadius = 14,
  accessibilityState,
  disabled,
  viewRef,
  ...rest
}: FocusableProps): React.JSX.Element {
  const {focusedId, register} = useGamepadFocus();
  const palette = useLauncherPalette();
  const ref = useRef<ViewInstance | null>(null);
  const onPressRef = useRef(onPress);
  const onFocusRef = useRef(onFocus);
  onPressRef.current = onPress;
  onFocusRef.current = onFocus;
  const setRef = useCallback(
    (instance: ViewInstance | null) => {
      ref.current = instance;
      if (typeof viewRef === 'function') {
        viewRef(instance);
      } else if (viewRef) {
        (viewRef as React.MutableRefObject<ViewInstance | null>).current =
          instance;
      }
    },
    [viewRef],
  );

  useEffect(() => {
    if (!enabled || disabled) {
      return undefined;
    }
    return register({
      id,
      priority,
      layer,
      ref,
      onPress: () => onPressRef.current?.(),
      onFocus: () => onFocusRef.current?.(),
    });
  }, [register, id, priority, layer, enabled, disabled]);

  const focused = enabled && !disabled && focusedId === id;

  return (
    <Pressable
      ref={setRef}
      testID={id}
      {...rest}
      focusable={false}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{
        ...accessibilityState,
        selected: accessibilityState?.selected ?? focused,
      }}
      style={style}
    >
      {children}
      {focused ? (
        <View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              borderColor: palette.primary,
              borderRadius: ringRadius,
              shadowColor: palette.primary,
            },
          ]}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.85,
    shadowRadius: 8,
  },
});
