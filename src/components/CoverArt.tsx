import { memo } from 'react';
import { artFor } from '../art/art';

export const CoverArt = memo(function CoverArt({ title, large = false }: { title: string; large?: boolean }) {
  const art = artFor(title);
  return (
    <div
      className={large ? 'cover cover-large' : 'cover'}
      data-motif={art.motif}
      style={{ background: art.background, color: art.accent }}
      aria-hidden="true"
    >
      <span className="cover-motif" />
      <span className="cover-initials">{art.initials}</span>
    </div>
  );
});
