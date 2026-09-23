import { siteConfig } from '../site.config';
import type { ContentsConfig } from '../site.config';

/** Whether the rail is rendered at all. Narrow windows hide it in CSS. */
export function railShown(contents: ContentsConfig = siteConfig.contents): boolean {
  return contents.wide !== 'inline';
}

/**
 * Whether the collapsed list stays put on a wide screen. It is always in the
 * document — it is the one a narrow window gets, and the one a reader with no
 * JavaScript gets — so this only decides whether CSS takes it away above 80rem.
 */
export function inlineKeptWhenWide(contents: ContentsConfig = siteConfig.contents): boolean {
  return contents.wide !== 'rail';
}

/** A heading as the rail measures it: its id and its distance down the page. */
export interface HeadingBox {
  id: string;
  top: number;
}

export interface Viewport {
  scrollY: number;
  viewport: number;
  /** The full scrollable height of the document. */
  documentHeight: number;
}

/**
 * How far below the top of the window a heading counts as reached. Roughly the
 * height of the site header plus a line, so a heading marks itself as you
 * arrive at it rather than as it leaves.
 */
const MARKER = 96;

/**
 * Which heading the reader is in, or nothing if they are still above the first
 * one.
 *
 * Nothing is the honest answer for the opening paragraphs: a post that runs
 * six hundred pixels of prose before its first `##` is not in that section,
 * and marking it there would tell a reader they had missed something.
 *
 * The last heading is a special case, and the one every scroll-spy gets wrong.
 * A heading near the end of the document can never reach the marker — there is
 * not enough page left below it to scroll it that far — so it would stay unlit
 * however far the reader read. Reaching the bottom of the document means being
 * in the last section, whatever the arithmetic says.
 */
export function currentHeading(
  headings: HeadingBox[],
  { scrollY, viewport, documentHeight }: Viewport,
): string | undefined {
  if (headings.length === 0) return undefined;

  // A pixel of slack: fractional zoom and device pixel ratios mean the sum
  // rarely lands exactly on the document height.
  if (scrollY + viewport >= documentHeight - 1) return headings[headings.length - 1].id;

  let current: string | undefined;
  for (const heading of headings) {
    if (heading.top > scrollY + MARKER) break;
    current = heading.id;
  }
  return current;
}
