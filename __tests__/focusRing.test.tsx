import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { Focusable, GamepadProvider } from '../src/gamepad/GamepadProvider';
import type { GamepadEvent } from '../src/gamepad/types';

jest.mock('../src/services/NexusGamepad', () => ({
  subscribeToGamepad: jest.fn((listener: (event: GamepadEvent) => void) => {
    (globalThis as Record<string, unknown>).__gamepadListener = listener;
    return () => {
      delete (globalThis as Record<string, unknown>).__gamepadListener;
    };
  }),
}));

function emitGamepad(event: GamepadEvent): void {
  const listener = (globalThis as Record<string, unknown>).__gamepadListener as
    | ((next: GamepadEvent) => void)
    | undefined;
  listener?.(event);
}

function Harness(): React.JSX.Element {
  return (
    <GamepadProvider handlers={{ onBack: () => undefined }}>
      <Focusable id="target" onPress={() => undefined}>
        <Text>Target</Text>
      </Focusable>
    </GamepadProvider>
  );
}

describe('gamepad focus ring modality', () => {
  it('stays hidden for touch users and appears only after gamepad input', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<Harness />);
    });

    const ringCount = () =>
      renderer?.root.findAllByProps({ testID: 'target:focus-ring' }).length ??
      0;

    expect(ringCount()).toBe(0);

    ReactTestRenderer.act(() => {
      emitGamepad({
        type: 'key',
        keyCode: 96,
        action: 'down',
        repeat: false,
        source: 129,
        deviceName: 'Gamepad',
      });
    });

    expect(ringCount()).toBeGreaterThan(0);

    ReactTestRenderer.act(() => {
      const root = renderer?.root.findByProps({ testID: 'gamepad-root' });
      root?.props.onStartShouldSetResponderCapture?.({
        nativeEvent: { touches: [{}] },
        touchHistory: { numberActiveTouches: 1 },
      });
    });

    expect(ringCount()).toBe(0);

    ReactTestRenderer.act(() => {
      renderer?.unmount();
    });
  });
});
