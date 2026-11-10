import { describe, expect, it } from 'vitest';
import { emptyFocusState, findNearest, firstNode, move, reconcile, type FocusNode, type FocusState } from './engine';

const CARD = { width: 100, height: 60, gap: 20, rowGap: 40 };

/** A row of cards starting at `x`, laid out left to right. */
function row(rowId: string, rowIndex: number, count: number, x = 0): FocusNode[] {
  return Array.from({ length: count }, (_, column) => ({
    id: `${rowId}-${String(column)}`,
    row: rowId,
    rect: {
      x: x + column * (CARD.width + CARD.gap),
      y: rowIndex * (CARD.height + CARD.rowGap),
      width: CARD.width,
      height: CARD.height,
    },
  }));
}

function node(id: string, x: number, y: number, width = CARD.width, height = CARD.height, rowId?: string): FocusNode {
  return { id, row: rowId, rect: { x, y, width, height } };
}

function at(id: string, memory: Record<string, string> = {}): FocusState {
  return { focusedId: id, memory };
}

function byId(nodes: readonly FocusNode[], id: string): FocusNode {
  const found = nodes.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no node ${id}`);
  return found;
}

const grid = [...row('a', 0, 5), ...row('b', 1, 5), ...row('c', 2, 5)];

describe('findNearest', () => {
  it('moves one step in each direction on a grid', () => {
    const from = byId(grid, 'b-2');
    expect(findNearest(from, grid, 'right')?.id).toBe('b-3');
    expect(findNearest(from, grid, 'left')?.id).toBe('b-1');
    expect(findNearest(from, grid, 'up')?.id).toBe('a-2');
    expect(findNearest(from, grid, 'down')?.id).toBe('c-2');
  });

  it('returns null at every edge', () => {
    expect(findNearest(byId(grid, 'a-0'), grid, 'up')).toBeNull();
    expect(findNearest(byId(grid, 'a-0'), grid, 'left')).toBeNull();
    expect(findNearest(byId(grid, 'c-4'), grid, 'down')).toBeNull();
    expect(findNearest(byId(grid, 'c-4'), grid, 'right')).toBeNull();
  });

  it('does not jump to another row when moving right past the end of a row', () => {
    const nodes = [...row('short', 0, 2), ...row('long', 1, 6)];
    expect(findNearest(byId(nodes, 'short-1'), nodes, 'right')).toBeNull();
  });

  it('prefers a node in the same column over a closer diagonal one', () => {
    const from = node('from', 0, 0);
    const below = node('below', 0, 300);
    const diagonal = node('diagonal', 150, 80);
    expect(findNearest(from, [from, below, diagonal], 'down')?.id).toBe('below');
  });

  it('falls back to the nearest out of band node when nothing is directly above or below', () => {
    const from = node('from', 800, 300);
    const left = node('left', 0, 0);
    const middle = node('middle', 300, 0);
    expect(findNearest(from, [from, left, middle], 'up')?.id).toBe('middle');
  });

  it('weights drift across the axis more than distance along it', () => {
    const from = node('from', 0, 0, 100, 100);
    const far = node('far', 200, 0, 100, 100);
    const nearButHigh = node('nearButHigh', 150, 60, 100, 100);
    expect(findNearest(from, [from, far, nearButHigh], 'right')?.id).toBe('far');
  });

  it('treats overlapping rectangles (a scaled focused card) as zero gap', () => {
    const from = node('from', 0, 0, 112, 60);
    const next = node('next', 106, 0, 100, 60);
    expect(findNearest(from, [from, next], 'right')?.id).toBe('next');
  });

  it('chooses the chip under a wide text field by horizontal center', () => {
    const input = node('input', 0, 0, 1000, 80);
    const chips = [node('chip-0', 0, 120, 200, 60), node('chip-1', 400, 120, 200, 60), node('chip-2', 800, 120, 200, 60)];
    expect(findNearest(input, [input, ...chips], 'down')?.id).toBe('chip-1');
  });
});

describe('move', () => {
  it('records the focused node as its row memory', () => {
    const next = move(at('a-0'), grid, 'right');
    expect(next).toEqual({ focusedId: 'a-1', memory: { a: 'a-1' } });
  });

  it('returns the same state object at an edge', () => {
    const state = at('a-0', { a: 'a-0' });
    expect(move(state, grid, 'up')).toBe(state);
  });

  it('restores the remembered column when entering a row again', () => {
    let state = at('a-0');
    state = move(state, grid, 'down'); // b-0
    state = move(state, grid, 'right'); // b-1
    state = move(state, grid, 'right'); // b-2
    state = move(state, grid, 'up'); // a-2
    expect(state.focusedId).toBe('a-2');
    state = move(state, grid, 'left'); // a-1
    state = move(state, grid, 'down');
    expect(state.focusedId).toBe('b-2');
  });

  it('remembers a column even when that row is scrolled so the card sits elsewhere', () => {
    const scrolled = [...row('a', 0, 5), ...row('b', 1, 5, -360)];
    const state = move(at('a-0', { b: 'b-4' }), scrolled, 'down');
    expect(state.focusedId).toBe('b-4');
  });

  it('ignores a remembered node that no longer exists', () => {
    const state = move(at('a-1', { b: 'gone' }), grid, 'down');
    expect(state.focusedId).toBe('b-1');
  });

  it('uses geometry, not memory, when moving within the same row', () => {
    const state = move(at('a-1', { a: 'a-1' }), grid, 'right');
    expect(state.focusedId).toBe('a-2');
  });

  it('skips over an empty row because it has no nodes', () => {
    const nodes = [...row('a', 0, 3), ...row('empty', 1, 0), ...row('c', 2, 3)];
    expect(move(at('a-1'), nodes, 'down').focusedId).toBe('c-1');
  });

  it('works for nodes without a row and never writes them to memory', () => {
    const input = node('input', 0, 0, 100, 60);
    const nodes = [input, ...row('a', 1, 3)];
    const down = move(at('input'), nodes, 'down');
    expect(down.focusedId).toBe('a-0');
    const up = move(down, nodes, 'up');
    expect(up).toEqual({ focusedId: 'input', memory: { a: 'a-0' } });
  });

  it('recovers when the focused node is missing', () => {
    expect(move(at('missing'), grid, 'right').focusedId).toBe('a-0');
  });

  it('focuses nothing when there are no nodes', () => {
    expect(move(emptyFocusState, [], 'down')).toBe(emptyFocusState);
  });
});

describe('reconcile', () => {
  it('keeps a focused node that still exists', () => {
    const state = at('b-3');
    expect(reconcile(state, grid)).toBe(state);
  });

  it('falls back to the first node of the row that lost focus', () => {
    const withoutB3 = grid.filter((candidate) => candidate.id !== 'b-3');
    expect(reconcile(at('b-3', { b: 'b-3' }), withoutB3).focusedId).toBe('b-0');
  });

  it('falls back to the first node overall when the whole row is gone', () => {
    const withoutB = grid.filter((candidate) => candidate.row !== 'b');
    expect(reconcile(at('b-3', { b: 'b-3' }), withoutB).focusedId).toBe('a-0');
  });

  it('focuses the first node when nothing is focused yet', () => {
    expect(reconcile(emptyFocusState, grid).focusedId).toBe('a-0');
  });

  it('clears focus only when nothing is focusable', () => {
    expect(reconcile(at('a-0'), [])).toEqual({ focusedId: null, memory: {} });
    expect(reconcile(emptyFocusState, [])).toBe(emptyFocusState);
  });
});

describe('firstNode', () => {
  it('picks the top row, then the left-most node', () => {
    const nodes = [node('right', 300, 0), node('below', 0, 200), node('left', 100, 0)];
    expect(firstNode(nodes)?.id).toBe('left');
    expect(firstNode([])).toBeNull();
  });
});
