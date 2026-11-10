import { memo } from 'react';
import type { Pick, Row } from '../../shared/schema';
import { useRemembered } from '../focus/hooks';
import { trackOffset } from '../focus/scroll';
import { TRACK } from '../layout';
import { PickCard } from './PickCard';

interface PickRowProps {
  row: Row;
  onOpen: (pick: Pick) => void;
}

/** Re-renders only when its own remembered column changes; cards are memoized. */
export const PickRow = memo(function PickRow({ row, onOpen }: PickRowProps) {
  const remembered = useRemembered(row.id);
  const index = Math.max(
    0,
    row.picks.findIndex((pick) => pick.id === remembered),
  );
  const offset = trackOffset(index, row.picks.length, TRACK);
  const headingId = `${row.id}-title`;
  return (
    <section className="row" aria-labelledby={headingId}>
      <h2 className="row-title" id={headingId}>
        {row.title}
      </h2>
      <div className="row-viewport">
        <div
          className="row-track"
          data-track-offset={offset}
          style={{ transform: `translate3d(${String(-offset)}px, 0, 0)` }}
        >
          {row.picks.map((pick) => (
            <PickCard key={pick.id} pick={pick} rowId={row.id} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </section>
  );
});
