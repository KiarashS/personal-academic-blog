import { EMOJI } from 'virtual:emoji-map';
import { SHORTCODE } from './shortcode';

/**
 * The text with every shortcode the build found swapped for its character.
 *
 * The table is `virtual:emoji-map`, which holds only the codes `news.ts` uses
 * rather than all 1,913 — see `plugins/emoji-content.ts`. A code added to an
 * entry is in the table on the next build, which is the same build that first
 * carries the entry, so the two can never be out of step.
 *
 * `table` is a parameter so this can be exercised without the build around it;
 * nothing passes it but the tests.
 */
export function emojify(text: string, table: Record<string, string> = EMOJI): string {
  if (!text.includes(':')) return text;
  // The pattern is shared with the build's scan and carries `g`, so its
  // `lastIndex` is state two callers could trip over. `replace` resets it
  // itself; this makes that independent of who ran last.
  SHORTCODE.lastIndex = 0;
  return text.replace(SHORTCODE, (whole, name: string) => table[name.toLowerCase()] ?? whole);
}
