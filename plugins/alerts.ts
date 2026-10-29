import type { Element, ElementContent, Root, RootContent, Text } from 'hast';
import { ALERT_ICONS, ALERT_TYPES, type AlertType } from '../src/lib/alerts';

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

/** Matched case-insensitively, which is what GitHub's own parser does. */
const MARKER = new RegExp(`^\\[!(${ALERT_TYPES.join('|')})\\][ \\t]*(\\r?\\n|$)`, 'i');

/**
 * `> [!NOTE]-` closed, `> [!NOTE]+` open: a note that folds, Obsidian's
 * syntax, which every other renderer still shows as a quotation with its
 * marker on top. The rest of the marker's line, if any, is its title.
 */
const FOLD = new RegExp(`^\\[!(${ALERT_TYPES.join('|')})\\]([+-])[ \\t]*`, 'i');

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
    children: ALERT_ICONS[type].map((d) => ({
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
interface Fold {
  type: AlertType;
  open: boolean;
  title: ElementContent[];
}

/**
 * A folding note's marker, taken off with the title the rest of its line
 * gives it, which may hold emphasis or a link, so it is taken as nodes.
 */
function takeFold(quote: Element): Fold | null {
  const first = quote.children.find((child) => !isBlank(child));
  if (!isElement(first, 'p')) return null;
  const opening = first.children[0];
  if (!isText(opening)) return null;
  const found = FOLD.exec(opening.value);
  if (!found) return null;

  opening.value = opening.value.slice(found[0].length);
  const title: ElementContent[] = [];
  while (first.children.length > 0) {
    const node = first.children[0];
    if (isText(node)) {
      const at = node.value.search(/\r?\n/);
      if (at !== -1) {
        if (at > 0) title.push({ type: 'text', value: node.value.slice(0, at) });
        node.value = node.value.slice(at).replace(/^\r?\n/, '');
        if (node.value === '') first.children.shift();
        break;
      }
    }
    title.push(node);
    first.children.shift();
  }
  if (first.children.length === 0 || first.children.every(isBlank)) {
    const index = quote.children.indexOf(first);
    let end = index + 1;
    while (isBlank(quote.children[end])) end += 1;
    quote.children.splice(index, end - index);
  }

  const trimmed = title.filter((node) => !(isText(node) && node.value.trim() === ''));
  const last = trimmed[trimmed.length - 1];
  if (isText(last)) last.value = last.value.trimEnd();
  return { type: found[1].toLowerCase() as AlertType, open: found[2] === '+', title: trimmed };
}

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

        // A folding note: its label, or its title, is what shows closed.
        const fold = takeFold(node);
        if (fold) {
          node.tagName = 'details';
          node.properties = {
            className: ['alert', `alert--${fold.type}`, 'alert--fold'],
            ...(fold.open ? { open: true } : {}),
          };
          node.children.unshift({
            type: 'element',
            tagName: 'summary',
            properties: { className: ['alert__label'] },
            children: [
              icon(fold.type),
              ...(fold.title.length > 0
                ? [
                    {
                      type: 'element' as const,
                      tagName: 'span',
                      properties: { className: ['alert__title'] },
                      children: fold.title,
                    },
                  ]
                : [{ type: 'text' as const, value: label(fold.type) }]),
            ],
          });
          continue;
        }

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
