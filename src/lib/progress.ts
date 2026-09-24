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

/** Movement small enough to be a jitter rather than a change of mind. */
const EXIT_STEP = 8;

export interface ExitInput {
  /** Distance from the top of the document to the bottom of the header. */
  headerBottom: number;
  scrollY: number;
  /** Where the last measurement found it. */
  previous: number;
  /** Whether there is any page left below. */
  atBottom: boolean;
}

/**
 * Whether the way out of a post is shown, given whether it was a moment ago.
 *
 * Two rules, and the second is the one a phone needs. The header is not
 * sticky, so scrolling takes the site's name, its nav and the link back to the
 * blog off the screen together; while any of that is visible the pair repeats
 * what is already there, so it stays away.
 *
 * Past that it follows the direction of travel: gone while the reader is going
 * down the page, back as soon as they come up. A fixed control over a column
 * that fills the window covers words, and on a 390px screen the pair sat on
 * the last line of every paragraph it passed. There is no arrangement of a
 * corner that avoids that — the column is the whole width — so the answer is
 * to be absent while there is reading going on, which is also when nobody is
 * looking for the way out. At the bottom it shows regardless: there is no more
 * scrolling down to do, and that is where the decision to leave gets made.
 */
export function exitShown(was: boolean, input: ExitInput): boolean {
  const { headerBottom, scrollY, previous, atBottom } = input;
  if (scrollY <= headerBottom + (was ? -EXIT_BAND : EXIT_BAND)) return false;
  if (atBottom) return true;

  const moved = scrollY - previous;
  if (moved > EXIT_STEP) return false;
  if (moved < -EXIT_STEP) return true;
  return was;
}
