import { hashString } from '../../shared/hash';

const SMALL_WORDS = new Set(['the', 'a', 'an', 'and', 'of', 'for', 'over', 'after', 'to', 'in', 'on']);

/** Up to two initials from the meaningful words of a title. */
export function initials(title: string): string {
  const words = title.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const meaningful = words.filter((word) => !SMALL_WORDS.has(word.toLowerCase()));
  const source = meaningful.length > 0 ? meaningful : words;
  return source
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export type Motif = 'orbs' | 'stripes' | 'horizon';
const MOTIFS: readonly Motif[] = ['orbs', 'stripes', 'horizon'];

export interface Art {
  initials: string;
  motif: Motif;
  background: string;
  accent: string;
}

/** Deterministic cover art for a title: two related hues, a motif and initials. */
export function artFor(title: string): Art {
  const hash = hashString(title);
  const hue = hash % 360;
  const partner = (hue + 35 + ((hash >>> 9) % 90)) % 360;
  const angle = 110 + ((hash >>> 17) % 70);
  return {
    initials: initials(title),
    motif: MOTIFS[(hash >>> 4) % MOTIFS.length] ?? 'orbs',
    background: `linear-gradient(${String(angle)}deg, oklch(0.62 0.15 ${String(hue)}), oklch(0.32 0.11 ${String(partner)}))`,
    accent: `oklch(0.9 0.09 ${String(partner)})`,
  };
}
