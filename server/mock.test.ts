import { describe, expect, it } from 'vitest';
import { PicksResponseSchema } from '../shared/schema.js';
import { mockPicks } from './mock.js';

const allPicks = (mood: string) => mockPicks(mood).rows.flatMap((row) => row.picks);

describe('mockPicks', () => {
  it('returns a valid demo response', () => {
    const response = mockPicks('cozy rainy Sunday');
    expect(PicksResponseSchema.parse(response)).toEqual(response);
    expect(response.source).toBe('demo');
    expect(response.mood).toBe('cozy rainy Sunday');
    expect(response.rows).toHaveLength(4);
    for (const row of response.rows) expect(row.picks).toHaveLength(8);
  });

  it('is deterministic for the same mood, ignoring case and outer spaces', () => {
    expect(mockPicks('Edge of my seat').rows).toEqual(mockPicks('  edge of MY seat ').rows);
  });

  it('differs between moods', () => {
    expect(allPicks('a quiet night in')).not.toEqual(allPicks('a loud night out'));
  });

  it('leads with rows that match words in the mood', () => {
    expect(mockPicks('something to watch with my 8 year old').rows[0]?.title).toBe('Fun for the whole couch');
    expect(mockPicks('I want something scary').rows[0]?.title).toBe('Edge of your seat');
    const rowTitles = mockPicks('a cozy, funny date night').rows.map((row) => row.title);
    expect(rowTitles.slice(0, 3)).toEqual(['Blanket and tea comfort', 'Big laughs', 'Date night']);
  });

  it('never repeats a title or an id within a response', () => {
    for (const mood of ['cozy', 'kids', 'scary', 'nothing in particular']) {
      const picks = allPicks(mood);
      expect(new Set(picks.map((pick) => pick.title)).size).toBe(picks.length);
      expect(new Set(picks.map((pick) => pick.id)).size).toBe(picks.length);
    }
  });

  it('never writes dashes into titles or blurbs', () => {
    for (const pick of allPicks('anything at all')) {
      expect(`${pick.title} ${pick.blurb}`).not.toMatch(/[–—]/);
    }
  });
});
