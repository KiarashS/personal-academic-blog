import type { Blockquote, Paragraph, Parent, PhrasingContent, Root, RootContent } from 'mdast';

/**
 * A quotation with its source: a blockquote whose last paragraph starts with a
 * dash.
 *
 *     > The purpose of computing is insight, not numbers.
 *     >
 *     > — Richard Hamming, *Numerical Methods for Scientists and Engineers*
 *
 * becomes `<figure class="quote"><blockquote>…</blockquote>
 * <figcaption>Richard Hamming, <cite>Numerical Methods…</cite></figcaption>
 * </figure>`, the pattern HTML has for a quotation and its source: the source
 * is not part of what was said, so it stands outside the blockquote, and a
 * work's title in italics is marked as one. The dash may be an em dash, `--`
 * or `---`; the page draws its own.
 *
 * One that opens the post, before anything else, is an epigraph, set apart at
 * the head of the text as a book sets one under a chapter title. A blockquote
 * that is an alert, `> [!NOTE]`, is left to plugins/alerts.ts.
 */

const DASH = /^(?:—|―|---?)[ \t]*/;

/** The attribution, if the blockquote ends with one. */
function sourceOf(quote: Blockquote): Paragraph | undefined {
  const last = quote.children[quote.children.length - 1];
  if (quote.children.length < 2 || last?.type !== 'paragraph') return undefined;
  const first = last.children[0];
  return first?.type === 'text' && DASH.test(first.value) ? last : undefined;
}

const isAlert = (quote: Blockquote) => {
  const first = quote.children[0];
  return (
    first?.type === 'paragraph' &&
    first.children[0]?.type === 'text' &&
    /^\[![A-Za-z]+\]/.test(first.children[0].value)
  );
};

/** The source's words, the dash taken off and a title in italics cited. */
function sourceContent(source: Paragraph): PhrasingContent[] {
  return source.children
    .map((child, i): PhrasingContent => {
      if (i === 0 && child.type === 'text')
        return { ...child, value: child.value.replace(DASH, '') };
      if (child.type === 'emphasis') return { ...child, data: { ...child.data, hName: 'cite' } };
      return child;
    })
    .filter((child) => child.type !== 'text' || child.value !== '');
}

export function remarkQuotes() {
  return (tree: Root) => {
    // The first thing in the post that is not front matter or a definition.
    const opening = tree.children.find(
      (node) => !['yaml', 'definition', 'footnoteDefinition', 'html'].includes(node.type),
    );

    const walk = (parent: Parent) => {
      parent.children = parent.children.map((node): RootContent => {
        if (node.type !== 'blockquote') {
          if ('children' in node) walk(node);
          return node;
        }
        walk(node);
        const source = isAlert(node) ? undefined : sourceOf(node);
        if (!source) return node;
        const epigraph = node === opening;
        return {
          type: 'quoteFigure',
          data: {
            hName: 'figure',
            hProperties: { className: ['quote', ...(epigraph ? ['quote--epigraph'] : [])] },
          },
          children: [
            { ...node, children: node.children.slice(0, -1) },
            {
              type: 'quoteSource',
              data: { hName: 'figcaption', hProperties: { className: ['quote__source'] } },
              children: sourceContent(source),
            },
          ],
        } as unknown as RootContent;
      });
    };
    walk(tree);
  };
}
