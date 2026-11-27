import {
  directionForButton,
  directionFromAxis,
  gamepadButtonFor,
  mapGamepadEvent,
} from '../src/gamepad/mapInput';
import { pickFocusTarget } from '../src/gamepad/navigation';

describe('gamepad input mapping', () => {
  it('maps Android DPAD, gamepad buttons and keyboard arrows', () => {
    expect(gamepadButtonFor(21)).toBe('dpadLeft');
    expect(gamepadButtonFor(22)).toBe('dpadRight');
    expect(gamepadButtonFor(280)).toBe('dpadUp');
    expect(gamepadButtonFor(96)).toBe('primary');
    expect(gamepadButtonFor(97)).toBe('secondary');
    expect(gamepadButtonFor(102)).toBe('shoulderLeft');
    expect(gamepadButtonFor(103)).toBe('shoulderRight');
    expect(gamepadButtonFor(109)).toBe('select');
    expect(gamepadButtonFor(101)).toBeNull();
    expect(gamepadButtonFor(66)).toBe('primary');
    expect(gamepadButtonFor(4)).toBeNull();
  });

  it('maps analog axes to directions with a dead zone', () => {
    expect(directionFromAxis(0, 0)).toBeNull();
    expect(directionFromAxis(0.1, -0.9)).toBe('up');
    expect(directionFromAxis(-0.8, 0.2)).toBe('left');
    expect(directionFromAxis(0.6, 0.4)).toBe('right');
    expect(directionForButton(null)).toBeNull();
  });

  it('turns a native key payload into a semantic input', () => {
    expect(
      mapGamepadEvent({
        type: 'key',
        keyCode: 102,
        action: 'down',
        repeat: false,
        source: 129,
        deviceName: 'Gamepad',
      }),
    ).toEqual({
      kind: 'key',
      action: 'down',
      button: 'shoulderLeft',
      direction: null,
      repeat: false,
    });
  });

  it('turns an analog axis payload into a direction', () => {
    expect(
      mapGamepadEvent({
        type: 'axis',
        axis: 'stick',
        x: -0.8,
        y: 0.1,
        source: 129,
        deviceName: null,
      }),
    ).toEqual({
      kind: 'axis',
      action: 'down',
      button: null,
      direction: 'left',
      repeat: true,
    });
  });
});

describe('spatial focus navigation', () => {
  const active = {x: 100, y: 100, width: 50, height: 50};

  it('picks the nearest aligned target on the right', () => {
    const next = pickFocusTarget(active, [
      {id: 'far', rect: {x: 400, y: 100, width: 50, height: 50}},
      {id: 'near', rect: {x: 180, y: 106, width: 50, height: 50}},
    ], 'right');
    expect(next).toBe('near');
  });

  it('wraps to the far edge when nothing lies ahead', () => {
    const next = pickFocusTarget(active, [
      {id: 'right', rect: {x: 220, y: 100, width: 50, height: 50}},
      {id: 'farRight', rect: {x: 400, y: 100, width: 50, height: 50}},
    ], 'left');
    expect(next).toBe('farRight');
  });

  it('returns null when there are no targets', () => {
    expect(pickFocusTarget(active, [], 'up')).toBeNull();
  });
});
