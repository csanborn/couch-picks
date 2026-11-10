import { describe, expect, it } from 'vitest';
import { artFor, initials } from './art';

describe('initials', () => {
  it('uses the first two meaningful words', () => {
    expect(initials('The Lantern Keeper')).toBe('LK');
    expect(initials('Paper and Moons')).toBe('PM');
  });

  it('falls back to small words when that is all there is', () => {
    expect(initials('The End')).toBe('E');
    expect(initials('Of the')).toBe('OT');
  });

  it('handles punctuation, digits and accents', () => {
    expect(initials('Élan: 48 Hours!')).toBe('É4');
    expect(initials('')).toBe('');
  });
});

describe('artFor', () => {
  it('is deterministic per title', () => {
    expect(artFor('Quilt Season')).toEqual(artFor('Quilt Season'));
  });

  it('varies between titles', () => {
    const backgrounds = new Set(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'].map((title) => artFor(title).background));
    expect(backgrounds.size).toBe(5);
  });

  it('produces oklch colors and a known motif', () => {
    const art = artFor('Harbor Lights');
    expect(art.background).toMatch(/^linear-gradient\(\d+deg, oklch\(.+\), oklch\(.+\)\)$/);
    expect(art.accent).toMatch(/^oklch\(/);
    expect(['orbs', 'stripes', 'horizon']).toContain(art.motif);
  });
});
