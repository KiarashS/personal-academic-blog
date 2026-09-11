import type { Element, Root, RootContent, Text } from 'hast';

/**
 * GitHub's alert syntax: a blockquote whose first line is `[!NOTE]`.
 *
 *     > [!WARNING]
 *     > Something that could cause problems if ignored.
 *
 * The appeal of the syntax is that it degrades: anywhere that has never heard
 * of it — a plain markdown viewer, the GitHub mobile app's diff view, an editor
 * preview — the same source is still a blockquote with a legible label at the
 * top of it. That is why it is a blockquote and a marker rather than a fence or
 * a directive, and it is why this runs on the tree rather than the text: by the
 * time the blockquote exists, the fallback has already been proven.
 */

/** The five GitHub defines, in the order it documents them. */
export const ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

/**
 * Drawn in the same hand as the permalink icon in `link-icon.ts` — 24 units,
 * stroked in `currentColor`, nothing filled — so an alert does not arrive
 * looking like it came from somebody else's site.
 */
const ICONS: Record<AlertType, string[]> = {
  // A letter i in a circle.
  note: ['M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z', 'M12 16v-4', 'M12 8h.01'],
  // A lamp, for the thing that is worth knowing but not worth obeying.
  tip: [
    'M9 18h6',
    'M10 22h4',
    'M15.1 14c.2-1 .6-1.7 1.4-2.5A4.6 4.6 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.8.8 1.2 1.5 1.4 2.5',
  ],
  // Speech, because this one is the author talking directly to the reader.
  important: [
    'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    'M12 7v4',
    'M12 15h.01',
  ],
  warning: [
    'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    'M12 9v4',
    'M12 17h.01',
  ],
  // An octagon: the shape of a stop sign in most of the world.
  caution: ['M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9L7.9 2z', 'M12 8v4', 'M12 16h.01'],
};

/** Matched case-insensitively, which is what GitHub's own parser does. */
const MARKER = new RegExp(`^\\[!(${ALERT_TYPES.join('|')})\\][ \\t]*(\\r?\\n|$)`, 'i');

function isElement(node: RootContent | undefined, tagName?: string): node is Element {
  return node?.type === 'element' && (!tagName || node.tagName === tagName);
}

function isText(node: RootContent | undefined): node is Text {
  return node?.type === 'text';
}

/** Whitespace between block elements, which markdown leaves lying about. */
const isBlank = (node: RootContent | undefined): boolean =>
  isText(node) && node.value.trim() === '';

function icon(type: AlertType): Element {
  return {
    type: 'element',
    tagName: 'svg',
    properties: {
      className: ['alert__icon'],
      viewBox: '0 0 24 24',
      width: '16',
      height: '16',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      ariaHidden: 'true',
      focusable: 'false',
    },
    children: ICONS[type].map((d) => ({
      type: 'element' as const,
      tagName: 'path',
      properties: { d },
      children: [],
    })),
  };
}

/**
 * The marker, and what is left of the blockquote once it is taken off.
 *
 * Two shapes are legal and GitHub renders both. `> [!NOTE]` on its own line
 * followed by a blank quoted line makes the marker a paragraph of its own, and
 * that paragraph goes. Written without the blank line the marker is the first
 * line of the body's own paragraph, and only the marker and the newline after
 * it are cut, leaving the rest of that paragraph — and any formatting inside
 * it — untouched.
 */
function takeMarker(quote: Element): AlertType | null {
  const first = quote.children.find((child) => !isBlank(child));
  if (!isElement(first, 'p')) return null;

  const opening = first.children[0];
  if (!isText(opening)) return null;

  const found = MARKER.exec(opening.value);
  if (!found) return null;
  const type = found[1].toLowerCase() as AlertType;

  const rest = opening.value.slice(found[0].length);
  if (rest === '' && first.children.length === 1) {
    // The marker was the whole paragraph: drop it, and the blank line after it.
    const index = quote.children.indexOf(first);
    let end = index + 1;
    while (isBlank(quote.children[end])) end += 1;
    quote.children.splice(index, end - index);
  } else if (rest === '') {
    first.children.shift();
  } else {
    opening.value = rest;
  }

  return type;
}

const label = (type: AlertType): string => type.charAt(0).toUpperCase() + type.slice(1);

/**
 * Rewrites those blockquotes as alerts, and leaves every other blockquote as a
 * blockquote. A quotation is still a quotation.
 */
export function rehypeAlerts() {
  return (tree: Root) => {
    const walk = (parent: Root | Element) => {
      for (const node of 'children' in parent ? parent.children : []) {
        if (!isElement(node)) continue;
        walk(node);
        if (node.tagName !== 'blockquote') continue;

        const type = takeMarker(node);
        if (!type) continue;

        node.tagName = 'div';
        node.properties = { className: ['alert', `alert--${type}`] };
        node.children.unshift({
          type: 'element',
          tagName: 'p',
          properties: { className: ['alert__label'] },
          children: [icon(type), { type: 'text', value: label(type) }],
        });
      }
    };

    walk(tree);
  };
}
