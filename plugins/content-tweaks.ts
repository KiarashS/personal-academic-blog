import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';

function isExternal(href: unknown): boolean {
  return typeof href === 'string' && /^https?:\/\//.test(href);
}

/** A site-absolute link written by hand in Markdown, e.g. /papers/x.pdf */
function isSiteAbsolute(href: unknown): href is string {
  return typeof href === 'string' && href.startsWith('/') && !href.startsWith('//');
}

const MEDIA = new Set(['video', 'audio', 'iframe', 'picture']);

/**
 * The single media element in a paragraph that holds nothing else. CommonMark
 * has no block-level rule for `<video>`, so one written on its own line in
 * Markdown arrives wrapped in a `<p>`.
 */
function loneMedia(paragraph: Element): Element | undefined {
  let found: Element | undefined;
  for (const child of paragraph.children) {
    if (child.type === 'text') {
      if (child.value.trim()) return undefined;
      continue;
    }
    if (child.type !== 'element' || found || !MEDIA.has(child.tagName)) return undefined;
    found = child;
  }
  return found;
}

export interface ContentTweakOptions {
  /** Deployment base path, prefixed onto site-absolute link targets. */
  base: string;
}

/**
 * What the build does to the finished tree: wide tables scroll inside their own
 * box rather than pushing the page sideways, media written by hand comes out of
 * the paragraph Markdown wrapped it in, links off the site open in a new tab,
 * and site-absolute links and media sources written in Markdown pick up the
 * deployment's base path.
 */
export function rehypeContentTweaks(options: ContentTweakOptions) {
  const base = options.base.replace(/\/$/, '');

  /** Media typed into Markdown needs the base path the router adds elsewhere. */
  const prefixSrc = (node: Element) => {
    if (!base || !(MEDIA.has(node.tagName) || node.tagName === 'source')) return;
    const { src } = node.properties ?? {};
    if (isSiteAbsolute(src) && !src.startsWith(`${base}/`)) {
      node.properties = { ...node.properties, src: `${base}${src}` };
    }
  };

  return (tree: Root) => {
    const walk = (node: Root | Element) => {
      const children = 'children' in node ? node.children : [];
      children.forEach((child, index) => {
        if (child.type !== 'element') return;

        // A figure cannot live inside a `<p>`, and the caption step needs the
        // media element to be a sibling of the paragraph carrying its caption.
        if (child.tagName === 'p') {
          const media = loneMedia(child);
          if (media) {
            children[index] = media;
            prefixSrc(media);
            walk(media);
            return;
          }
        }

        prefixSrc(child);

        if (child.tagName === 'table') {
          children[index] = {
            type: 'element',
            tagName: 'div',
            properties: { className: ['table-wrap'] },
            children: [child],
          };
          return;
        }

        // GFM renders task lists as bare checkboxes, which have no label.
        if (child.tagName === 'li') {
          const box = child.children.find(
            (grandchild): grandchild is Element =>
              grandchild.type === 'element' &&
              grandchild.tagName === 'input' &&
              grandchild.properties?.type === 'checkbox',
          );
          if (box) {
            box.properties = { ...box.properties, 'aria-label': toString(child).trim() || 'Item' };
          }
        }

        if (child.tagName === 'a' && isExternal(child.properties?.href)) {
          child.properties = {
            ...child.properties,
            target: '_blank',
            rel: ['noopener', 'noreferrer'],
          };
        }

        // Router links already carry the base; one typed into Markdown does
        // not, and would 404 on a deployment served from a subdirectory.
        if (base && child.tagName === 'a' && isSiteAbsolute(child.properties?.href)) {
          const { href } = child.properties;
          if (!href.startsWith(`${base}/`)) {
            child.properties = { ...child.properties, href: `${base}${href}` };
          }
        }

        walk(child);
      });
    };
    walk(tree);
  };
}
