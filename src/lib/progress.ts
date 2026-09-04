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
