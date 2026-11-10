import type { Direction } from './engine';

/**
 * Turns mouse-wheel and trackpad scrolling into the same one-step focus moves
 * the arrow keys make, the way a pointer remote's scroll wheel works on a TV.
 * Pure, so it is tested without a DOM.
 */
export interface WheelState {
  /** Scroll distance gathered toward the next move, in px. Only one axis is ever non-zero. */
  x: number;
  y: number;
  lastEvent: number;
  lastMove: number;
}

export const emptyWheelState: WheelState = { x: 0, y: 0, lastEvent: -Infinity, lastMove: -Infinity };

/** The fields of a `WheelEvent` this needs. */
export interface WheelInput {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  shiftKey: boolean;
  timeStamp: number;
}

/** Scroll distance that makes one move: about one mouse-wheel notch. */
export const WHEEL_STEP = 100;
/** Shortest time between moves, so a trackpad fling glides card by card instead of skipping a row's length. */
export const WHEEL_INTERVAL = 120;
/** A pause this long starts a new gesture, dropping any leftover distance. */
export const GESTURE_GAP = 250;

const LINE_PX = 40;
const PAGE_PX = 800;

function toPixels(delta: number, deltaMode: number): number {
  if (deltaMode === 1) return delta * LINE_PX;
  if (deltaMode === 2) return delta * PAGE_PX;
  return delta;
}

export function wheelStep(state: WheelState, input: WheelInput): { state: WheelState; direction: Direction | null } {
  let dx = toPixels(input.deltaX, input.deltaMode);
  let dy = toPixels(input.deltaY, input.deltaMode);
  // Shift with a plain mouse wheel scrolls sideways.
  if (input.shiftKey && dx === 0) [dx, dy] = [dy, 0];

  const fresh = input.timeStamp - state.lastEvent > GESTURE_GAP;
  // Follow the dominant axis only, so a slightly diagonal swipe never drifts into the next row.
  const horizontal = Math.abs(dx) > Math.abs(dy);
  let x = horizontal ? (fresh ? 0 : state.x) + dx : 0;
  let y = horizontal ? 0 : (fresh ? 0 : state.y) + dy;
  const distance = horizontal ? x : y;

  if (Math.abs(distance) < WHEEL_STEP) {
    return { state: { ...state, x, y, lastEvent: input.timeStamp }, direction: null };
  }
  if (input.timeStamp - state.lastMove < WHEEL_INTERVAL) {
    // Too soon: hold one step ready and drop the excess, so momentum cannot pile up moves.
    const capped = Math.sign(distance) * WHEEL_STEP;
    if (horizontal) x = capped;
    else y = capped;
    return { state: { ...state, x, y, lastEvent: input.timeStamp }, direction: null };
  }
  const direction: Direction = horizontal ? (distance > 0 ? 'right' : 'left') : distance > 0 ? 'down' : 'up';
  return { state: { x: 0, y: 0, lastEvent: input.timeStamp, lastMove: input.timeStamp }, direction };
}
