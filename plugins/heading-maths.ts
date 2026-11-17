import type { Element, ElementContent, Root, Text } from 'hast';
import rehypeStringify from 'rehype-stringify';
import { toString } from 'hast-util-to-string';
import { unified } from 'unified';
import type { Heading } from '../src/lib/types';

/**
 * Maths in a heading: `## The loss $\mathcal{L}(w)$`.
 *
 * Three things read a heading's words, and each got the TeX instead of the
 * maths. Its id was made from the source, `the-loss-mathcallw`; the contents
 * list, the rail and the contents sheet showed "The loss \mathcal{L}(w)"; and a
 * reference to the section, `[](#…)`, read KaTeX's every layer at once, "The
 * loss L(w)\mathcal{L}(w)L(w)".
 *
 * `headingMathsOut` and `headingMathsBack` stand either side of rehype-slug:
 * while it runs, a heading's maths reads as the letters it draws, so the id is
 * `the-loss-lw`, and every heading without maths gets the id it always had.
 * `richHeadings`, after KaTeX, gives a heading that holds maths its rendered
 * markup for the contents (`Heading.html`) and words without the TeX for
 * everything that wants plain text.
 */

/** Commands that only style what they wrap: their name is not a word in the id. */
const STYLING =
  /\\(?:mathcal|mathbb|mathbf|mathrm|mathit|mathsf|mathtt|mathfrak|mathscr|boldsymbol|bm|operatorname|textrm|textbf|textit|text|hat|bar|tilde|vec|dot|ddot|widehat|widetilde|overline|underline|left|right|big|Big|bigg|Bigg)\b/g;

/** The words a piece of TeX draws, near enough for an id: `\alpha_t` is "alpha t". */
export function texWords(tex: string): string {
  return tex
    .replace(STYLING, ' ')
    .replace(/\\([a-zA-Z]+)/g, ' $1 ')
    .replace(/\\./g, ' ')
    .replace(/[{}]/g, '')
    .replace(/[\^_&$~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const HEADING = /^h[1-6]$/;

const classesOf = (node: Element): string[] => {
  const value = node.properties?.className;
  return Array.isArray(value) ? value.map(String) : [];
};

const isInlineMath = (node: Element) =>
  node.tagName === 'code' && classesOf(node).includes('math-inline');

const stashed = new WeakMap<Element, ElementContent[]>();

function eachHeading(tree: Root, visit: (heading: Element) => void) {
  const walk = (node: Root | Element) => {
    for (const child of node.children) {
      if (child.type !== 'element') continue;
      if (HEADING.test(child.tagName)) visit(child);
      else walk(child);
    }
  };
  walk(tree);
}

function eachMath(node: Element, visit: (math: Element) => void) {
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    if (isInlineMath(child)) visit(child);
    else eachMath(child, visit);
  }
}

/** Before rehype-slug: a heading's maths reads as its words. */
export function headingMathsOut() {
  return (tree: Root) => {
    eachHeading(tree, (heading) =>
      eachMath(heading, (math) => {
        stashed.set(math, math.children);
        const words: Text = { type: 'text', value: texWords(toString(math)) };
        math.children = [words];
      }),
    );
  };
}

/** After rehype-slug: the TeX back, for KaTeX. */
export function headingMathsBack() {
  return (tree: Root) => {
    eachHeading(tree, (heading) =>
      eachMath(heading, (math) => {
        const children = stashed.get(math);
        if (children) math.children = children;
      }),
    );
  };
}

/** A heading's content without the section number in front and the anchors after it. */
function shownContent(heading: Element): ElementContent[] {
  return heading.children.filter((child) => {
    if (child.type !== 'element') return true;
    const classes = classesOf(child);
    return !classes.includes('section-number') && !classes.some((name) => name.includes('anchor'));
  });
}

/** The words of rendered content, maths as it is drawn rather than its TeX or MathML. */
export function shownWords(content: ElementContent[]): string {
  const words = (node: ElementContent): string => {
    if (node.type === 'text') return node.value;
    if (node.type !== 'element') return '';
    const classes = classesOf(node);
    if (classes.includes('katex-mathml') || node.tagName === 'svg') return '';
    if (classes.some((name) => name.includes('anchor'))) return '';
    return node.children.map(words).join('');
  };
  return content.map(words).join('').replace(/\s+/g, ' ').trim();
}

const holdsMaths = (node: ElementContent): boolean =>
  node.type === 'element' && (classesOf(node).includes('katex') || node.children.some(holdsMaths));

const serialiser = unified().use(rehypeStringify);
const serialise = (content: ElementContent[]): string =>
  serialiser.stringify({ type: 'root', children: content }).trim();

/**
 * After KaTeX: the contents list's entry for a heading that holds maths gets
 * the heading's markup to show, and words without the TeX.
 */
export function richHeadings() {
  return (tree: Root, file: { data: Record<string, unknown> }) => {
    const headings = file.data.headings as Heading[] | undefined;
    if (!headings?.length) return;
    const byId = new Map(headings.map((heading) => [heading.id, heading]));
    eachHeading(tree, (element) => {
      const id = element.properties?.id;
      const heading = typeof id === 'string' ? byId.get(id) : undefined;
      if (!heading) return;
      const content = shownContent(element);
      if (!content.some(holdsMaths)) return;
      heading.text = shownWords(content);
      heading.html = serialise(content);
    });
  };
}

export { shownContent, holdsMaths };
