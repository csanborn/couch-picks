import { AnthropicError } from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { describe, expect, it } from 'vitest';
import { ModelOutputSchema, PicksRequestSchema, normalizeModelOutput, type ModelOutput } from './schema.js';

const pick = (overrides: Partial<ModelOutput['rows'][number]['picks'][number]> = {}) => ({
  title: 'Lantern Season',
  year: 2014,
  kind: 'Movie' as const,
  blurb: 'Warm and gentle.',
  tags: ['Cozy', 'Drama'],
  ...overrides,
});

describe('PicksRequestSchema', () => {
  it('trims the mood', () => {
    expect(PicksRequestSchema.parse({ mood: '  rainy day  ' })).toEqual({ mood: 'rainy day' });
  });

  it.each([undefined, null, 'cozy', {}, { mood: '' }, { mood: '   ' }, { mood: 42 }, { mood: 'x'.repeat(161) }])(
    'rejects %j',
    (body) => {
      expect(PicksRequestSchema.safeParse(body).success).toBe(false);
    },
  );
});

describe('model output parsing', () => {
  const format = zodOutputFormat(ModelOutputSchema);

  it('sends a JSON schema that describes rows of picks', () => {
    expect(format.type).toBe('json_schema');
    expect(JSON.stringify(format.schema)).toContain('"rows"');
    expect(JSON.stringify(format.schema)).toContain('"blurb"');
  });

  it('accepts well formed output', () => {
    const text = JSON.stringify({ rows: [{ title: 'Cozy', picks: [pick()] }] });
    expect(format.parse(text)).toEqual({ rows: [{ title: 'Cozy', picks: [pick()] }] });
  });

  it.each([
    ['truncated JSON', '{"rows": [{"title": "Cozy", "picks": ['],
    ['plain prose', 'Here are some picks you might enjoy!'],
    ['the wrong shape', JSON.stringify({ picks: [] })],
    ['a missing field', JSON.stringify({ rows: [{ title: 'Cozy', picks: [{ title: 'No year' }] }] })],
    ['an unknown kind', JSON.stringify({ rows: [{ title: 'Cozy', picks: [pick({ kind: 'Podcast' as 'Movie' })] }] })],
    ['a fractional year', JSON.stringify({ rows: [{ title: 'Cozy', picks: [pick({ year: 2014.5 })] }] })],
  ])('rejects %s', (_label, text) => {
    expect(() => format.parse(text)).toThrow(AnthropicError);
  });
});

describe('normalizeModelOutput', () => {
  it('assigns unique ids and marks the source', () => {
    const response = normalizeModelOutput(
      { rows: [{ title: 'Cozy', picks: [pick(), pick({ title: 'Lantern Season' })] }] },
      'cozy',
    );
    expect(response?.source).toBe('model');
    expect(response?.mood).toBe('cozy');
    const ids = response?.rows[0]?.picks.map((item) => item.id) ?? [];
    expect(new Set(ids).size).toBe(2);
  });

  it('trims long text with an ellipsis instead of rejecting it', () => {
    const response = normalizeModelOutput(
      { rows: [{ title: 'A row title that goes on far longer than any row title should', picks: [pick({ blurb: 'word '.repeat(80) })] }] },
      'cozy',
    );
    const row = response?.rows[0];
    expect(row?.title.length).toBeLessThanOrEqual(48);
    expect(row?.title.endsWith('…')).toBe(true);
    expect(row?.picks[0]?.blurb.length).toBeLessThanOrEqual(220);
  });

  it('caps rows, picks and tags, and clamps the year', () => {
    const manyPicks = Array.from({ length: 20 }, (_, index) => pick({ title: `Pick ${String(index)}` }));
    const rows = Array.from({ length: 9 }, (_, index) => ({ title: `Row ${String(index)}`, picks: manyPicks }));
    rows[0] = { title: 'Row 0', picks: [pick({ year: 1066, tags: ['a', 'b', 'c', 'd', 'e'] })] };
    const response = normalizeModelOutput({ rows }, 'many');
    expect(response?.rows).toHaveLength(6);
    expect(response?.rows[1]?.picks).toHaveLength(12);
    expect(response?.rows[0]?.picks[0]?.year).toBe(1920);
    expect(response?.rows[0]?.picks[0]?.tags).toEqual(['a', 'b', 'c']);
  });

  it('drops blank picks and empty rows', () => {
    const response = normalizeModelOutput(
      {
        rows: [
          { title: 'Empty', picks: [] },
          { title: 'Blank', picks: [pick({ title: '   ' }), pick({ blurb: '' })] },
          { title: 'Good', picks: [pick()] },
        ],
      },
      'cozy',
    );
    expect(response?.rows.map((row) => row.title)).toEqual(['Good']);
  });

  it('returns null when nothing usable is left', () => {
    expect(normalizeModelOutput({ rows: [] }, 'cozy')).toBeNull();
    expect(normalizeModelOutput({ rows: [{ title: 'Empty', picks: [] }] }, 'cozy')).toBeNull();
  });
});
