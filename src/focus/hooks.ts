import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import type { Direction } from './engine';
import { layoutRect } from './measure';
import { ROOT_SCOPE, type FocusStore } from './store';
import { emptyWheelState, wheelStep } from './wheel';

export const FocusContext = createContext<FocusStore | null>(null);

function useFocusStore(): FocusStore {
  const store = useContext(FocusContext);
  if (!store) throw new Error('useFocusStore needs a FocusContext provider');
  return store;
}

/**
 * Registers an element with the focus engine. Focus styling is plain CSS
 * (`:focus`), so a focus move re-renders nothing here.
 */
export function useFocusable(id: string, options: { row?: string; scope?: string } = {}) {
  const store = useFocusStore();
  const { row, scope = ROOT_SCOPE } = options;
  const ref = useCallback(
    (element: HTMLElement | null) =>
      element
        ? store.register(
            id,
            {
              rect: () => layoutRect(element),
              focus: (focusOptions) => {
                element.focus(focusOptions);
              },
            },
            { row, scope },
          )
        : undefined,
    [store, id, row, scope],
  );
  const onFocus = useCallback(() => {
    store.syncFromDom(id);
  }, [store, id]);
  return { ref, onFocus, 'data-focus-id': id };
}

export function useRemembered(row: string): string | undefined {
  const store = useFocusStore();
  return useSyncExternalStore(store.subscribe, () => store.getRemembered(row));
}

export function useFocusedRow(): string | null {
  const store = useFocusStore();
  return useSyncExternalStore(store.subscribe, store.getFocusedRow);
}

const ARROWS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack']);

function isTextField(element: Element | null): boolean {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}

/**
 * The remote: arrows move focus, Back keys call `onBack`. Enter is left to the
 * browser, which clicks the focused button or submits the focused form. Inside
 * a text field, left, right and Backspace keep their editing meaning.
 */
export function useRemoteKeys(store: FocusStore, onBack: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const inTextField = isTextField(document.activeElement);
      const direction = ARROWS[event.key];
      if (direction) {
        if (inTextField && (direction === 'left' || direction === 'right')) return;
        event.preventDefault();
        store.move(direction);
      } else if (BACK_KEYS.has(event.key) && !(inTextField && event.key === 'Backspace')) {
        event.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [store, onBack]);
}

/**
 * Mouse wheel and two-finger trackpad scrolling move focus like the arrows.
 * The default is blocked so a sideways swipe never triggers browser back.
 * Ctrl+wheel (pinch zoom) is left alone.
 */
export function useWheelNavigation(store: FocusStore): void {
  useEffect(() => {
    let state = emptyWheelState;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      const step = wheelStep(state, event);
      state = step.state;
      if (!step.direction) return;
      if (isTextField(document.activeElement) && (step.direction === 'left' || step.direction === 'right')) return;
      store.move(step.direction);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
    };
  }, [store]);
}
