import { describe, expect, it } from 'vitest';
import { trackOffset, type TrackMetrics } from './scroll';

// Five 100px items with 20px gaps in a 250px window: content is 580px wide.
const metrics: TrackMetrics = { stride: 120, gap: 20, viewport: 250, lead: 1 };

describe('trackOffset', () => {
  it('does not scroll for the first items', () => {
    expect(trackOffset(0, 5, metrics)).toBe(0);
    expect(trackOffset(1, 5, metrics)).toBe(0);
  });

  it('keeps one item of lead in view before the focused one', () => {
    expect(trackOffset(2, 5, metrics)).toBe(120);
  });

  it('stops at the end of the content', () => {
    expect(trackOffset(4, 5, metrics)).toBe(330);
    expect(trackOffset(99, 5, metrics)).toBe(330);
  });

  it('never scrolls a row that fits', () => {
    expect(trackOffset(1, 2, metrics)).toBe(0);
    expect(trackOffset(3, 2, { ...metrics, lead: 0 })).toBe(0);
  });

  it('handles empty rows and negative indexes', () => {
    expect(trackOffset(0, 0, metrics)).toBe(0);
    expect(trackOffset(-1, 5, metrics)).toBe(0);
  });
});
