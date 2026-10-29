import type { Element, ElementContent, Root } from 'hast';

/**
 * Keeps the punctuation after inline math on the formula's line.
 *
 * KaTeX draws an inline formula as a run of inline-block pieces, and a browser
 * may break a line between an inline block and the text after it, comma or
 * not. So `$p_i = \sigma(x_i^\top w)$, the loss` could leave the comma at the
 * start of the next line, by itself before "the loss"; Safari did so at most
 * widths. A word joiner in the text does not stop it: neither Safari nor
 * Chrome reads one at the edge of an inline block.
 *
 * What does: whether two things may be broken between is up to the
 * `white-space` of the nearest element that holds both. The formula and its
 * punctuation go into a `span.math-tie`, which does not wrap, and the formula
 * inside it wraps as before (prose.css), so a long formula can still break at
 * a relation, as KaTeX lets it; only the break before the comma is gone.
 *
 * Two more things for Safari, which also breaks where KaTeX's own boxes
 * close. The formula's last piece is drawn inline rather than as a block
 * (prose.css), so its end is text meeting text. And when that piece itself
 * ends in a block, a subscript's stack, a word joiner after it, inside the
 * piece, is the text the comma meets: U+2060 forbids a break either side of
 * it and is not drawn. It is in the drawing, which screen readers skip for
 * the MathML beside it, so nothing is read twice.
 */

/** What may not start a line after a formula: `, . ; : ! ? )` and the like. */
const CLOSING = /^[,.;:!?)\]}%'"\u2019\u201d\u2026]+/;

const JOINER = '\u2060';

const hasClass = (node: ElementContent | undefined, name: string): node is Element =>
  node?.type === 'element' &&
  Array.isArray(node.properties?.className) &&
  node.properties.className.includes(name);

/** The last of the pieces KaTeX breaks a formula into, `.katex-base`. */
function lastPiece(math: Element): Element | undefined {
  const drawing = math.children.find((child) => hasClass(child, 'katex-html'));
  if (drawing?.type !== 'element') return undefined;
  const last = drawing.children[drawing.children.length - 1];
  return hasClass(last, 'katex-base') ? last : undefined;
}

const isInlineMath = (node: Element): boolean => node.tagName === 'span' && hasClass(node, 'katex');

export function rehypeMathPunctuation() {
  return (tree: Root) => {
    const walk = (parent: Root | Element) => {
      const children = parent.children as ElementContent[];
      for (let index = 0; index < children.length; index += 1) {
        const node = children[index];
        if (node.type !== 'element') continue;
        // A display formula is a block of its own; nothing follows it on its line.
        if (hasClass(node, 'katex-display')) continue;
        if (!isInlineMath(node)) {
          walk(node);
          continue;
        }
        const next = children[index + 1];
        const closing = next?.type === 'text' ? CLOSING.exec(next.value)?.[0] : undefined;
        if (!next || next.type !== 'text' || !closing) continue;

        lastPiece(node)?.children.push({ type: 'text', value: JOINER });
        const tie: Element = {
          type: 'element',
          tagName: 'span',
          properties: { className: ['math-tie'] },
          children: [node, { type: 'text', value: closing }],
        };
        const rest = next.value.slice(closing.length);
        children.splice(index, 2, tie, ...(rest ? [{ type: 'text' as const, value: rest }] : []));
      }
    };
    walk(tree);
  };
}
