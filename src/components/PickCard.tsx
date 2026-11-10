import { memo } from 'react';
import type { Pick } from '../../shared/schema';
import { useFocusable } from '../focus/hooks';
import { CoverArt } from './CoverArt';

interface PickCardProps {
  pick: Pick;
  rowId: string;
  onOpen: (pick: Pick) => void;
}

export const PickCard = memo(function PickCard({ pick, rowId, onOpen }: PickCardProps) {
  const focusable = useFocusable(pick.id, { row: rowId });
  return (
    <button
      type="button"
      className="card"
      {...focusable}
      onClick={() => {
        onOpen(pick);
      }}
    >
      <CoverArt title={pick.title} />
      <span className="card-text">
        <span className="card-title">{pick.title}</span>
        <span className="card-meta">
          {pick.year} · {pick.kind}
        </span>
        <span className="card-blurb">{pick.blurb}</span>
      </span>
    </button>
  );
});
