import type { Element, ElementContent, Root, RootContent } from 'hast';
import { toString } from 'hast-util-to-string';
import type { EquationNumbering } from '../src/site.config';

/** `\label{key}` anywhere in the TeX of a display equation. */
const LABEL = /\\label\s*\{\s*([^}]+?)\s*\}/g;

/** `\notag` or `\nonumber`: leave this one display out of the count. */
const NOTAG = /\\(?:notag|nonumber)(?![A-Za-z])/g;

/** A `\tag{…}` the author wrote, which is the number they want shown. */
const TAG = /\\tag\*?\s*\{([^}]*)\}/;

/** `\eqref{key}` in prose, which is where a reference to an equation is written. */
const EQREF = /\\eqref\s*\{\s*([^}]+?)\s*\}/g;

/** Elements whose text is not prose, so a reference inside them is left alone. */
const VERBATIM = new Set(['code', 'pre', 'script', 'style']);

export interface EquationOptions {
  /** Defaults to `labelled`; the site passes its own setting. */
  numbering?: EquationNumbering;
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

const isDisplayMath = (node: RootContent): boolean =>
  isElement(node) && classesOf(node).includes('math-display');

/**
 * The element holding the TeX of a display equation, given the block it sits
 * in. remark-math emits block math as `pre > code.math-display`, and
 * rehype-katex replaces the whole `pre` when it renders it — so the block to
 * wrap is the `pre`, and the TeX to rewrite is the `code` inside it. Anything
 * put between the two is left behind for the code-block plugin to find, which
 * dresses the equation in a copy button.
 */
function displayMathIn(block: Element): Element | undefined {
  if (isDisplayMath(block)) return block;
  if (block.tagName !== 'pre') return undefined;
  return block.children.find((child): child is Element => isDisplayMath(child));
}

/**
 * The id of a numbered equation nobody labelled, so a reader can still link to
 * it. A different prefix from `equationId`, so a label written as `3` cannot
 * collide with the third equation.
 */
const numberId = (count: number): string => `equation-${count}`;

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
  return `${bare(tex)}\n\\tag{${count}}`;
}

/** The TeX with the markers this plugin reads taken out, which KaTeX would not accept. */
const bare = (tex: string): string => tex.replace(LABEL, '').replace(NOTAG, '').trimEnd();

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
 * With `numbering: 'all'`, every display equation is numbered, so a reader can
 * point at one in a comment as they would in a paper, and `\label` only names
 * an equation for `\eqref`. `\notag` or `\nonumber` leaves one out, and a
 * `\tag{…}` the author wrote is kept and not counted. With `'labelled'`, only a
 * labelled equation is numbered.
 *
 * This runs before `rehype-katex`, which renders whatever TeX it is given, so
 * the `\tag` reaches KaTeX as an ordinary part of the equation.
 */
export function rehypeEquations(options: EquationOptions = {}) {
  const warn = options.onWarn ?? (() => {});

  return (tree: Root) => {
    // What a reference to each label shows: its number, or the author's tag.
    const numbers = new Map<string, string>();
    const numberAll = options.numbering === 'all';
    let count = 0;

    // First pass: number the equations, so a reference written above the
    // equation it points at still resolves.
    const number = (parent: Root | Element) => {
      const children = 'children' in parent ? parent.children : [];

      for (let index = 0; index < children.length; index += 1) {
        const block = children[index];
        if (!isElement(block)) continue;

        const node = displayMathIn(block);
        if (!node) {
          number(block);
          continue;
        }

        const tex = toString(node);
        const keys = [...tex.matchAll(LABEL)].map((match) => match[1]);
        const [key] = keys;
        const skipped = NOTAG.test(tex);
        NOTAG.lastIndex = 0;
        const own = TAG.exec(tex)?.[1];

        if (keys.length > 1) {
          warn(`equation labelled "${key}" carries ${keys.length} labels; using the first`);
        }
        const duplicate = key !== undefined && numbers.has(key);
        if (duplicate) {
          warn(`two equations are labelled "${key}"; references will point at the first`);
        }

        // What this equation shows, and what a reference to it reads.
        let shown: string | undefined;
        if (own !== undefined) {
          node.children = [{ type: 'text', value: bare(tex) }];
          shown = own;
        } else if (skipped) {
          node.children = [{ type: 'text', value: bare(tex) }];
          if (key !== undefined) {
            warn(
              `equation labelled "${key}" is marked \\notag, so references to it have no number`,
            );
            shown = '?';
          }
        } else if (numberAll || key !== undefined) {
          count += 1;
          node.children = [{ type: 'text', value: numbered(tex, count) }];
          shown = String(count);
        } else {
          continue;
        }

        const named = key !== undefined && !duplicate;
        if (named) numbers.set(key, shown ?? '?');

        // The id goes on a wrapper outside the block, not on the math itself:
        // rehype-katex replaces what it renders, and the id would go with it.
        // An equation with neither a label nor a number of its own has no
        // name to be reached by, so it is left as it is.
        const id = named
          ? equationId(key)
          : own === undefined && !skipped
            ? numberId(count)
            : undefined;
        if (id === undefined) continue;
        children[index] = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['equation'], id },
          children: [block],
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
        children: [{ type: 'text', value: `(${known ?? '?'})` }],
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
