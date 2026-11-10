import { z } from 'zod';

export const MOOD_MAX_LENGTH = 160;

export const PicksRequestSchema = z.object({
  mood: z.string().trim().min(1, 'Tell us a mood first.').max(MOOD_MAX_LENGTH),
});
export type PicksRequest = z.infer<typeof PicksRequestSchema>;

export const KINDS = ['Movie', 'Series', 'Special'] as const;

/**
 * The shape we ask the model for. It stays loose on purpose (no length or count
 * limits) because structured output only enforces basic JSON Schema; the limits
 * live in `normalizeModelOutput` so slightly long answers are trimmed, not rejected.
 */
export const ModelOutputSchema = z.object({
  rows: z.array(
    z.object({
      title: z.string().describe('Short row heading, a few words, sentence case'),
      picks: z.array(
        z.object({
          title: z.string().describe('An original, made-up title. Never a real film or show.'),
          year: z.number().int().describe('A plausible release year'),
          kind: z.enum(KINDS),
          blurb: z.string().describe('One or two sentences on why this fits the mood'),
          tags: z.array(z.string()).describe('Two or three short genre or vibe tags'),
        }),
      ),
    }),
  ),
});
export type ModelOutput = z.infer<typeof ModelOutputSchema>;

export const PickSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(60),
  year: z.number().int().min(1920).max(2035),
  kind: z.enum(KINDS),
  blurb: z.string().min(1).max(220),
  tags: z.array(z.string().min(1).max(24)).max(3),
});
export type Pick = z.infer<typeof PickSchema>;

export const RowSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(48),
  picks: z.array(PickSchema).min(1).max(12),
});
export type Row = z.infer<typeof RowSchema>;

export const PicksResponseSchema = z.object({
  mood: z.string(),
  source: z.enum(['model', 'demo']),
  rows: z.array(RowSchema).min(1).max(6),
});
export type PicksResponse = z.infer<typeof PicksResponseSchema>;

export const ErrorResponseSchema = z.object({ error: z.string() });

const ROW_LIMIT = 6;
const PICK_LIMIT = 12;

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Turns validated model output into the app's response: trims long strings,
 * caps counts, drops empty rows and assigns stable ids. Returns null when
 * nothing usable is left, so the caller can treat it as a bad answer.
 */
export function normalizeModelOutput(output: ModelOutput, mood: string): PicksResponse | null {
  const rows: Row[] = [];
  for (const [rowIndex, row] of output.rows.slice(0, ROW_LIMIT).entries()) {
    const picks: Pick[] = row.picks
      .filter((pick) => pick.title.trim() && pick.blurb.trim())
      .slice(0, PICK_LIMIT)
      .map((pick, pickIndex) => ({
        id: `r${String(rowIndex)}-p${String(pickIndex)}-${slug(pick.title) || 'pick'}`,
        title: clip(pick.title, 60),
        year: Math.min(2035, Math.max(1920, pick.year)),
        kind: pick.kind,
        blurb: clip(pick.blurb, 220),
        tags: pick.tags
          .map((tag) => clip(tag, 24))
          .filter(Boolean)
          .slice(0, 3),
      }));
    if (picks.length > 0) {
      rows.push({ id: `row-${String(rowIndex)}`, title: clip(row.title || 'More picks', 48), picks });
    }
  }
  if (rows.length === 0) return null;
  return PicksResponseSchema.parse({ mood, source: 'model', rows });
}
