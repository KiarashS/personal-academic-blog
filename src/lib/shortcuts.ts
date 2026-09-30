export type ShortcutAction =
  'search' | 'next' | 'previous' | 'followPrev' | 'followNext' | 'blog' | 'theme' | 'help';

export interface Shortcut {
  /** As it is printed in the help dialog. */
  keys: string;
  action: ShortcutAction;
  description: string;
  /** About posts, so gone with the blog: no list to step through, no index. */
  blog?: true;
}

/** The whole set, in the order the help dialog lists them. */
export const SHORTCUTS: Shortcut[] = [
  { keys: '/', action: 'search', description: 'Search the archive', blog: true },
  { keys: 'j', action: 'next', description: 'Next post in the list', blog: true },
  { keys: 'k', action: 'previous', description: 'Previous post in the list', blog: true },
  {
    keys: '[',
    action: 'followPrev',
    description: 'Previous page, or the newer post',
    blog: true,
  },
  { keys: ']', action: 'followNext', description: 'Next page, or the older post', blog: true },
  { keys: 'b', action: 'blog', description: 'Back to the blog index', blog: true },
  { keys: 't', action: 'theme', description: 'Cycle light, dark and system theme' },
  { keys: '?', action: 'help', description: 'Show this list' },
];

/** The shortcuts a site with or without a blog answers to. */
export function shortcutsFor(blog: boolean): Shortcut[] {
  return blog ? SHORTCUTS : SHORTCUTS.filter((shortcut) => !shortcut.blog);
}

export interface KeyPress {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

/**
 * A single unmodified key press, or nothing. A shortcut that fires while a
 * browser or OS combination is held would shadow it, so any modifier bar shift
 * — which is how `?` is typed at all — takes the key back.
 */
export function actionFor(event: KeyPress, blog = true): ShortcutAction | undefined {
  if (event.ctrlKey || event.metaKey || event.altKey) return undefined;
  return shortcutsFor(blog).find((shortcut) => shortcut.keys === event.key)?.action;
}

export interface MaybeTyping {
  tagName?: string;
  isContentEditable?: boolean;
}

/** Whether the key press belongs to whatever the reader is typing into. */
export function isTyping(target: MaybeTyping | null | undefined): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes((target.tagName ?? '').toUpperCase());
}

/**
 * The next element to focus, given where focus is now. Wrapping is deliberate:
 * `j` at the end of a list of four posts is more likely to mean "start again"
 * than "do nothing", and there is nowhere else for it to go.
 */
export function step(items: readonly unknown[], current: number, by: 1 | -1): number {
  if (items.length === 0) return -1;
  if (current === -1) return by === 1 ? 0 : items.length - 1;
  return (current + by + items.length) % items.length;
}
