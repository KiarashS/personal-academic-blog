import type { Element, Root } from 'hast';

export interface PostLinkOptions {
  /** Each published post's path, `/blog/some-post`, and its title. */
  titles: Map<string, string>;
  /** Paths of posts that exist but are not published: drafts, future-dated. */
  unpublished?: Set<string>;
  onWarn?: (message: string) => void;
}

/** `/blog/some-post/#method` -> `/blog/some-post`. */
const pathOf = (href: string): string => href.replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';

/**
 * A link to another post that writes its own text: `[](/blog/some-post)` reads
 * as that post's title, so the link says where it goes and keeps saying it
 * when the title changes. A section of the post can be named too,
 * `[](/blog/some-post#method)`, and the link still reads as the post's title.
 *
 * Only an empty link to a site path is touched. One to a path that is no post
 * reads "??" and the build says which; so does one to a draft or a post dated
 * in the future, which the published site will not have.
 */
export function rehypePostLinks(options: PostLinkOptions) {
  return (tree: Root) => {
    const walk = (node: Root | Element) => {
      for (const child of node.children) {
        if (child.type !== 'element') continue;
        const href = child.properties?.href;
        const empty = child.children.every((c) => c.type === 'text' && c.value.trim() === '');
        if (
          child.tagName === 'a' &&
          empty &&
          typeof href === 'string' &&
          href.startsWith('/') &&
          !href.startsWith('//')
        ) {
          const path = pathOf(href);
          const title = options.titles.get(path);
          if (title === undefined) {
            options.onWarn?.(
              options.unpublished?.has(path)
                ? `[](${href}) points at a post that is not published`
                : `[](${href}) points at no post`,
            );
          }
          child.children = [{ type: 'text', value: title ?? '??' }];
          const classes = child.properties.className;
          child.properties = {
            ...child.properties,
            className: [...(Array.isArray(classes) ? classes.map(String) : []), 'post-link'],
          };
          continue;
        }
        walk(child);
      }
    };
    walk(tree);
  };
}
