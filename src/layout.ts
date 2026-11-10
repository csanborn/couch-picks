import type { CSSProperties } from 'react';
import type { TrackMetrics } from './focus/scroll';

/**
 * The UI is laid out on a fixed 1920 by 1080 canvas and scaled to the window,
 * the way TV apps are. Fixed geometry makes scrolling pure arithmetic: no
 * measuring is needed to place a row or a card.
 */
export const STAGE = { width: 1920, height: 1080 } as const;
export const SAFE_X = 96;
export const SAFE_Y = 54;

export const HEADER_HEIGHT = 380;
export const ROW_STRIDE = 520;

const CARD_WIDTH = 400;
const CARD_GAP = 40;

export const TRACK: TrackMetrics = {
  stride: CARD_WIDTH + CARD_GAP,
  gap: CARD_GAP,
  viewport: STAGE.width - SAFE_X * 2,
  lead: 1,
};

/** The same numbers, handed to CSS as custom properties. */
export const layoutVars = {
  '--stage-width': `${String(STAGE.width)}px`,
  '--stage-height': `${String(STAGE.height)}px`,
  '--safe-x': `${String(SAFE_X)}px`,
  '--safe-y': `${String(SAFE_Y)}px`,
  '--header-height': `${String(HEADER_HEIGHT)}px`,
  '--row-stride': `${String(ROW_STRIDE)}px`,
  '--card-width': `${String(CARD_WIDTH)}px`,
  '--card-gap': `${String(CARD_GAP)}px`,
} as CSSProperties;
