import type { Rect } from './engine';

/**
 * An element's box from layout values (`offset*`), which ignore transforms.
 * A sliding row, the stage scale or a focus zoom in mid-animation can never
 * skew it, so fast key presses land where the UI is heading, not where it is.
 * Inside a scrolling track the track's target offset (`data-track-offset`) is
 * subtracted, since the track is moved with a transform.
 */
export function layoutRect(element: HTMLElement): Rect {
  let x = 0;
  let y = 0;
  for (let node: Element | null = element; node instanceof HTMLElement; node = node.offsetParent) {
    x += node.offsetLeft;
    y += node.offsetTop;
  }
  const track = element.closest<HTMLElement>('[data-track-offset]');
  if (track) x -= Number(track.dataset.trackOffset);
  return { x, y, width: element.offsetWidth, height: element.offsetHeight };
}
