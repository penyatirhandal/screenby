/** Physical controls exposed by Android gamepads and TV remotes. */
export type GamepadButton =
  | 'dpadUp'
  | 'dpadDown'
  | 'dpadLeft'
  | 'dpadRight'
  | 'primary'
  | 'secondary'
  | 'shoulderLeft'
  | 'shoulderRight'
  | 'triggerLeft'
  | 'triggerRight'
  | 'start'
  | 'select';

export type GamepadDirection = 'up' | 'down' | 'left' | 'right';

export interface GamepadKeyEvent {
  type: 'key';
  keyCode: number;
  action: 'down' | 'up';
  repeat: boolean;
  source: number;
  deviceName: string | null;
}

export interface GamepadAxisEvent {
  type: 'axis';
  axis: 'hat' | 'stick';
  x: number;
  y: number;
  source: number;
  deviceName: string | null;
}

export type GamepadEvent = GamepadKeyEvent | GamepadAxisEvent;

export interface GamepadInput {
  kind: 'key' | 'axis';
  action: 'down' | 'up';
  button: GamepadButton | null;
  direction: GamepadDirection | null;
  repeat: boolean;
}
