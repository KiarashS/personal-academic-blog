import { nameToEmoji } from 'gemoji';
import type { Root } from 'mdast';

/**
 * GitHub's shortcodes: `:rocket:` for 🚀.
 *
 * The names are `gemoji`'s, which is the list GitHub itself publishes — 1,913
 * of them, including the aliases people actually type (`:+1:`, `:tada:`). It is
 * a devDependency and stays one: markdown is compiled at build time, so the
 * table is read by the build and never reaches a reader's browser, where 36KB
 * of names would be a lot to ship for a decoration.
 */

/**
 * `:name:` where `name` is one gemoji knows. A pair of colons around anything
 * else is left exactly as written, which is what keeps `12:30:45`, a Windows
 * path and a `key: value` line in prose from being chewed on — the pattern
 * matches them, the lookup misses, and nothing is replaced.
 *
 * `+` and `-` are in the class for `:+1:` and `:-1:`.
 */
const SHORTCODE = /:([a-z0-9_+-]+):/gi;

/** The text with every shortcode gemoji recognises swapped for its character. */
export function emojify(text: string): string {
  if (!text.includes(':')) return text;
  return text.replace(SHORTCODE, (whole, name: string) => nameToEmoji[name.toLowerCase()] ?? whole);
}

/**
 * The same, over a parsed document.
 *
 * Only `text` nodes, which is the whole reason this runs on the tree rather
 * than over the file: in markdown a fenced block, an inline `code` span, a
 * link's target and a math span are each their own node type, so a shortcode
 * written inside one is left alone without this having to know what any of them
 * look like. A post explaining `:rocket:` can print it.
 */
/** Anything in the tree this walk needs to look at. */
interface Node {
  type: string;
  value?: string;
  children?: Node[];
}

export function remarkEmoji() {
  return (tree: Root) => {
    const walk = (node: Node) => {
      if (node.type === 'text' && typeof node.value === 'string') {
        node.value = emojify(node.value);
        return;
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}
