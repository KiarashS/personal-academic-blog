import type { Element } from 'hast';

/**
 * Two links of a chain, drawn rather than set in text so it scales cleanly.
 * Shared by the two things that carry a permalink: a heading, and the caption
 * of a numbered block.
 */
export function linkIcon(className: string): Element {
  const path = (d: string): Element => ({
    type: 'element',
    tagName: 'path',
    properties: { d },
    children: [],
  });

  return {
    type: 'element',
    tagName: 'svg',
    properties: {
      className: [className],
      viewBox: '0 0 24 24',
      width: '14',
      height: '14',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      ariaHidden: 'true',
      focusable: 'false',
    },
    children: [
      path('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'),
      path('M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'),
    ],
  };
}
