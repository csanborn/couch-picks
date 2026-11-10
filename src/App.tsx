import { useCallback, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import type { Pick, PicksResponse, Row } from '../shared/schema';
import { fetchPicks } from './api';
import { DETAIL_SCOPE, DetailOverlay } from './components/DetailOverlay';
import { MoodPrompt } from './components/MoodPrompt';
import { PickRow } from './components/PickRow';
import { Stage } from './components/Stage';
import { FocusContext, useFocusedRow, useRemoteKeys } from './focus/hooks';
import { FocusStore } from './focus/store';
import { HEADER_HEIGHT, ROW_STRIDE } from './layout';

type Results =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: PicksResponse }
  | { status: 'error'; message: string };

function StatusLine({ results }: { results: Exclude<Results, { status: 'ready' }> }) {
  const message =
    results.status === 'error'
      ? results.message
      : results.status === 'loading'
        ? 'Finding picks for you.'
        : 'Pick a mood above, or type your own.';
  return (
    <p className="status" role="status">
      {message}
    </p>
  );
}

/**
 * Holds the header and rows. The first row fits under the prompt; deeper rows
 * slide the column up so the focused row sits at the top.
 */
function Column({ children, rows }: { children: ReactNode; rows: readonly Row[] }) {
  const focusedRow = useFocusedRow();
  const rowIndex = rows.findIndex((row) => row.id === focusedRow);
  const offsetY = rowIndex < 1 ? 0 : HEADER_HEIGHT + rowIndex * ROW_STRIDE;
  return (
    <div className="column" style={{ transform: `translate3d(0, ${String(-offsetY)}px, 0)` }}>
      {children}
    </div>
  );
}

const NO_ROWS: readonly Row[] = [];

export function App() {
  const [store] = useState(() => new FocusStore());
  const [results, setResults] = useState<Results>({ status: 'idle' });
  const [detail, setDetail] = useState<Pick | null>(null);
  const request = useRef<AbortController | null>(null);

  const search = useCallback(
    (mood: string) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setResults({ status: 'loading' });
      fetchPicks(mood, controller.signal)
        .then((data) => {
          store.forgetRows();
          const first = data.rows[0]?.picks[0];
          if (first) store.focus(first.id);
          setResults({ status: 'ready', data });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setResults({ status: 'error', message: error instanceof Error ? error.message : 'Something went wrong.' });
        });
    },
    [store],
  );

  const openDetail = useCallback(
    (pick: Pick) => {
      store.pushScope(DETAIL_SCOPE);
      setDetail(pick);
    },
    [store],
  );

  const closeDetail = useCallback(() => {
    if (!detail) return;
    // The screen must stop being inert before focus can return to the card.
    flushSync(() => {
      setDetail(null);
    });
    store.popScope();
  }, [store, detail]);

  useRemoteKeys(store, closeDetail);

  const rows = results.status === 'ready' ? results.data.rows : NO_ROWS;
  const demo = results.status === 'ready' && results.data.source === 'demo';

  return (
    <FocusContext value={store}>
      <Stage>
        <main className="screen" inert={detail !== null}>
          <Column rows={rows}>
            <MoodPrompt onSearch={search} busy={results.status === 'loading'} />
            {results.status === 'ready' ? (
              rows.map((row) => <PickRow key={row.id} row={row} onOpen={openDetail} />)
            ) : (
              <StatusLine results={results} />
            )}
          </Column>
          {demo && (
            <p className="badge" title="No ANTHROPIC_API_KEY is set, so these picks are generated locally.">
              Demo data
            </p>
          )}
        </main>
        {detail && <DetailOverlay pick={detail} onClose={closeDetail} />}
      </Stage>
    </FocusContext>
  );
}
