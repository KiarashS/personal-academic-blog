import type { Element, Root, RootContent } from 'hast';

export interface FeatureLinkOptions {
  /** Paths whose feature is switched off, so nothing answers on them. */
  disabled: string[];
  onWarn?: (message: string) => void;
}

function isElement(node: RootContent): node is Element {
  return node.type === 'element';
}

/** `/contact/` and `/contact` are the same page; the empty path is the root. */
const normalise = (href: string): string => href.replace(/\/+$/, '') || '/';

/**
 * Unwraps a link to a page a feature flag has switched off, keeping the words.
 *
 * Prose is written once and the flags move under it. `home.md` points at the
 * contact page; turn `contact` off and that link goes nowhere, which
 * `npm run links` rightly fails the build over — a reader would have got a 404.
 * Dropping the anchor and keeping its text leaves the sentence readable and the
 * build green, and the warning says which line to revisit.
 *
 * Only paths a flag explains are treated this way. A link to a page that simply
 * does not exist is a mistake, and still fails the check.
 */
export function rehypeFeatureLinks(options: FeatureLinkOptions) {
  const disabled = new Set(options.disabled.map(normalise));
  const warn = options.onWarn ?? (() => {});

  return (tree: Root) => {
    if (disabled.size === 0) return;

    const walk = (parent: Root | Element) => {
      const children = 'children' in parent ? parent.children : [];

      for (let index = 0; index < children.length; index += 1) {
        const node = children[index];
        if (!isElement(node)) continue;

        const href = typeof node.properties?.href === 'string' ? node.properties.href : '';
        if (node.tagName === 'a' && href.startsWith('/') && disabled.has(normalise(href))) {
          warn(`link to ${normalise(href)} was dropped: that page's feature is off`);
          children.splice(index, 1, ...node.children);
          index -= 1;
          continue;
        }

        walk(node);
      }
    };

    walk(tree);
  };
}
