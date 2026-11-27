import type {
  GamepadButton,
  GamepadDirection,
  GamepadEvent,
  GamepadInput,
} from './types';

/**
 * Android key codes from a gamepad. DPAD_CENTER (23) is treated as A so that
 * TV remotes and keyboard arrows can drive the same navigation as a pad.
 */
const KEY_TO_BUTTON: Record<number, GamepadButton> = {
  19: 'dpadUp',
  20: 'dpadDown',
  21: 'dpadLeft',
  22: 'dpadRight',
  23: 'primary',
  66: 'primary', // ENTER on keyboards / TV remotes
  96: 'primary', // BUTTON_A
  97: 'secondary', // BUTTON_B
  99: 'primary', // BUTTON_X (alternate confirm)
  100: 'secondary', // BUTTON_Y (alternate cancel)
  109: 'select', // BUTTON_SELECT
  102: 'shoulderLeft', // BUTTON_L1
  103: 'shoulderRight', // BUTTON_R1
  104: 'triggerLeft', // BUTTON_L2
  105: 'triggerRight', // BUTTON_R2
  108: 'start',
  280: 'dpadUp', // BUTTON_DPAD_UP
  281: 'dpadDown',
  282: 'dpadLeft',
  283: 'dpadRight',
};

export function gamepadButtonFor(keyCode: number): GamepadButton | null {
  return KEY_TO_BUTTON[keyCode] ?? null;
}

export function directionForButton(
  button: GamepadButton | null,
): GamepadDirection | null {
  switch (button) {
    case 'dpadUp':
      return 'up';
    case 'dpadDown':
      return 'down';
    case 'dpadLeft':
      return 'left';
    case 'dpadRight':
      return 'right';
    default:
      return null;
  }
}

const AXIS_THRESHOLD = 0.42;

export function directionFromAxis(x: number, y: number): GamepadDirection | null {
  if (Math.abs(x) < AXIS_THRESHOLD && Math.abs(y) < AXIS_THRESHOLD) {
    return null;
  }
  return Math.abs(x) >= Math.abs(y)
    ? x < 0
      ? 'left'
      : 'right'
    : y < 0
      ? 'up'
      : 'down';
}

/** Converts a native bridge payload into a single semantic input. */
export function mapGamepadEvent(event: GamepadEvent): GamepadInput | null {
  if (event.type === 'key') {
    const button = gamepadButtonFor(event.keyCode);
    if (!button) {
      return null;
    }
    return {
      kind: 'key',
      action: event.action,
      button,
      direction: directionForButton(button),
      repeat: event.repeat,
    };
  }

  return {
    kind: 'axis',
    action: 'down',
    button: null,
    direction: directionFromAxis(event.x, event.y),
    repeat: true,
  };
}
