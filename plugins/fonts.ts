import type { Element, Root, RootContent } from 'hast';
import { FONT_NAMES, fontClass, sectionFont } from '../src/lib/fonts';

export interface SectionFontOptions {
  onWarn?: (message: string) => void;
}

/**
 * `font="garamond"` on an element becomes the class that sets it in that face
 * (`src/lib/fonts.ts`). `data-font` is read the same way, for an author who
 * prefers attributes the HTML spec knows.
 *
 * The attribute is taken off either way. A name the site does not have leaves
 * the passage in the body face, and the build says which names it does have,
 * rather than the reader getting text in whatever the browser falls back to.
 */
export function rehypeSectionFonts(options: SectionFontOptions = {}) {
  const warn = options.onWarn ?? (() => {});

  const visit = (nodes: RootContent[]) => {
    for (const node of nodes) {
      if (node.type !== 'element') continue;
      apply(node);
      visit(node.children);
    }
  };

  const apply = (node: Element) => {
    const props = node.properties;
    const written = props.font ?? props.dataFont;
    if (written === undefined) return;
    delete props.font;
    delete props.dataFont;
    const name = sectionFont(written);
    if (!name) {
      warn(
        `font="${String(written)}" is not a font this site has; the passage stays in the body ` +
          `face. The names are: ${FONT_NAMES.join(', ')}.`,
      );
      return;
    }
    const classes = Array.isArray(props.className) ? props.className : [];
    props.className = [...classes, fontClass(name)];
  };

  return (tree: Root) => {
    visit(tree.children);
  };
}
