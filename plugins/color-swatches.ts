import type { Element, Root } from 'hast';

/*
 * A colour written as inline code gets a small swatch of itself before the
 * value: `#ff8800`, `rgb(0 128 255)`, `hsl(120, 60%, 40%)`. GitHub does the same
 * in issues and pull requests, and like GitHub it reads only a code span that
 * holds the value and nothing else, so a colour mentioned in a sentence or in
 * a longer snippet is left alone.
 *
 * The swatch is drawn at build time, as an empty span with the colour as its
 * background: no script, and nothing added to what a reader copies.
 */

const NUMBER = String.raw`\d+(?:\.\d+)?|\.\d+`;
const ALPHA = String.raw`(?:${NUMBER})%?`;

/** `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`. */
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** `rgb()` or `rgba()`, with commas or with spaces and a slash before the alpha. */
const RGB = new RegExp(
  String.raw`^rgba?\(\s*(${NUMBER})(%?)\s*(?:,\s*(${NUMBER})(%?)\s*,\s*(${NUMBER})(%?)\s*(?:,\s*(${ALPHA})\s*)?|\s+(${NUMBER})(%?)\s+(${NUMBER})(%?)\s*(?:\/\s*(${ALPHA})\s*)?)\)$`,
  'i',
);

/** `hsl()` or `hsla()`: a hue, with or without a unit, then two percentages. */
const HSL = new RegExp(
  String.raw`^hsla?\(\s*(-?(?:${NUMBER}))(?:deg|grad|rad|turn)?\s*(?:,\s*(${NUMBER})%\s*,\s*(${NUMBER})%\s*(?:,\s*(${ALPHA})\s*)?|\s+(${NUMBER})%\s+(${NUMBER})%\s*(?:\/\s*(${ALPHA})\s*)?)\)$`,
  'i',
);

/** An alpha within 0..1, or 0..100%. */
const alphaOk = (value: string | undefined): boolean =>
  value === undefined ||
  (value.endsWith('%') ? Number(value.slice(0, -1)) <= 100 : Number(value) <= 1);

/** A channel within 0..255, or 0..100%. */
const channelOk = (value: string, percent: string): boolean =>
  Number(value) <= (percent ? 100 : 255);

/**
 * The value as written, if it is a colour a browser draws, or undefined. Out of
 * range channels are refused rather than clamped: `rgb(300, 0, 0)` is more
 * likely a typo than a red, and a swatch would vouch for it.
 */
export function cssColor(text: string): string | undefined {
  const value = text.trim();
  if (HEX.test(value)) return value;

  const rgb = RGB.exec(value);
  if (rgb) {
    // The first channel is shared; the two syntaxes differ from the second on.
    const [, r, p, g1, q1, b1, s1, a1, g2, q2, b2, s2, a2] = rgb;
    const channels: [string, string][] =
      g1 !== undefined
        ? [
            [r, p],
            [g1, q1],
            [b1, s1],
          ]
        : [
            [r, p],
            [g2, q2],
            [b2, s2],
          ];
    return channels.every(([v, p]) => channelOk(v, p)) && alphaOk(a1 ?? a2) ? value : undefined;
  }

  const hsl = HSL.exec(value);
  if (hsl) {
    const [, , s1, l1, a1, s2, l2, a2] = hsl;
    const percents = s1 !== undefined ? [s1, l1] : [s2, l2];
    return percents.every((p) => Number(p) <= 100) && alphaOk(a1 ?? a2) ? value : undefined;
  }
  return undefined;
}

const classesOf = (node: Element): string[] => {
  const classes = node.properties?.className;
  return Array.isArray(classes) ? classes.map(String) : classes ? [String(classes)] : [];
};

export function rehypeColorSwatches() {
  return (tree: Root) => {
    const walk = (parent: Root | Element) => {
      for (const node of parent.children) {
        if (node.type !== 'element') continue;
        // A block of code is a listing, not a value; only inline code counts.
        if (node.tagName === 'pre') continue;
        if (node.tagName !== 'code') {
          walk(node);
          continue;
        }

        const [only, ...rest] = node.children;
        if (rest.length > 0 || only?.type !== 'text') continue;
        const color = cssColor(only.value);
        if (!color) continue;

        node.properties = {
          ...node.properties,
          className: [...classesOf(node), 'color-value'],
        };
        node.children = [
          {
            type: 'element',
            tagName: 'span',
            // The value has matched one of the patterns above, so it cannot
            // carry a `;` or anything else out of the declaration.
            properties: {
              className: ['color-swatch'],
              style: `--swatch: ${color}`,
              ariaHidden: 'true',
            },
            children: [],
          },
          only,
        ];
      }
    };
    walk(tree);
  };
}
