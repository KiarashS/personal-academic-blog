import type { Element, ElementContent, Root } from 'hast';

/**
 * Typographer's quotes and dashes from the ones a keyboard types, the way TeX
 * reads them: `"` and `'` become “ ” and ‘ ’, `---` an em dash, `--` an en
 * dash, and `...` an ellipsis.
 *
 * Only prose. Code, maths, keyboard keys and anything inside an SVG keep every
 * character as written, since there a straight quote is syntax: `print('a')`
 * must stay pasteable. So do attributes, which nobody reads as type.
 *
 * Which way a quote turns depends on what is before it, and that can be in the
 * previous text node, `"*emphasis*"`, so the walk carries the last character
 * it has seen across nodes and elements, in reading order. Code counts as a
 * word for that purpose, so the quote after `` `x` `` closes.
 */

/** Elements whose text is never typography. */
const SKIP_TAGS = new Set([
  'code',
  'pre',
  'kbd',
  'samp',
  'script',
  'style',
  'svg',
  'textarea',
  'math',
]);

/** Classes of rendered maths and of blocks the build drew. */
const SKIP_CLASSES = ['katex', 'katex-display', 'math', 'mermaid', 'tikz', 'chart', 'algorithm'];

/** Before one of these, a quote opens. */
const OPENS_AFTER = /[\s([{—–‘“/]/;

/** `'tis`, `'90s`, `'em`: an apostrophe at the start of a word, not an opening quote. */
const ELISION = /^(?:\d\ds?\b|tis\b|twas\b|em\b|n\b|cause\b)/i;

function skipped(node: Element): boolean {
  if (SKIP_TAGS.has(node.tagName)) return true;
  const classes = node.properties?.className;
  const list = Array.isArray(classes) ? classes.map(String) : [];
  return list.some((name) => SKIP_CLASSES.includes(name));
}

export function smarten(text: string, before: string): string {
  let out = '';
  let prev = before;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const rest = text.slice(i + 1);
    let next = char;

    if (char === '-' && text.startsWith('---', i)) {
      next = '—';
      i += 2;
    } else if (char === '-' && text.startsWith('--', i)) {
      next = '–';
      i += 1;
    } else if (char === '.' && text.startsWith('...', i)) {
      next = '…';
      i += 2;
    } else if (char === '"') {
      next = prev === '' || OPENS_AFTER.test(prev) ? '“' : '”';
    } else if (char === "'") {
      const opening = (prev === '' || OPENS_AFTER.test(prev)) && !ELISION.test(rest);
      next = opening ? '‘' : '’';
    }

    out += next;
    prev = next;
  }
  return out;
}

export function rehypeSmartQuotes(options: { enabled: boolean }) {
  return (tree: Root) => {
    if (!options.enabled) return;
    // Start of the document reads as a space: a quote there opens.
    let prev = ' ';

    const walk = (node: Root | Element) => {
      for (const child of node.children as ElementContent[]) {
        if (child.type === 'text') {
          const text = child;
          text.value = smarten(text.value, prev);
          if (text.value) prev = text.value[text.value.length - 1];
        } else if (child.type === 'element') {
          if (skipped(child)) {
            // Code and maths read as a word: what follows them closes.
            prev = 'x';
            continue;
          }
          // A block starts a new run of text, so a quote at its start opens.
          if (BLOCKS.has(child.tagName)) prev = ' ';
          walk(child);
          if (BLOCKS.has(child.tagName)) prev = ' ';
        }
      }
    };

    walk(tree);
  };
}

const BLOCKS = new Set([
  'p',
  'li',
  'td',
  'th',
  'dt',
  'dd',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'figcaption',
  'summary',
  'div',
  'section',
  'figure',
  'br',
]);
