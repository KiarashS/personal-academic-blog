/**
 * The alert kinds and the drawings that label them.
 *
 * Here rather than in `plugins/alerts.ts` because two things need them now:
 * that plugin, which builds them into the markdown tree, and `AlertIcon`,
 * which renders the same paths as JSX for the site notice. Data in `src`,
 * consumed by the plugin, is the direction that keeps plugin code out of the
 * browser's bundle.
 */

/** The five GitHub defines, in the order it documents them. */
export const ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

/**
 * Drawn in the same hand as the permalink icon in `link-icon.ts` — 24 units,
 * stroked in `currentColor`, nothing filled — so an alert does not arrive
 * looking like it came from somebody else's site.
 */
export const ALERT_ICONS: Record<AlertType, string[]> = {
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
