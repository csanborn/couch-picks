import { emptyFocusState, focusNode, move, reconcile, type Direction, type FocusNode, type FocusState } from './engine';

/** The parts of an element the store needs. HTMLElement satisfies it; tests use fakes. */
export interface FocusTarget {
  getBoundingClientRect(): { x: number; y: number; width: number; height: number };
  focus(options?: FocusOptions): void;
}

interface Entry {
  target: FocusTarget;
  row: string | undefined;
  scope: string;
}

interface ScopeFrame {
  scope: string;
  restoreId: string | null;
}

export const ROOT_SCOPE = 'root';

/**
 * Owns focus for the whole app. Keeps the engine state, a registry of
 * focusable elements and a stack of scopes (an overlay is its own scope).
 * Elements are measured only when a key is pressed, in one read pass.
 */
export class FocusStore {
  private state: FocusState = emptyFocusState;
  private readonly entries = new Map<string, Entry>();
  private readonly scopes: ScopeFrame[] = [{ scope: ROOT_SCOPE, restoreId: null }];
  private readonly listeners = new Set<() => void>();
  private pendingId: string | null = null;
  private reconcileQueued = false;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getFocusedId = (): string | null => this.state.focusedId;

  /**
   * The row that holds focus in the root scope, or null. While an overlay is
   * open this is the row focus will return to, so the screen behind stays put.
   */
  getFocusedRow = (): string | null => {
    const id = this.scopes[1] ? this.scopes[1].restoreId : this.state.focusedId;
    return (id && this.entries.get(id)?.row) ?? null;
  };

  /** The last focused id in `row`, even when focus has moved elsewhere. */
  getRemembered = (row: string): string | undefined => this.state.memory[row];

  private get activeScope(): string {
    return this.scopes[this.scopes.length - 1]?.scope ?? ROOT_SCOPE;
  }

  register(id: string, target: FocusTarget, options: { row?: string | undefined; scope?: string } = {}): () => void {
    const entry: Entry = { target, row: options.row, scope: options.scope ?? ROOT_SCOPE };
    this.entries.set(id, entry);
    const focusedEntry = this.state.focusedId ? this.entries.get(this.state.focusedId) : undefined;
    if (id === this.pendingId || (entry.scope === this.activeScope && focusedEntry?.scope !== this.activeScope)) {
      this.pendingId = null;
      this.focus(id);
    }
    return () => {
      if (this.entries.get(id) !== entry) return;
      this.entries.delete(id);
      if (id === this.state.focusedId) this.queueReconcile();
    };
  }

  /** Focuses `id` now if it is registered, or as soon as it registers. */
  focus(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) {
      this.pendingId = id;
      return;
    }
    this.apply(focusNode(this.state, { id, row: entry.row }));
  }

  /** Called when the DOM focus moved on its own (a click or Tab). */
  syncFromDom(id: string): void {
    if (id !== this.state.focusedId && this.entries.get(id)?.scope === this.activeScope) this.focus(id);
  }

  move(direction: Direction): void {
    this.apply(move(this.state, this.measure(), direction));
  }

  /** Clears row memory, for when the rows are replaced by new results. */
  forgetRows(): void {
    this.state = { ...this.state, memory: {} };
    this.emit();
  }

  /** Enters a new scope, remembering the current focus so popScope can restore it. */
  pushScope(scope: string): void {
    this.scopes.push({ scope, restoreId: this.state.focusedId });
    const first = [...this.entries].find(([, entry]) => entry.scope === scope);
    if (first) this.focus(first[0]);
  }

  popScope(): void {
    if (this.scopes.length <= 1) return;
    const frame = this.scopes.pop();
    if (frame?.restoreId && this.entries.has(frame.restoreId)) this.focus(frame.restoreId);
    else this.apply(reconcile({ ...this.state, focusedId: null }, this.measure()));
  }

  private measure(): FocusNode[] {
    const scope = this.activeScope;
    const nodes: FocusNode[] = [];
    for (const [id, entry] of this.entries) {
      if (entry.scope !== scope) continue;
      const { x, y, width, height } = entry.target.getBoundingClientRect();
      nodes.push({ id, row: entry.row, rect: { x, y, width, height } });
    }
    return nodes;
  }

  private queueReconcile(): void {
    if (this.reconcileQueued) return;
    this.reconcileQueued = true;
    queueMicrotask(() => {
      this.reconcileQueued = false;
      this.apply(reconcile(this.state, this.measure()));
    });
  }

  private apply(next: FocusState): void {
    if (next === this.state) return;
    const moved = next.focusedId !== this.state.focusedId;
    this.state = next;
    if (moved && next.focusedId) this.entries.get(next.focusedId)?.target.focus({ preventScroll: true });
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
