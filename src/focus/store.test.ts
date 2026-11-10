import { describe, expect, it, vi } from 'vitest';
import { FocusStore, type FocusTarget } from './store';

function target(x: number, y: number, width = 100, height = 60) {
  const focus = vi.fn<FocusTarget['focus']>();
  return { rect: () => ({ x, y, width, height }), focus };
}

const flushMicrotasks = () => Promise.resolve();

describe('FocusStore', () => {
  it('focuses the first element registered in the active scope', () => {
    const store = new FocusStore();
    const first = target(0, 0);
    store.register('first', first);
    store.register('second', target(200, 0));
    expect(store.getFocusedId()).toBe('first');
    expect(first.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('moves between registered elements and notifies subscribers', () => {
    const store = new FocusStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.register('a', target(0, 0), { row: 'r' });
    store.register('b', target(200, 0), { row: 'r' });
    store.move('right');
    expect(store.getFocusedId()).toBe('b');
    expect(store.getRemembered('r')).toBe('b');
    expect(store.getFocusedRow()).toBe('r');
    expect(listener).toHaveBeenCalled();
  });

  it('focuses a pending id as soon as it registers', () => {
    const store = new FocusStore();
    store.register('input', target(0, 0));
    store.focus('card');
    expect(store.getFocusedId()).toBe('input');
    store.register('card', target(0, 200), { row: 'r' });
    expect(store.getFocusedId()).toBe('card');
  });

  it('recovers focus when the focused element unregisters', async () => {
    const store = new FocusStore();
    store.register('a', target(0, 0), { row: 'r' });
    const unregisterB = store.register('b', target(200, 0), { row: 'r' });
    store.focus('b');
    unregisterB();
    await flushMicrotasks();
    expect(store.getFocusedId()).toBe('a');
  });

  it('opens a scope and restores the previous focus when it closes', () => {
    const store = new FocusStore();
    store.register('a', target(0, 0), { row: 'r' });
    const b = target(200, 0);
    store.register('b', b, { row: 'r' });
    store.move('right');

    store.pushScope('detail');
    const unregisterClose = store.register('close', target(500, 500), { scope: 'detail' });
    expect(store.getFocusedId()).toBe('close');
    expect(store.getFocusedRow()).toBe('r');

    store.move('left');
    expect(store.getFocusedId()).toBe('close');

    store.popScope();
    unregisterClose();
    expect(store.getFocusedId()).toBe('b');
    expect(b.focus).toHaveBeenLastCalledWith({ preventScroll: true });
  });

  it('ignores DOM focus from elements outside the active scope', () => {
    const store = new FocusStore();
    store.register('a', target(0, 0));
    store.pushScope('detail');
    store.register('close', target(0, 300), { scope: 'detail' });
    store.syncFromDom('a');
    expect(store.getFocusedId()).toBe('close');
  });

  it('forgets row memory for new results', () => {
    const store = new FocusStore();
    store.register('a', target(0, 0), { row: 'r' });
    expect(store.getRemembered('r')).toBe('a');
    store.forgetRows();
    expect(store.getRemembered('r')).toBeUndefined();
  });
});
