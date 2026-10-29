import type { Element, ElementContent, Root, RootContent } from 'hast';

/**
 * References that write themselves. A link with no text to something the post
 * numbers or names fills in what that thing is called:
 *
 *     As [](#fig-architecture) shows, and [](#thm-bayes) proves, …
 *
 * reads "As Figure 2 shows, and Theorem 1 proves", each a link, and stays
 * right when a figure is added above. It covers every block this site numbers,
 * each of which marks itself with `data-ref-label` as it is numbered: figures,
 * tables, listings, notebooks, algorithms, theorem-like blocks, and equations,
 * which read "(3)" as `\eqref` does. A link to a heading reads the heading.
 *
 * A link with text of its own is left as written. A link with no text to a name
 * the post does not have reads "??", the way LaTeX marks a reference it could
 * not resolve, and the build says which name it was.
 *
 * Runs last, once every number is settled, and takes the markers off again.
 */

function isElement(node: RootContent | ElementContent | undefined): node is Element {
  return node?.type === 'element';
}

const HEADINGS = new Set(['h2', 'h3', 'h4', 'h5', 'h6']);

/** A heading's words, without the permalink and other furniture inside it. */
function headingText(node: Element): string {
  const words = (child: ElementContent): string => {
    if (child.type === 'text') return child.value;
    if (child.type !== 'element') return '';
    const classes = child.properties?.className;
    const list = Array.isArray(classes) ? classes.map(String) : [];
    if (child.tagName === 'svg' || list.some((name) => name.includes('anchor'))) return '';
    return child.children.map(words).join('');
  };
  return node.children.map(words).join('').replace(/\s+/g, ' ').trim();
}

export interface CrossRefOptions {
  onWarn?: (message: string) => void;
}

export function rehypeCrossRefs(options: CrossRefOptions = {}) {
  return (tree: Root) => {
    const labels = new Map<string, string>();

    const collect = (node: Root | Element) => {
      for (const child of node.children) {
        if (!isElement(child)) continue;
        const props = child.properties ?? {};
        const id = typeof props.id === 'string' ? props.id : undefined;
        if (id && typeof props.dataRefLabel === 'string' && !labels.has(id)) {
          labels.set(id, props.dataRefLabel);
        } else if (id && HEADINGS.has(child.tagName) && !labels.has(id)) {
          labels.set(id, headingText(child));
        }
        delete props.dataRefLabel;
        collect(child);
      }
    };

    // Inside a `summary` a reference is written as text: the summary is
    // itself the control that opens its section, and a link in it would be a
    // control inside a control, which a keyboard and a screen reader cannot
    // tell apart from the one around it.
    const fill = (node: Root | Element, inSummary = false) => {
      for (const child of node.children) {
        if (!isElement(child)) continue;
        const href = child.properties?.href;
        const empty = child.children.every((c) => c.type === 'text' && c.value.trim() === '');
        // A code callout is an empty link by design: its number is drawn.
        const classes = child.properties?.className;
        const callout = Array.isArray(classes) && classes.includes('code-callout');
        if (
          child.tagName === 'a' &&
          typeof href === 'string' &&
          href.startsWith('#') &&
          empty &&
          !callout
        ) {
          const id = decodeURIComponent(href.slice(1));
          const label = labels.get(id);
          if (label === undefined)
            options.onWarn?.(`[](#${id}) points at nothing named "${id}" in this post`);
          child.children = [{ type: 'text', value: label ?? '??' }];
          child.properties = {
            ...child.properties,
            className: [...(Array.isArray(classes) ? classes.map(String) : []), 'xref'],
          };
          if (inSummary) {
            child.tagName = 'span';
            delete child.properties.href;
          }
          continue;
        }
        fill(child, inSummary || child.tagName === 'summary');
      }
    };

    collect(tree);
    fill(tree);
  };
}
