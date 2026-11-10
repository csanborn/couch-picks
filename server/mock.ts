import { hashString, seededRandom } from '../shared/hash.js';
import { PicksResponseSchema, type Pick, type PicksResponse, type Row } from '../shared/schema.js';

interface Theme {
  key: string;
  keywords: readonly string[];
  rowTitle: string;
  tags: readonly string[];
  words: readonly string[];
  blurbs: readonly string[];
}

const THEMES: readonly Theme[] = [
  {
    key: 'cozy',
    keywords: ['cozy', 'cosy', 'rain', 'sunday', 'warm', 'blanket', 'chill', 'relax', 'comfort', 'tea'],
    rowTitle: 'Blanket and tea comfort',
    tags: ['Warm', 'Gentle', 'Feel good', 'Slow burn'],
    words: ['Lantern', 'Kettle', 'Harbor', 'Quilt', 'Orchard', 'Window', 'Bakery', 'Garden'],
    blurbs: [
      'Low stakes and soft lighting. It asks nothing of you except a second cup of tea.',
      'A small town, a big heart and a soundtrack that sounds like rain on the roof.',
      'Gentle, funny and quietly moving. The kind of story that feels like a warm sweater.',
    ],
  },
  {
    key: 'family',
    keywords: ['kid', 'kids', 'child', 'year old', 'family', 'son', 'daughter', 'little'],
    rowTitle: 'Fun for the whole couch',
    tags: ['Family', 'Animated', 'Adventure', 'Silly'],
    words: ['Robot', 'Dragon', 'Treehouse', 'Comet', 'Pancake', 'Kite', 'Penguin', 'Rocket'],
    blurbs: [
      'Bright, fast and kind. Kids laugh at the jokes and grown ups laugh at the other jokes.',
      'A goofy quest with a real heart. Nothing scarier than a grumpy goose.',
      'Short episodes, big imagination and a lesson that never feels like homework.',
    ],
  },
  {
    key: 'laugh',
    keywords: ['funny', 'laugh', 'comedy', 'silly', 'goofy', 'hilarious'],
    rowTitle: 'Big laughs',
    tags: ['Comedy', 'Witty', 'Ensemble'],
    words: ['Disaster', 'Wedding', 'Roommates', 'Sandwich', 'Llama', 'Karaoke', 'Mixup', 'Weekend'],
    blurbs: [
      'Rapid fire jokes and a cast that clearly had too much fun making it.',
      'One bad decision snowballs into the best worst weekend imaginable.',
      'Dry, clever and full of lines you will be quoting tomorrow.',
    ],
  },
  {
    key: 'thrill',
    keywords: ['scary', 'tense', 'edge', 'thriller', 'horror', 'spooky', 'suspense', 'creepy'],
    rowTitle: 'Edge of your seat',
    tags: ['Thriller', 'Tense', 'Mystery'],
    words: ['Signal', 'Static', 'Cellar', 'Lighthouse', 'Witness', 'Fog', 'Hollow', 'Cipher'],
    blurbs: [
      'Tight, tense and over before you notice you forgot to breathe.',
      'Every quiet scene hides a clue. Keep the lights on for this one.',
      'A slow tightening knot of a story with a final turn you will not see coming.',
    ],
  },
  {
    key: 'smart',
    keywords: ['mind', 'smart', 'think', 'puzzle', 'twist', 'documentary', 'learn', 'science'],
    rowTitle: 'Big ideas, bigger twists',
    tags: ['Cerebral', 'Sci fi', 'Documentary', 'Twisty'],
    words: ['Paradox', 'Atlas', 'Orbit', 'Archive', 'Equation', 'Mirror', 'Signal', 'Prism'],
    blurbs: [
      'Clever without being smug. You will want to talk about it for an hour afterward.',
      'A puzzle box of a story that rewards paying close attention.',
      'Curious, surprising and full of ideas you will look up the next morning.',
    ],
  },
  {
    key: 'romance',
    keywords: ['date', 'love', 'romantic', 'romance', 'partner', 'anniversary'],
    rowTitle: 'Date night',
    tags: ['Romance', 'Charming', 'Comedy'],
    words: ['Postcard', 'Ferry', 'Vineyard', 'Letters', 'Balcony', 'Tango', 'Summer', 'Starlight'],
    blurbs: [
      'Two stubborn people, one beautiful city and a lot of very good banter.',
      'Sweet without being sugary, with chemistry you can feel through the screen.',
      'A love story that takes its time and earns every moment.',
    ],
  },
  {
    key: 'adventure',
    keywords: ['epic', 'adventure', 'action', 'quest', 'explore', 'journey'],
    rowTitle: 'Grand adventures',
    tags: ['Adventure', 'Epic', 'Action'],
    words: ['Summit', 'Compass', 'Expedition', 'Canyon', 'Voyage', 'Frontier', 'Storm', 'Crown'],
    blurbs: [
      'Huge landscapes, a ragtag crew and a map nobody should trust.',
      'Big, sweeping and fun, with set pieces made for the largest screen in the house.',
      'A road trip across impossible terrain that is really about friendship.',
    ],
  },
];

const FALLBACK_THEMES: readonly Theme[] = [
  {
    key: 'gems',
    keywords: [],
    rowTitle: 'Hidden gems',
    tags: ['Indie', 'Underrated', 'Drama'],
    words: ['Ember', 'Meridian', 'Paper', 'Willow', 'Echo', 'Saltwater', 'Velvet', 'Marigold'],
    blurbs: [
      'Small, sharp and beautifully made. A word of mouth favorite.',
      'The kind of find you recommend to everyone for the next month.',
      'Quiet confidence, great performances and an ending that lingers.',
    ],
  },
  {
    key: 'short',
    keywords: [],
    rowTitle: 'Short and sweet',
    tags: ['Under 90 minutes', 'Easy watch'],
    words: ['Sprint', 'Postscript', 'Afternoon', 'Spark', 'Detour', 'Matchbox', 'Ripple', 'Pocket'],
    blurbs: [
      'Done in under ninety minutes, and not a minute is wasted.',
      'A tidy, satisfying story for when you only have one episode of energy.',
      'Light, quick and exactly as long as it needs to be.',
    ],
  },
  {
    key: 'rewatch',
    keywords: [],
    rowTitle: 'Comfort rewatches',
    tags: ['Classic', 'Feel good'],
    words: ['Diner', 'Radio', 'Porch', 'Jukebox', 'Bicycle', 'Corner', 'Neighbors', 'Carousel'],
    blurbs: [
      'Familiar in the best way. Put it on and let it carry the evening.',
      'Characters that feel like old friends and jokes that still land.',
      'A sure thing when nobody can agree on anything else.',
    ],
  },
];

const TITLE_PATTERNS: readonly ((a: string, b: string) => string)[] = [
  (a) => `The ${a}`,
  (a, b) => `${a} and ${b}`,
  (a, b) => `The ${a} ${b}`,
  (a) => `${a} Season`,
  (a) => `After the ${a}`,
  (a) => `${a} for Two`,
  (a, b) => `${b} Over ${a}`,
];

const KIND_WEIGHTS = [
  ['Movie', 0.6],
  ['Series', 0.32],
  ['Special', 0.08],
] as const;

const PICKS_PER_ROW = 8;
const ROW_COUNT = 4;

function choose<T>(random: () => number, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('choose() needs a non-empty list');
  return item;
}

function chooseKind(random: () => number): Pick['kind'] {
  let roll = random();
  for (const [kind, weight] of KIND_WEIGHTS) {
    roll -= weight;
    if (roll < 0) return kind;
  }
  return 'Movie';
}

function themesFor(mood: string, random: () => number): Theme[] {
  const text = mood.toLowerCase();
  const matched = THEMES.filter((theme) => theme.keywords.some((word) => text.includes(word)));
  const rest = [...THEMES.filter((theme) => !matched.includes(theme)), ...FALLBACK_THEMES]
    .map((theme) => ({ theme, order: random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ theme }) => theme);
  return [...matched, ...rest].slice(0, ROW_COUNT);
}

function buildRow(theme: Theme, rowIndex: number, random: () => number, usedTitles: Set<string>): Row {
  const picks: Pick[] = [];
  let attempts = 0;
  while (picks.length < PICKS_PER_ROW && attempts < 200) {
    attempts++;
    const pattern = choose(random, TITLE_PATTERNS);
    const first = choose(random, theme.words);
    const second = choose(random, theme.words.filter((word) => word !== first));
    const title = pattern(first, second);
    if (usedTitles.has(title)) continue;
    usedTitles.add(title);
    const tagStart = Math.floor(random() * theme.tags.length);
    picks.push({
      id: `${theme.key}-${String(picks.length)}`,
      title,
      year: 1975 + Math.floor(random() * 51),
      kind: chooseKind(random),
      blurb: choose(random, theme.blurbs),
      tags: [theme.tags[tagStart], theme.tags[(tagStart + 1) % theme.tags.length]].filter(
        (tag): tag is string => tag !== undefined,
      ),
    });
  }
  return { id: `row-${String(rowIndex)}-${theme.key}`, title: theme.rowTitle, picks };
}

/** Deterministic demo rows: the same mood always produces the same picks. */
export function mockPicks(mood: string): PicksResponse {
  const random = seededRandom(hashString(mood.trim().toLowerCase()));
  const usedTitles = new Set<string>();
  const rows = themesFor(mood, random).map((theme, index) => buildRow(theme, index, random, usedTitles));
  return PicksResponseSchema.parse({ mood, source: 'demo', rows });
}
