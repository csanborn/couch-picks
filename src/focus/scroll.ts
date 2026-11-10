export interface TrackMetrics {
  /** Width of one item plus the gap after it. */
  stride: number;
  gap: number;
  viewport: number;
  /** Items kept visible before the focused one, so the row reads as scrollable. */
  lead: number;
}

/**
 * Horizontal offset (in px, to translate the track left by) that keeps item
 * `index` in view. The track never scrolls past its first or last item.
 */
export function trackOffset(index: number, count: number, metrics: TrackMetrics): number {
  if (count <= 0 || index <= 0) return 0;
  const contentWidth = count * metrics.stride - metrics.gap;
  const maxOffset = Math.max(0, contentWidth - metrics.viewport);
  const wanted = (Math.min(index, count - 1) - metrics.lead) * metrics.stride;
  return Math.min(maxOffset, Math.max(0, wanted));
}
