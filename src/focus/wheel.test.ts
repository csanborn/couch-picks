import { describe, expect, it } from 'vitest';
import { emptyWheelState, GESTURE_GAP, WHEEL_INTERVAL, WHEEL_STEP, wheelStep, type WheelInput, type WheelState } from './wheel';

function wheel(timeStamp: number, deltaY: number, deltaX = 0, extra: Partial<WheelInput> = {}): WheelInput {
  return { deltaX, deltaY, deltaMode: 0, shiftKey: false, timeStamp, ...extra };
}

/** Feeds events in order and returns the directions that fired. */
function run(inputs: WheelInput[], start: WheelState = emptyWheelState) {
  let state = start;
  const moves = [];
  for (const input of inputs) {
    const step = wheelStep(state, input);
    state = step.state;
    if (step.direction) moves.push(step.direction);
  }
  return moves;
}

describe('wheelStep', () => {
  it('moves once per mouse-wheel notch in either direction', () => {
    expect(run([wheel(0, WHEEL_STEP)])).toEqual(['down']);
    expect(run([wheel(0, -WHEEL_STEP)])).toEqual(['up']);
  });

  it('gathers small trackpad deltas into one step', () => {
    expect(run([wheel(0, 0, 30), wheel(16, 0, 30), wheel(32, 0, 30)])).toEqual([]);
    expect(run([wheel(0, 0, 30), wheel(16, 0, 30), wheel(32, 0, 30), wheel(48, 0, 30)])).toEqual(['right']);
    expect(run([wheel(0, 0, -60), wheel(16, 0, -60)])).toEqual(['left']);
  });

  it('follows only the dominant axis of a diagonal swipe', () => {
    expect(run([wheel(0, 40, 80), wheel(16, 40, 80)])).toEqual(['right']);
  });

  it('throttles a fling to one move per interval and drops the excess', () => {
    const fling = Array.from({ length: 30 }, (_, i) => wheel(i * 16, 0, 400));
    const moves = run(fling);
    expect(moves.length).toBe(Math.floor((29 * 16) / WHEEL_INTERVAL) + 1);
    expect(new Set(moves)).toEqual(new Set(['right']));
  });

  it('starts fresh after a pause', () => {
    expect(run([wheel(0, 60), wheel(GESTURE_GAP + 1, 60)])).toEqual([]);
    expect(run([wheel(0, 60), wheel(GESTURE_GAP - 1, 60)])).toEqual(['down']);
  });

  it('drops leftover distance when the swipe reverses into another axis', () => {
    expect(run([wheel(0, 90), wheel(16, 0, 20)])).toEqual([]);
  });

  it('reads line and page delta modes', () => {
    expect(run([wheel(0, 3, 0, { deltaMode: 1 })])).toEqual(['down']);
    expect(run([wheel(0, -1, 0, { deltaMode: 2 })])).toEqual(['up']);
  });

  it('turns shift with a vertical wheel into sideways movement', () => {
    expect(run([wheel(0, WHEEL_STEP, 0, { shiftKey: true })])).toEqual(['right']);
  });
});
