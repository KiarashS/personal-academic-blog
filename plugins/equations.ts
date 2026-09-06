import type { Element, ElementContent, Root, RootContent } from 'hast';
import { toString } from 'hast-util-to-string';

/** `\label{key}` anywhere in the TeX of a display equation. */
const LABEL = /\\label\s*\{\s*([^}]+?)\s*\}/g;

/** `\eqref{key}` in prose, which is where a reference to an equation is written. */
const EQREF = /\\eqref\s*\{\s*([^}]+?)\s*\}/g;

/** Elements whose text is not prose, so a reference inside them is left alone. */
const VERBATIM = new Set(['code', 'pre', 'script', 'style']);

export interface EquationOptions {
  /** Called once per problem, so the build can report it against the file. */
  onWarn?: (message: string) => void;
}

function isElement(node: RootContent, tagName?: string): node is Element {
  return node.type === 'element' && (!tagName || node.tagName === tagName);
}

function classesOf(node: Element): string[] {
  const classes = node.properties?.className;
  const list = Array.isArray(classes) ? classes.map(String) : [String(classes ?? '')];
  return list.filter(Boolean);
}

const isDisplayMath = (node: RootContent): node is Element =>
  isElement(node) && classesOf(node).includes('math-display');

/** The id an equation is reachable at, and what `\eqref` points to. */
export const equationId = (key: string): string =>
  `eq-${key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;

/**
 * Numbers a display equation and hands KaTeX the tag to render. `\tag` has to
 * sit at the top level of the math, so it goes on the end rather than where the
 * label was: an equation whose body is a `\begin{aligned}` block would reject a
 * tag inside the environment.
 */
function numbered(tex: string, count: number): string {
  return `${tex.replace(LABEL, '').trimEnd()}\n\\tag{${count}}`;
}

/**
 * Equation numbers, and references to them that stay right when an equation is
 * inserted above. An author writes the LaTeX they would write anywhere else:
 *
 *     $$
 *     p(\theta \mid y) = \frac{p(y \mid \theta) p(\theta)}{p(y)}
 *     \label{bayes}
 *     $$
 *
 *     Substituting \eqref{bayes} into the likelihood …
 *
 * Only a labelled equation is numbered. A post can carry a dozen throwaway
 * lines of display math, and numbering all of them would leave the reader
 * counting past equations nothing refers to.
 *
 * This runs before `rehype-katex`, which renders whatever TeX it is given, so
 * the `\tag` reaches KaTeX as an ordinary part of the equation.
 */
export function rehypeEquations(options: EquationOptions = {}) {
  const warn = options.onWarn ?? (() => {});

  return (tree: Root) => {
    const numbers = new Map<string, number>();
    let count = 0;

    // First pass: number the labelled equations, so a reference written above
    // the equation it points at still resolves.
    const number = (parent: Root | Element) => {
      const children = 'children' in parent ? parent.children : [];

      for (let index = 0; index < children.length; index += 1) {
        const node = children[index];
        if (!isElement(node)) continue;
        if (!isDisplayMath(node)) {
          number(node);
          continue;
        }

        const tex = toString(node);
        const keys = [...tex.matchAll(LABEL)].map((match) => match[1]);
        if (keys.length === 0) continue;

        const [key] = keys;
        if (keys.length > 1) {
          warn(`equation labelled "${key}" carries ${keys.length} labels; using the first`);
        }
        if (numbers.has(key)) {
          warn(`two equations are labelled "${key}"; references will point at the first`);
          node.children = [{ type: 'text', value: numbered(tex, numbers.get(key) ?? 0) }];
          continue;
        }

        count += 1;
        numbers.set(key, count);
        node.children = [{ type: 'text', value: numbered(tex, count) }];
        // The id goes on a wrapper, not on the math itself: rehype-katex
        // replaces the element it renders, and the id would go with it.
        children[index] = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['equation'], id: equationId(key) },
          children: [node],
        };
      }
    };

    // Second pass: turn each `\eqref{key}` in the prose into a link carrying
    // the number, which is the form a reader expects to click.
    const link = (key: string): Element => {
      const known = numbers.get(key);
      if (known === undefined) warn(`\\eqref{${key}} has no equation labelled "${key}"`);
      return {
        type: 'element',
        tagName: 'a',
        properties: { className: ['eqref'], href: `#${equationId(key)}` },
        children: [{ type: 'text', value: known === undefined ? '(?)' : `(${known})` }],
      };
    };

    const resolve = (parent: Root | Element) => {
      const children = 'children' in parent ? parent.children : [];
      const rebuilt: RootContent[] = [];
      let changed = false;

      for (const node of children) {
        if (isElement(node)) {
          if (!VERBATIM.has(node.tagName) && !classesOf(node).some((c) => c.startsWith('math'))) {
            resolve(node);
          }
          rebuilt.push(node);
          continue;
        }

        if (node.type !== 'text' || !node.value.includes('\\eqref')) {
          rebuilt.push(node);
          continue;
        }

        changed = true;
        let last = 0;
        for (const match of node.value.matchAll(EQREF)) {
          const at = match.index;
          if (at > last) rebuilt.push({ type: 'text', value: node.value.slice(last, at) });
          rebuilt.push(link(match[1]));
          last = at + match[0].length;
        }
        if (last < node.value.length) {
          rebuilt.push({ type: 'text', value: node.value.slice(last) });
        }
      }

      if (!changed) return;
      if (parent.type === 'root') {
        parent.children = rebuilt;
      } else {
        // A doctype cannot occur inside compiled Markdown, so this drops
        // nothing; it is how the two child types are told apart.
        parent.children = rebuilt.filter((node): node is ElementContent => node.type !== 'doctype');
      }
    };

    number(tree);
    resolve(tree);
  };
}
