import type { Pick } from '../../shared/schema';
import { useFocusable } from '../focus/hooks';
import { CoverArt } from './CoverArt';

export const DETAIL_SCOPE = 'detail';

export function DetailOverlay({ pick, onClose }: { pick: Pick; onClose: () => void }) {
  const close = useFocusable('detail-close', { scope: DETAIL_SCOPE });
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="detail">
        <CoverArt title={pick.title} large />
        <div className="detail-body">
          <p className="detail-meta">
            {pick.kind} · {pick.year}
          </p>
          <h2 className="detail-title" id="detail-title">
            {pick.title}
          </h2>
          <p className="detail-why">
            <span className="detail-why-label">Why it fits</span>
            {pick.blurb}
          </p>
          {pick.tags.length > 0 && (
            <ul className="tags" aria-label="Tags">
              {pick.tags.map((tag) => (
                <li key={tag} className="tag">
                  {tag}
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="detail-close" {...close} onClick={onClose}>
            Back to picks
          </button>
        </div>
      </div>
    </div>
  );
}
