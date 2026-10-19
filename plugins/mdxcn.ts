import type { Element, ElementContent, Root, RootContent } from 'hast';
import { MDXCN_COMPONENTS, type MdxcnName } from '../src/mdxcn/names';

/*
 * mdxcn components in Markdown (https://mdxcn.dev), written as mdxcn writes
 * them in MDX: the tag, a blank line, Markdown, a blank line, the closing tag.
 *
 *     <GraphTimeline title="NIGHT">
 *
 *     - 14:02: p95 crossed 800ms
 *     - **14:11: rolled back the cache flag**
 *
 *     </GraphTimeline>
 *
 * CommonMark passes the two tags through as HTML and parses what is between
 * them, and rehype-raw then reads the lot as one element. The HTML parser
 * lowercases tag and attribute names, which is why both are matched without
 * case here.
 *
 * Each becomes an `<mdxcn-figure>` naming the component and its props, with
 * the Markdown children as ordinary HTML inside it. That light DOM is what a
 * feed reader shows, and what a page shows before any script and in a browser
 * without declarative shadow DOM. The prerenderer draws the figure into a
 * shadow root on the element (`src/mdxcn/server.tsx`) and the browser brings
 * it to life (`src/mdxcn/client.tsx`); a shadow root with no slot hides the
 * light DOM, so the reader sees one or the other and never both.
 *
 * The children are taken out of the tree here and put back at the end
 * (`rehypeMdxcnRestore`), so the rest of the pipeline never sees them. The
 * components parse their Markdown from the raw elements: a fence must reach
 * Terminal as a `pre`, not as highlighted spans in copy-button chrome, and a
 * `### question` in Faq must not get an id, an anchor and a place in the
 * contents list. The cost is that maths inside a figure is not rendered.
 */

const BY_LOWER = new Map(
  (Object.keys(MDXCN_COMPONENTS) as MdxcnName[]).map((name) => [name.toLowerCase(), name]),
);

/** The four props with capitals in them, as the HTML parser leaves them. */
const CAMEL: Record<string, string> = {
  class: 'className',
  classname: 'className',
  fromlabel: 'fromLabel',
  tolabel: 'toLabel',
  weekstartson: 'weekStartsOn',
};

const NUMERIC = new Set([
  'height',
  'max',
  'month',
  'progress',
  'size',
  'total',
  'weekStartsOn',
  'year',
]);

/**
 * An attribute as the prop it stands for. HTML has strings and nothing else,
 * so `[…]` and `{…}` are read as JSON, `true` and `false` and a bare
 * attribute as booleans, and the props that are numbers as numbers.
 */
export function propValue(name: string, value: unknown): unknown {
  if (Array.isArray(value)) value = value.join(' ');
  if (value === '' || value === true) return true;
  if (typeof value !== 'string') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^[[{]/.test(value.trim())) {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
  if (NUMERIC.has(name) && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
  return value;
}

/** hast's property names back to the attribute names the author wrote. */
function attributeName(property: string): string {
  if (property === 'className') return 'class';
  return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export interface MdxcnOptions {
  onWarn?: (message: string) => void;
}

const FIGURE = 'mdxcn-figure';
const STASH = 'mdxcnChildren';

export function rehypeMdxcn(options: MdxcnOptions = {}) {
  const warn = options.onWarn ?? (() => {});

  // Numbered in document order, for the prefix React gives the ids inside
  // each figure: every figure is a root of its own, and two roots both start
  // at the same first id.
  let count = 0;

  const replace = (node: Element, name: MdxcnName) => {
    const props: Record<string, unknown> = {};
    for (const [property, value] of Object.entries(node.properties)) {
      const written = attributeName(property);
      const prop = CAMEL[written.replace(/-/g, '')] ?? written;
      props[prop] = propValue(prop, value);
    }
    const children = node.children;
    for (const inner of nested(children)) {
      warn(`<${inner}> inside <${name}> is not drawn; a figure cannot hold another.`);
    }
    node.tagName = FIGURE;
    count += 1;
    node.properties = {
      dataComponent: name,
      dataProps: JSON.stringify(props),
      dataFigure: String(count),
    };
    node.children = [];
    node.data = { ...node.data, [STASH]: children } as Element['data'];
  };

  const walk = (nodes: RootContent[] | ElementContent[]) => {
    for (const node of nodes) {
      if (node.type !== 'element') continue;
      const name = BY_LOWER.get(node.tagName);
      if (name) replace(node, name);
      else walk(node.children);
    }
  };

  return (tree: Root) => {
    count = 0;
    walk(tree.children);
  };
}

function nested(nodes: ElementContent[]): string[] {
  const found: string[] = [];
  for (const node of nodes) {
    if (node.type !== 'element') continue;
    const name = BY_LOWER.get(node.tagName);
    if (name) found.push(name);
    found.push(...nested(node.children));
  }
  return found;
}

/** The children `rehypeMdxcn` set aside, back inside their figures. */
export function rehypeMdxcnRestore() {
  const walk = (nodes: RootContent[] | ElementContent[]) => {
    for (const node of nodes) {
      if (node.type !== 'element') continue;
      const stashed = (node.data as Record<string, unknown> | undefined)?.[STASH];
      if (node.tagName === FIGURE && Array.isArray(stashed)) {
        node.children = stashed as ElementContent[];
        continue;
      }
      walk(node.children);
    }
  };
  return (tree: Root) => {
    walk(tree.children);
  };
}
