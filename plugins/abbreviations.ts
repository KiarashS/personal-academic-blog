import type { Parent, Root, RootContent, Text } from 'mdast';

/**
 * Abbreviations, defined once and marked wherever they are used:
 *
 *     *[MCMC]: Markov chain Monte Carlo
 *
 * on a line of its own, anywhere in the post (the syntax of PHP Markdown Extra
 * and Pandoc). The line is taken out, and every MCMC in the post, and MCMCs
 * too, becomes `<abbr title="Markov chain Monte Carlo">MCMC</abbr>`.
 *
 * The title shows on hover, which a phone has no way to do, so the first use
 * in the text is also spelled out where it stands, "Markov chain Monte Carlo
 * (MCMC)", as a paper does; unless it already is, written out by hand just
 * before it. A heading marks it but does not count as the first use: a
 * heading is read out of order, in the contents and in search.
 *
 * Code, maths, raw HTML and link addresses are left alone, and so is a word
 * that only contains the abbreviation: MCMC in MCMC-based is marked, in
 * NMCMC it is not.
 */

const DEFINITION = /^\*\[([^\]\n]+)\]:[ \t]*(\S.*)$/;

/** Nodes whose text is not prose to be marked. */
const VERBATIM = new Set([
  'code',
  'inlineCode',
  'math',
  'inlineMath',
  'html',
  'yaml',
  'definition',
]);

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface AbbreviationOptions {
  onWarn?: (message: string) => void;
}

/** A paragraph's text, if it is nothing but text. */
const plainText = (node: RootContent): string | undefined =>
  node.type === 'paragraph' && node.children.every((child) => child.type === 'text')
    ? node.children.map((child) => child.value).join('')
    : undefined;

export function remarkAbbreviations(options: AbbreviationOptions = {}) {
  return (tree: Root) => {
    const terms = new Map<string, string>();

    // Take the definitions out: paragraphs whose every line is one.
    const strip = (parent: Parent) => {
      parent.children = parent.children.filter((node): boolean => {
        const text = plainText(node);
        if (text !== undefined) {
          const lines = text.split('\n');
          const found = lines.map((line) => DEFINITION.exec(line.trim()));
          if (found.every(Boolean)) {
            for (const match of found) terms.set(match![1].trim(), match![2].trim());
            return false;
          }
        }
        if ('children' in node && node.type !== 'paragraph') strip(node);
        return true;
      });
    };
    strip(tree);
    if (terms.size === 0) return;

    // Longest first, so an abbreviation inside a longer one is not taken first.
    const names = [...terms.keys()].sort((a, b) => b.length - a.length);
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}_])(${names.map(escape).join('|')})(s?)(?![\\p{L}\\p{N}_])`,
      'gu',
    );
    const used = new Set<string>();
    const seen = new Set<string>();

    const mark = (node: Text, inHeading: boolean): RootContent[] => {
      const out: RootContent[] = [];
      let last = 0;
      for (const match of node.value.matchAll(pattern)) {
        const [whole, name] = match;
        const at = match.index;
        const title = terms.get(name)!;
        let before = node.value.slice(last, at);
        seen.add(name);
        const first = !inHeading && !used.has(name);
        if (!inHeading) used.add(name);
        // Spelled out at its first use, unless the text before already is.
        const spelled = new RegExp(`${escape(title)}\\s*\\($`, 'i').test(before);
        if (first && !spelled) before += `${title} (`;
        if (before) out.push({ type: 'text', value: before });
        out.push({
          type: 'text',
          value: whole,
          data: { hName: 'abbr', hProperties: { title } },
        });
        last = at + whole.length;
        if (first && !spelled) {
          out.push({ type: 'text', value: ')' });
        }
      }
      if (out.length === 0) return [node];
      const rest = node.value.slice(last);
      if (rest) out.push({ type: 'text', value: rest });
      return out;
    };

    const walk = (parent: Parent, inHeading: boolean) => {
      const next: RootContent[] = [];
      for (const node of parent.children) {
        if (VERBATIM.has(node.type)) {
          next.push(node);
        } else if (node.type === 'text' && !node.data) {
          next.push(...mark(node, inHeading));
        } else {
          if ('children' in node) walk(node, inHeading || node.type === 'heading');
          next.push(node);
        }
      }
      parent.children = next;
    };
    walk(tree, false);

    for (const name of terms.keys()) {
      if (!seen.has(name)) options.onWarn?.(`the abbreviation ${name} is defined but not used`);
    }
  };
}
