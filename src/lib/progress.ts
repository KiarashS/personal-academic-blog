export interface ProgressInput {
  /** Distance from the top of the document to the top of the article. */
  top: number;
  /** The article's own height. */
  height: number;
  scrollY: number;
  viewport: number;
}

/**
 * How far the reader is through the article, from 0 to 1.
 *
 * The measure is the bottom of the viewport against the end of the article, so
 * it reaches 1 when the last line is on screen rather than when the article's
 * top has scrolled a full article-height away. An article shorter than the
 * viewport is finished the moment it is on screen, and reports 1.
 */
export function readingProgress({ top, height, scrollY, viewport }: ProgressInput): number {
  const distance = height - viewport;
  if (distance <= 0) return scrollY + viewport >= top + height ? 1 : 0;
  return Math.min(1, Math.max(0, (scrollY - top) / distance));
}

/** How far past the header's edge the decision is held, so it cannot flicker. */
const EXIT_BAND = 24;

/**
 * Whether the way out of a post is shown, given whether it was a moment ago.
 *
 * One rule: the header has gone. It is not sticky, so scrolling takes the
 * site's name, its nav and the link back to the blog off the screen together,
 * and that is the moment there is no way back that is not a scroll.
 *
 * This briefly also hid the pair while the reader was scrolling down, to keep
 * it off the prose on a narrow screen. That is reading — it is what a reader
 * is doing almost the whole time they are on the page — so the pair was
 * missing exactly when it was wanted, which is the thing it was moved earlier
 * to fix. Being always there and small enough to ignore beats being correct
 * about the pixels underneath it; the width of the pair is what gives on a
 * phone instead, in CSS.
 *
 * The band is what keeps it from blinking. Without it a reader parked on the
 * boundary flips the pair on and off with every small scroll, and it animates
 * as it arrives, so each flip is a movement at the edge of the eye.
 */
export function exitShown(shown: boolean, headerBottom: number, scrollY: number): boolean {
  return scrollY > headerBottom + (shown ? -EXIT_BAND : EXIT_BAND);
}
