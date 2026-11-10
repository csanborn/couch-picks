/**
 * Spatial focus engine. Pure functions over plain rectangles: no DOM, no React.
 * The caller measures focusable elements, asks for the next state and applies it.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FocusNode {
  id: string;
  rect: Rect;
  /** Nodes that share a row remember which of them was focused last. */
  row?: string | undefined;
}

export interface FocusState {
  focusedId: string | null;
  /** Last focused node id per row. */
  memory: Readonly<Record<string, string>>;
}

export const emptyFocusState: FocusState = { focusedId: null, memory: {} };

/** Weight of drift across the axis of travel, relative to distance along it. */
const CROSS_WEIGHT = 2;
const EPSILON = 0.5;

const isHorizontal = (direction: Direction) => direction === 'left' || direction === 'right';

function center(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function projectionsOverlap(a: Rect, b: Rect, horizontalTravel: boolean): boolean {
  return horizontalTravel
    ? a.y < b.y + b.height && b.y < a.y + a.height
    : a.x < b.x + b.width && b.x < a.x + a.width;
}

/** Edge gap along the direction of travel (0 when the rectangles overlap) plus weighted center drift. */
function score(from: Rect, to: Rect, direction: Direction): number {
  const a = center(from);
  const b = center(to);
  let gap: number;
  switch (direction) {
    case 'right':
      gap = to.x - (from.x + from.width);
      break;
    case 'left':
      gap = from.x - (to.x + to.width);
      break;
    case 'down':
      gap = to.y - (from.y + from.height);
      break;
    case 'up':
      gap = from.y - (to.y + to.height);
      break;
  }
  const drift = isHorizontal(direction) ? Math.abs(b.y - a.y) : Math.abs(b.x - a.x);
  return Math.max(0, gap) + CROSS_WEIGHT * drift;
}

function liesInDirection(from: Rect, to: Rect, direction: Direction): boolean {
  const a = center(from);
  const b = center(to);
  switch (direction) {
    case 'right':
      return b.x > a.x + EPSILON;
    case 'left':
      return b.x < a.x - EPSILON;
    case 'down':
      return b.y > a.y + EPSILON;
    case 'up':
      return b.y < a.y - EPSILON;
  }
}

/**
 * The nearest node in `direction` from `from`. Nodes that overlap the source's
 * band (same row for left and right, same column for up and down) win over
 * nodes outside it. Left and right only ever consider the band, so the end of a
 * row is a hard edge instead of a jump to a diagonal neighbor.
 */
export function findNearest(
  from: FocusNode,
  nodes: readonly FocusNode[],
  direction: Direction,
): FocusNode | null {
  const horizontal = isHorizontal(direction);
  let best: { node: FocusNode; inBand: boolean; score: number } | null = null;
  for (const node of nodes) {
    if (node.id === from.id || !liesInDirection(from.rect, node.rect, direction)) continue;
    const inBand = projectionsOverlap(from.rect, node.rect, horizontal);
    if (horizontal && !inBand) continue;
    const candidate = { node, inBand, score: score(from.rect, node.rect, direction) };
    if (
      !best ||
      (candidate.inBand && !best.inBand) ||
      (candidate.inBand === best.inBand && candidate.score < best.score)
    ) {
      best = candidate;
    }
  }
  return best?.node ?? null;
}

/** Focuses `node` and records it as its row's last focused node. */
export function focusNode(state: FocusState, node: Pick<FocusNode, 'id' | 'row'>): FocusState {
  if (state.focusedId === node.id && (!node.row || state.memory[node.row] === node.id)) return state;
  return {
    focusedId: node.id,
    memory: node.row ? { ...state.memory, [node.row]: node.id } : state.memory,
  };
}

/** Top-most, then left-most node. */
export function firstNode(nodes: readonly FocusNode[]): FocusNode | null {
  let first: FocusNode | null = null;
  for (const node of nodes) {
    if (
      !first ||
      node.rect.y < first.rect.y - EPSILON ||
      (Math.abs(node.rect.y - first.rect.y) <= EPSILON && node.rect.x < first.rect.x)
    ) {
      first = node;
    }
  }
  return first;
}

/**
 * Makes sure focus points at a node that exists. If the focused node is gone,
 * focus moves to the first node of the row it was in, else the first node overall.
 */
export function reconcile(state: FocusState, nodes: readonly FocusNode[]): FocusState {
  if (state.focusedId !== null && nodes.some((node) => node.id === state.focusedId)) return state;
  const lostRow = Object.keys(state.memory).find((row) => state.memory[row] === state.focusedId);
  const fallback = firstNode(lostRow ? nodes.filter((node) => node.row === lostRow) : []) ?? firstNode(nodes);
  if (!fallback) return state.focusedId === null ? state : { ...state, focusedId: null };
  return focusNode(state, fallback);
}

/**
 * Moves focus one step. Entering a different row lands on that row's
 * remembered node when it still exists, otherwise on the geometric nearest.
 * At an edge the state is returned unchanged.
 */
export function move(state: FocusState, nodes: readonly FocusNode[], direction: Direction): FocusState {
  const current = nodes.find((node) => node.id === state.focusedId);
  if (!current) return reconcile(state, nodes);
  const nearest = findNearest(current, nodes, direction);
  if (!nearest) return state;
  let target = nearest;
  if (nearest.row && nearest.row !== current.row) {
    const rememberedId = state.memory[nearest.row];
    target = nodes.find((node) => node.id === rememberedId) ?? nearest;
  }
  return focusNode(state, target);
}
